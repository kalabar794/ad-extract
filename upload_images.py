#!/usr/bin/env python3
"""
Image Upload System for IMAGES001 Folder
Upload 3,173 DOJ-OGR images to database
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def upload_images(image_dir='/Users/jonathon/Downloads/IMAGES001'):
    """Upload all images from IMAGES001 folder"""
    conn = get_db()
    c = conn.cursor()
    
    image_dir = Path(image_dir)
    if not image_dir.exists():
        print(f"❌ Directory not found: {image_dir}")
        return
    
    # Get all image files
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff'}
    image_files = []
    
    for ext in image_extensions:
        image_files.extend(image_dir.glob(f'*{ext}'))
        image_files.extend(image_dir.glob(f'*{ext.upper()}'))
    
    image_files = sorted(set(image_files))
    total = len(image_files)
    
    print(f"Found {total} image files")
    print("="*70)
    
    uploaded = 0
    skipped = 0
    errors = 0
    
    for idx, filepath in enumerate(image_files, 1):
        try:
            filename = filepath.name
            
            # Check if already uploaded
            c.execute('SELECT id FROM documents WHERE filename = ?', (filename,))
            if c.fetchone():
                skipped += 1
                if idx % 100 == 0:
                    print(f"Progress: {idx}/{total} ({uploaded} uploaded, {skipped} skipped)")
                continue
            
            # Get file size
            file_size = filepath.stat().st_size
            
            # Determine file type
            ext = filepath.suffix.upper()[1:]
            if ext in ['JPG', 'JPEG']:
                file_type = 'image/jpeg'
            elif ext == 'TIF' or ext == 'TIFF':
                file_type = 'image/tiff'
            elif ext == 'PNG':
                file_type = 'image/png'
            elif ext == 'GIF':
                file_type = 'image/gif'
            else:
                file_type = 'image/unknown'
            
            # Create content with placeholder for OCR
            content = f"[IMAGE DOCUMENT: {filename}]\n"
            content += f"File type: {ext} image\n"
            content += f"Source: DOJ Office of Government Relations\n"
            content += f"File size: {file_size:,} bytes\n"
            content += f"Full path: {str(filepath)}\n"
            content += f"Date added: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            content += "\n[OCR text extraction will be performed in analysis phase]\n"
            content += "\n"
            content += "This document is part of the Department of Justice Office of Government Relations "
            content += "release related to the Jeffrey Epstein investigation. "
            content += "The image contains scanned pages that require OCR processing to extract text."
            
            # Insert into database using correct schema
            c.execute('''
                INSERT INTO documents (filename, filepath, file_type, content, uploaded_date)
                VALUES (?, ?, ?, ?, ?)
            ''', (filename, str(filepath), file_type, content, datetime.now().isoformat()))
            
            uploaded += 1
            
            if idx % 100 == 0:
                conn.commit()
                print(f"Progress: {idx}/{total} ({uploaded} uploaded, {skipped} skipped)")
        
        except Exception as e:
            errors += 1
            print(f"❌ Error processing {filepath.name}: {str(e)}")
    
    conn.commit()
    
    print("\n" + "="*70)
    print("IMAGE UPLOAD COMPLETE")
    print("="*70)
    print(f"✅ Uploaded: {uploaded} images")
    print(f"⏭️  Skipped: {skipped} (already in database)")
    print(f"❌ Errors: {errors}")
    
    # Get updated stats
    c.execute('SELECT COUNT(*) FROM documents')
    total_docs = c.fetchone()[0]
    
    c.execute('SELECT COUNT(*) FROM documents WHERE filename LIKE "DOJ-OGR-%"')
    image_docs = c.fetchone()[0]
    
    print(f"\n📈 Database now contains:")
    print(f"   - Total documents: {total_docs:,}")
    print(f"   - DOJ-OGR images: {image_docs:,}")
    
    conn.close()
    
    return uploaded, skipped, errors

if __name__ == '__main__':
    print("="*70)
    print("EPSTEIN DOCUMENT INVESTIGATOR - IMAGE UPLOAD")
    print("="*70)
    print("\nUploading 3,173 DOJ-OGR images from IMAGES001 folder")
    print()
    
    upload_images()
    
    print("\n✅ Upload complete!")
    print("📝 Next steps:")
    print("   1. OCR text extraction from images")
    print("   2. Entity extraction and analysis")
    print("   3. Integration with AI Journalist Assistant")
