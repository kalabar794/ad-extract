"""
Visual Intelligence - AI-Powered Image Analysis
Automatically analyze photos, detect people, locations, and suspicious imagery
"""

import sqlite3
import json
import os
import hashlib
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from pathlib import Path
from collections import Counter
import numpy as np

# Image processing
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import cv2

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_visual_intelligence_tables():
    """Initialize database tables for visual intelligence"""
    conn = get_db()
    c = conn.cursor()

    # Image analysis results table
    c.execute('''CREATE TABLE IF NOT EXISTS image_analysis
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  doc_id INTEGER UNIQUE NOT NULL,
                  image_hash TEXT,
                  width INTEGER,
                  height INTEGER,
                  file_size INTEGER,
                  faces_detected INTEGER DEFAULT 0,
                  face_locations TEXT,
                  objects_detected TEXT,
                  scene_type TEXT,
                  exif_data TEXT,
                  location_lat REAL,
                  location_lon REAL,
                  date_taken TEXT,
                  camera_make TEXT,
                  camera_model TEXT,
                  has_people BOOLEAN DEFAULT 0,
                  has_minors_flag BOOLEAN DEFAULT 0,
                  suspicious_score REAL DEFAULT 0.0,
                  analysis_notes TEXT,
                  created_date TEXT NOT NULL,
                  FOREIGN KEY (doc_id) REFERENCES documents(id))''')

    # Face detections table (multiple faces per image)
    c.execute('''CREATE TABLE IF NOT EXISTS face_detections
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  analysis_id INTEGER NOT NULL,
                  doc_id INTEGER NOT NULL,
                  face_number INTEGER,
                  x INTEGER,
                  y INTEGER,
                  width INTEGER,
                  height INTEGER,
                  confidence REAL,
                  estimated_age_range TEXT,
                  matched_entity_id INTEGER,
                  matched_entity_name TEXT,
                  notes TEXT,
                  FOREIGN KEY (analysis_id) REFERENCES image_analysis(id),
                  FOREIGN KEY (doc_id) REFERENCES documents(id))''')

    # Image similarity index (for finding duplicates/related images)
    c.execute('''CREATE TABLE IF NOT EXISTS image_similarity
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  image1_id INTEGER NOT NULL,
                  image2_id INTEGER NOT NULL,
                  similarity_score REAL NOT NULL,
                  match_type TEXT,
                  created_date TEXT NOT NULL,
                  UNIQUE(image1_id, image2_id),
                  FOREIGN KEY (image1_id) REFERENCES documents(id),
                  FOREIGN KEY (image2_id) REFERENCES documents(id))''')

    # Create indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_image_analysis_doc ON image_analysis(doc_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_face_detections_doc ON face_detections(doc_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_image_similarity ON image_similarity(image1_id, image2_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_suspicious_images ON image_analysis(suspicious_score DESC)')

    conn.commit()
    conn.close()

def compute_image_hash(image_path: str) -> str:
    """Compute perceptual hash for image deduplication"""
    try:
        img = Image.open(image_path)
        # Resize to 8x8 and convert to grayscale
        img = img.resize((8, 8), Image.Resampling.LANCZOS).convert('L')
        # Get pixel data
        pixels = list(img.getdata())
        # Compute average
        avg = sum(pixels) / len(pixels)
        # Create hash based on whether pixel is above/below average
        hash_bits = ''.join('1' if pixel > avg else '0' for pixel in pixels)
        # Convert to hex
        return hex(int(hash_bits, 2))[2:].zfill(16)
    except Exception as e:
        print(f"Error computing hash: {e}")
        return ""

def extract_exif_data(image_path: str) -> Dict:
    """Extract EXIF metadata from image"""
    try:
        img = Image.open(image_path)
        exif_data = img._getexif()

        if not exif_data:
            return {}

        decoded = {}
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)

            # Handle GPS data specially
            if tag == 'GPSInfo':
                gps_data = {}
                for gps_tag_id in value:
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_data[gps_tag] = value[gps_tag_id]
                decoded[tag] = gps_data
            else:
                # Convert bytes to string
                if isinstance(value, bytes):
                    try:
                        value = value.decode('utf-8', errors='ignore')
                    except:
                        value = str(value)
                decoded[tag] = str(value) if not isinstance(value, (str, int, float)) else value

        return decoded
    except Exception as e:
        print(f"Error extracting EXIF: {e}")
        return {}

def get_gps_coordinates(exif_data: Dict) -> Optional[Tuple[float, float]]:
    """Extract GPS coordinates from EXIF data"""
    try:
        gps_info = exif_data.get('GPSInfo', {})

        if not gps_info:
            return None

        def convert_to_degrees(value):
            """Convert GPS coordinates to degrees"""
            d, m, s = value
            return d + (m / 60.0) + (s / 3600.0)

        lat = gps_info.get('GPSLatitude')
        lat_ref = gps_info.get('GPSLatitudeRef')
        lon = gps_info.get('GPSLongitude')
        lon_ref = gps_info.get('GPSLongitudeRef')

        if lat and lon and lat_ref and lon_ref:
            lat = convert_to_degrees(lat)
            lon = convert_to_degrees(lon)

            if lat_ref == 'S':
                lat = -lat
            if lon_ref == 'W':
                lon = -lon

            return (lat, lon)
    except Exception as e:
        print(f"Error parsing GPS: {e}")
        return None

def detect_faces(image_path: str) -> List[Dict]:
    """Detect faces in image using OpenCV Haar Cascades"""
    try:
        # Load the cascade
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)

        # Read image
        img = cv2.imread(image_path)
        if img is None:
            return []

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        # Convert to list of dicts
        face_list = []
        for i, (x, y, w, h) in enumerate(faces):
            face_list.append({
                'face_number': i + 1,
                'x': int(x),
                'y': int(y),
                'width': int(w),
                'height': int(h),
                'confidence': 0.8  # Haar cascades don't provide confidence
            })

        return face_list
    except Exception as e:
        print(f"Error detecting faces: {e}")
        return []

def detect_scene_type(image_path: str) -> str:
    """Detect basic scene type from image characteristics"""
    try:
        img = Image.open(image_path)

        # Get dominant colors
        img_small = img.resize((50, 50))
        pixels = list(img_small.getdata())

        # Calculate average RGB
        avg_r = sum(p[0] if isinstance(p, tuple) else p for p in pixels) / len(pixels)
        avg_g = sum(p[1] if isinstance(p, tuple) else p for p in pixels) / len(pixels)
        avg_b = sum(p[2] if isinstance(p, tuple) else p for p in pixels) / len(pixels)

        # Basic scene detection based on colors
        if avg_b > avg_r and avg_b > avg_g and avg_b > 120:
            return "outdoor/sky"
        elif avg_g > avg_r and avg_g > avg_b:
            return "outdoor/vegetation"
        elif avg_r < 100 and avg_g < 100 and avg_b < 100:
            return "indoor/dark"
        elif avg_r > 200 and avg_g > 200 and avg_b > 200:
            return "indoor/bright"
        elif abs(avg_r - avg_g) < 20 and abs(avg_g - avg_b) < 20:
            return "document/scan"
        else:
            return "general"
    except Exception as e:
        print(f"Error detecting scene: {e}")
        return "unknown"

def calculate_suspicious_score(analysis_data: Dict, faces: List[Dict]) -> float:
    """Calculate suspicion score based on various factors"""
    score = 0.0

    # Multiple people in photo
    if len(faces) >= 2:
        score += 0.2
    if len(faces) >= 4:
        score += 0.2

    # Location data present (shows possible travel)
    if analysis_data.get('location_lat'):
        score += 0.1

    # Private/yacht/island indicators (would need object detection)
    scene = analysis_data.get('scene_type', '')
    if 'outdoor' in scene:
        score += 0.1

    # No metadata (potentially scrubbed)
    if not analysis_data.get('exif_data'):
        score += 0.2

    # Old date (relevant time period)
    date_taken = analysis_data.get('date_taken', '')
    if date_taken and ('199' in date_taken or '200' in date_taken or '201' in date_taken):
        score += 0.2

    return min(score, 1.0)

def analyze_image(doc_id: int, image_path: str) -> Dict:
    """Comprehensive analysis of a single image"""
    try:
        # Check if file exists
        if not os.path.exists(image_path):
            return {'success': False, 'error': 'File not found'}

        # Get basic image info
        img = Image.open(image_path)
        width, height = img.size
        file_size = os.path.getsize(image_path)

        # Compute hash
        img_hash = compute_image_hash(image_path)

        # Extract EXIF
        exif_data = extract_exif_data(image_path)

        # Get GPS coordinates
        gps_coords = get_gps_coordinates(exif_data)

        # Extract camera info
        camera_make = exif_data.get('Make', '')
        camera_model = exif_data.get('Model', '')
        date_taken = exif_data.get('DateTime', '')

        # Detect faces
        faces = detect_faces(image_path)

        # Detect scene
        scene_type = detect_scene_type(image_path)

        # Calculate suspicious score
        analysis_data = {
            'exif_data': exif_data,
            'location_lat': gps_coords[0] if gps_coords else None,
            'location_lon': gps_coords[1] if gps_coords else None,
            'date_taken': date_taken,
            'scene_type': scene_type
        }
        suspicious_score = calculate_suspicious_score(analysis_data, faces)

        # Save to database
        conn = get_db()
        c = conn.cursor()

        # Check if analysis already exists
        c.execute('SELECT id FROM image_analysis WHERE doc_id = ?', (doc_id,))
        existing = c.fetchone()

        if existing:
            # Update existing
            c.execute('''UPDATE image_analysis
                         SET image_hash = ?, width = ?, height = ?, file_size = ?,
                             faces_detected = ?, face_locations = ?, scene_type = ?,
                             exif_data = ?, location_lat = ?, location_lon = ?,
                             date_taken = ?, camera_make = ?, camera_model = ?,
                             has_people = ?, suspicious_score = ?, created_date = ?
                         WHERE doc_id = ?''',
                      (img_hash, width, height, file_size, len(faces),
                       json.dumps(faces), scene_type, json.dumps(exif_data),
                       gps_coords[0] if gps_coords else None,
                       gps_coords[1] if gps_coords else None,
                       date_taken, camera_make, camera_model,
                       1 if len(faces) > 0 else 0, suspicious_score,
                       datetime.now().isoformat(), doc_id))
            analysis_id = existing['id']
        else:
            # Insert new
            c.execute('''INSERT INTO image_analysis
                         (doc_id, image_hash, width, height, file_size,
                          faces_detected, face_locations, scene_type, exif_data,
                          location_lat, location_lon, date_taken, camera_make,
                          camera_model, has_people, suspicious_score, created_date)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (doc_id, img_hash, width, height, file_size, len(faces),
                       json.dumps(faces), scene_type, json.dumps(exif_data),
                       gps_coords[0] if gps_coords else None,
                       gps_coords[1] if gps_coords else None,
                       date_taken, camera_make, camera_model,
                       1 if len(faces) > 0 else 0, suspicious_score,
                       datetime.now().isoformat()))
            analysis_id = c.lastrowid

        # Save individual face detections
        c.execute('DELETE FROM face_detections WHERE analysis_id = ?', (analysis_id,))
        for face in faces:
            c.execute('''INSERT INTO face_detections
                         (analysis_id, doc_id, face_number, x, y, width, height, confidence)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                      (analysis_id, doc_id, face['face_number'], face['x'], face['y'],
                       face['width'], face['height'], face['confidence']))

        conn.commit()
        conn.close()

        return {
            'success': True,
            'analysis_id': analysis_id,
            'faces_detected': len(faces),
            'has_location': gps_coords is not None,
            'suspicious_score': suspicious_score,
            'scene_type': scene_type
        }

    except Exception as e:
        print(f"Error analyzing image {doc_id}: {e}")
        return {'success': False, 'error': str(e)}

def analyze_all_images(batch_size: int = 100) -> Dict:
    """Analyze all image documents in database"""
    conn = get_db()
    c = conn.cursor()

    # Get all image documents
    c.execute('''SELECT d.id, d.filename, d.filepath
                 FROM documents d
                 LEFT JOIN image_analysis ia ON d.id = ia.doc_id
                 WHERE d.file_type LIKE 'image/%'
                 AND ia.id IS NULL
                 ORDER BY d.id''')

    images_to_process = c.fetchall()
    total = len(images_to_process)
    conn.close()

    if total == 0:
        return {'success': True, 'message': 'All images already analyzed', 'processed': 0}

    print(f"Analyzing {total} images...")

    processed = 0
    failed = 0
    total_faces = 0
    suspicious_count = 0

    for img in images_to_process:
        doc_id = img['id']
        filepath = img['filepath']

        if not filepath or not os.path.exists(filepath):
            # Try uploads/images directory
            filepath = os.path.join('uploads/images', img['filename'])

        if os.path.exists(filepath):
            result = analyze_image(doc_id, filepath)

            if result['success']:
                processed += 1
                total_faces += result['faces_detected']
                if result['suspicious_score'] >= 0.5:
                    suspicious_count += 1
            else:
                failed += 1
        else:
            failed += 1
            print(f"  File not found: {filepath}")

        if (processed + failed) % 10 == 0:
            print(f"  Progress: {processed + failed}/{total}")

    return {
        'success': True,
        'processed': processed,
        'failed': failed,
        'total': total,
        'total_faces': total_faces,
        'suspicious_images': suspicious_count
    }

def find_similar_images(min_similarity: float = 0.9) -> Dict:
    """Find similar or duplicate images using perceptual hashing"""
    conn = get_db()
    c = conn.cursor()

    # Get all image hashes
    c.execute('SELECT doc_id, image_hash FROM image_analysis WHERE image_hash IS NOT NULL')
    images = c.fetchall()

    pairs_found = 0

    # Compare each pair
    for i, img1 in enumerate(images):
        for img2 in images[i+1:]:
            # Hamming distance between hashes
            hash1 = img1['image_hash']
            hash2 = img2['image_hash']

            if len(hash1) == len(hash2):
                # Calculate similarity (1.0 = identical)
                differences = sum(c1 != c2 for c1, c2 in zip(hash1, hash2))
                similarity = 1.0 - (differences / len(hash1))

                if similarity >= min_similarity:
                    # Save similarity
                    c.execute('''INSERT OR REPLACE INTO image_similarity
                                 (image1_id, image2_id, similarity_score, match_type, created_date)
                                 VALUES (?, ?, ?, ?, ?)''',
                              (img1['doc_id'], img2['doc_id'], similarity,
                               'exact' if similarity >= 0.99 else 'similar',
                               datetime.now().isoformat()))
                    pairs_found += 1

    conn.commit()
    conn.close()

    return {
        'success': True,
        'pairs_found': pairs_found,
        'images_compared': len(images)
    }

def get_image_analysis(doc_id: int) -> Optional[Dict]:
    """Get analysis results for a specific image"""
    conn = get_db()
    c = conn.cursor()

    c.execute('SELECT * FROM image_analysis WHERE doc_id = ?', (doc_id,))
    analysis = c.fetchone()

    if not analysis:
        conn.close()
        return None

    result = dict(analysis)

    # Parse JSON fields
    if result['face_locations']:
        result['face_locations'] = json.loads(result['face_locations'])
    if result['exif_data']:
        result['exif_data'] = json.loads(result['exif_data'])

    # Get face detections
    c.execute('SELECT * FROM face_detections WHERE doc_id = ? ORDER BY face_number', (doc_id,))
    result['faces'] = [dict(row) for row in c.fetchall()]

    # Get similar images
    c.execute('''SELECT image2_id as similar_doc_id, similarity_score, match_type
                 FROM image_similarity
                 WHERE image1_id = ?
                 ORDER BY similarity_score DESC
                 LIMIT 10''', (doc_id,))
    result['similar_images'] = [dict(row) for row in c.fetchall()]

    conn.close()
    return result

def get_all_analyzed_images(filters: Dict = None) -> List[Dict]:
    """Get all analyzed images with optional filters"""
    conn = get_db()
    c = conn.cursor()

    query = '''SELECT ia.*, d.filename, d.uploaded_date
               FROM image_analysis ia
               JOIN documents d ON ia.doc_id = d.id
               WHERE 1=1'''
    params = []

    if filters:
        if filters.get('has_faces'):
            query += ' AND ia.faces_detected > 0'
        if filters.get('has_location'):
            query += ' AND ia.location_lat IS NOT NULL'
        if filters.get('min_suspicious_score'):
            query += ' AND ia.suspicious_score >= ?'
            params.append(filters['min_suspicious_score'])
        if filters.get('scene_type'):
            query += ' AND ia.scene_type = ?'
            params.append(filters['scene_type'])

    query += ' ORDER BY ia.suspicious_score DESC, ia.faces_detected DESC'

    if filters and filters.get('limit'):
        query += ' LIMIT ?'
        params.append(filters['limit'])

    c.execute(query, params)

    results = []
    for row in c.fetchall():
        result = dict(row)
        if result['face_locations']:
            result['face_locations'] = json.loads(result['face_locations'])
        results.append(result)

    conn.close()
    return results

def get_visual_intelligence_stats() -> Dict:
    """Get statistics about visual intelligence analysis"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    # Total images analyzed
    c.execute('SELECT COUNT(*) as total FROM image_analysis')
    stats['total_analyzed'] = c.fetchone()['total']

    # Total images in database
    c.execute('SELECT COUNT(*) as total FROM documents WHERE file_type LIKE "image/%"')
    stats['total_images'] = c.fetchone()['total']

    # Coverage percentage
    if stats['total_images'] > 0:
        stats['coverage_percentage'] = int((stats['total_analyzed'] / stats['total_images']) * 100)
    else:
        stats['coverage_percentage'] = 0

    # Images with faces
    c.execute('SELECT COUNT(*) as count FROM image_analysis WHERE faces_detected > 0')
    stats['images_with_faces'] = c.fetchone()['count']

    # Total faces detected
    c.execute('SELECT SUM(faces_detected) as total FROM image_analysis')
    stats['total_faces'] = c.fetchone()['total'] or 0

    # Images with location data
    c.execute('SELECT COUNT(*) as count FROM image_analysis WHERE location_lat IS NOT NULL')
    stats['images_with_location'] = c.fetchone()['count']

    # Suspicious images
    c.execute('SELECT COUNT(*) as count FROM image_analysis WHERE suspicious_score >= 0.5')
    stats['suspicious_images'] = c.fetchone()['count']

    # High priority (faces + suspicious)
    c.execute('SELECT COUNT(*) as count FROM image_analysis WHERE faces_detected > 0 AND suspicious_score >= 0.5')
    stats['high_priority_images'] = c.fetchone()['count']

    # Scene type breakdown
    c.execute('''SELECT scene_type, COUNT(*) as count
                 FROM image_analysis
                 GROUP BY scene_type''')
    stats['by_scene_type'] = {row['scene_type']: row['count'] for row in c.fetchall()}

    # Camera makes (top 5)
    c.execute('''SELECT camera_make, COUNT(*) as count
                 FROM image_analysis
                 WHERE camera_make IS NOT NULL AND camera_make != ''
                 GROUP BY camera_make
                 ORDER BY count DESC
                 LIMIT 5''')
    stats['top_cameras'] = [{'make': row['camera_make'], 'count': row['count']} for row in c.fetchall()]

    # Similar image pairs
    c.execute('SELECT COUNT(*) as count FROM image_similarity')
    stats['similar_pairs'] = c.fetchone()['count']

    conn.close()
    return stats

if __name__ == '__main__':
    print("Initializing Visual Intelligence System...")
    init_visual_intelligence_tables()
    print("✓ Tables initialized")

    print("\nAnalyzing all images...")
    result = analyze_all_images()

    if result['success']:
        print(f"✓ Processed: {result['processed']}")
        print(f"✗ Failed: {result['failed']}")
        print(f"  Total faces detected: {result['total_faces']}")
        print(f"  Suspicious images: {result['suspicious_images']}")

        print("\nFinding similar images...")
        sim_result = find_similar_images()
        print(f"✓ Found {sim_result['pairs_found']} similar image pairs")

        # Show stats
        print("\n" + "="*60)
        stats = get_visual_intelligence_stats()
        print(f"Images analyzed: {stats['total_analyzed']}/{stats['total_images']} ({stats['coverage_percentage']}%)")
        print(f"Images with faces: {stats['images_with_faces']}")
        print(f"Total faces detected: {stats['total_faces']}")
        print(f"Images with GPS data: {stats['images_with_location']}")
        print(f"Suspicious images: {stats['suspicious_images']}")
        print(f"High priority: {stats['high_priority_images']}")
        print(f"\nScene types: {stats['by_scene_type']}")
