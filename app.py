from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
import sqlite3
import os
from datetime import datetime
from werkzeug.utils import secure_filename
import re
from pathlib import Path
from pypdf import PdfReader
from mcp_integrations import db_mcp, memory_mcp, filesystem_mcp, get_entities, query_database

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024 * 2  # 2 GB limit for local use
app.config['MAX_FORM_MEMORY_SIZE'] = 1024 * 1024 * 1024 * 2  # 2 GB for form data
app.config['MAX_FORM_PARTS'] = 10000  # Allow many form parts

ALLOWED_EXTENSIONS = {'txt', 'jpg', 'jpeg', 'pdf'}

# Ensure upload directories exist
os.makedirs('uploads/txt', exist_ok=True)
os.makedirs('uploads/images', exist_ok=True)

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    # Documents table
    c.execute('''CREATE TABLE IF NOT EXISTS documents
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  filename TEXT NOT NULL,
                  filepath TEXT NOT NULL,
                  file_type TEXT NOT NULL,
                  content TEXT,
                  uploaded_date TEXT NOT NULL,
                  metadata TEXT)''')

    # Entities table
    c.execute('''CREATE TABLE IF NOT EXISTS entities
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE NOT NULL,
                  entity_type TEXT NOT NULL,
                  mention_count INTEGER DEFAULT 1)''')

    # Entity mentions table
    c.execute('''CREATE TABLE IF NOT EXISTS entity_mentions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  doc_id INTEGER NOT NULL,
                  entity_id INTEGER NOT NULL,
                  context TEXT,
                  FOREIGN KEY (doc_id) REFERENCES documents(id),
                  FOREIGN KEY (entity_id) REFERENCES entities(id))''')

    # Full-text search
    c.execute('''CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                  doc_id UNINDEXED,
                  filename,
                  content)''')

    conn.commit()
    conn.close()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_entities(text):
    """Simple entity extraction using regex patterns"""
    entities = {
        'persons': set(),
        'locations': set(),
        'dates': set()
    }

    # Common names (you can expand this list)
    common_names = [
        'Jeffrey Epstein', 'Epstein', 'Ghislaine Maxwell', 'Maxwell',
        'Virginia Giuffre', 'Prince Andrew', 'Bill Clinton', 'Donald Trump'
    ]

    # Extract person names
    for name in common_names:
        if re.search(r'\b' + re.escape(name) + r'\b', text, re.IGNORECASE):
            entities['persons'].add(name)

    # Extract dates (simple patterns)
    date_patterns = [
        r'\b\d{1,2}/\d{1,2}/\d{2,4}\b',  # MM/DD/YYYY
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b',  # Month DD, YYYY
        r'\b\d{4}-\d{2}-\d{2}\b'  # YYYY-MM-DD
    ]
    for pattern in date_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        entities['dates'].update(matches)

    # Extract locations (common properties)
    locations = [
        'Little St. James', 'Palm Beach', 'Manhattan', 'New Mexico',
        'Paris', 'New York', 'Florida', 'Virgin Islands'
    ]
    for location in locations:
        if re.search(r'\b' + re.escape(location) + r'\b', text, re.IGNORECASE):
            entities['locations'].add(location)

    return entities

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large'}), 413

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        print(f"Upload request received. request.files keys: {list(request.files.keys())}")

        if 'files' not in request.files:
            print(f"ERROR: 'files' not in request.files. Available keys: {list(request.files.keys())}")
            return jsonify({'error': 'No files provided'}), 400

        files = request.files.getlist('files')
        print(f"Found {len(files)} files to upload")
        uploaded_files = []

        conn = get_db()
        c = conn.cursor()

        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_ext = filename.rsplit('.', 1)[1].lower()

                # Determine file type and save location
                if file_ext == 'txt':
                    file_type = 'txt'
                    save_path = os.path.join('uploads/txt', filename)
                elif file_ext == 'pdf':
                    file_type = 'txt'
                    save_path = os.path.join('uploads/txt', filename)
                else:
                    file_type = 'image'
                    save_path = os.path.join('uploads/images', filename)

                file.save(save_path)

                # Read content for text files and PDFs
                content = ''
                if file_ext == 'txt':
                    with open(save_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                elif file_ext == 'pdf':
                    try:
                        reader = PdfReader(save_path)
                        content = ''
                        for page in reader.pages:
                            content += page.extract_text() + '\n'
                    except Exception as e:
                        content = f'[PDF extraction failed: {e}]'

                # Insert into database
                uploaded_date = datetime.now().isoformat()
                c.execute('''INSERT INTO documents (filename, filepath, file_type, content, uploaded_date)
                            VALUES (?, ?, ?, ?, ?)''',
                         (filename, save_path, file_type, content, uploaded_date))
                doc_id = c.lastrowid

                # Add to full-text search
                if file_type == 'txt':
                    c.execute('INSERT INTO documents_fts (doc_id, filename, content) VALUES (?, ?, ?)',
                             (doc_id, filename, content))

                    # Extract entities
                    entities = extract_entities(content)

                    # Store entities
                    for entity_type, entity_names in entities.items():
                        for name in entity_names:
                            # Insert or update entity
                            c.execute('''INSERT INTO entities (name, entity_type, mention_count)
                                        VALUES (?, ?, 1)
                                        ON CONFLICT(name, entity_type) DO UPDATE SET
                                        mention_count = mention_count + 1''',
                                     (name, entity_type[:-1]))  # Remove 's' from type
                            entity_id = c.lastrowid

                            # Get entity_id if it already existed
                            if entity_id == 0:
                                c.execute('SELECT id FROM entities WHERE name = ?', (name,))
                                entity_id = c.fetchone()[0]

                            # Create mention
                            context = content[:200] if len(content) > 200 else content
                            c.execute('''INSERT INTO entity_mentions (doc_id, entity_id, context)
                                        VALUES (?, ?, ?)''',
                                     (doc_id, entity_id, context))

                uploaded_files.append({
                    'id': doc_id,
                    'filename': filename,
                    'type': file_type
                })

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'files': uploaded_files
        })

    except Exception as e:
        print(f"ERROR during upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'results': []})

    conn = get_db()
    c = conn.cursor()

    # Search using FTS5
    c.execute('''SELECT d.id, d.filename, d.file_type, d.uploaded_date,
                        snippet(documents_fts, 2, '<mark>', '</mark>', '...', 64) as snippet
                 FROM documents_fts fts
                 JOIN documents d ON fts.doc_id = d.id
                 WHERE documents_fts MATCH ?
                 ORDER BY rank''', (query,))

    results = []
    for row in c.fetchall():
        results.append({
            'id': row['id'],
            'filename': row['filename'],
            'type': row['file_type'],
            'uploaded_date': row['uploaded_date'],
            'snippet': row['snippet']
        })

    conn.close()
    return jsonify({'results': results})

@app.route('/documents', methods=['GET'])
def get_documents():
    conn = get_db()
    c = conn.cursor()

    file_type = request.args.get('type', None)

    if file_type:
        # Use LIKE for image types to match image/jpeg, image/tiff, etc.
        if file_type == 'image':
            c.execute('''SELECT id, filename, file_type, uploaded_date
                        FROM documents WHERE file_type LIKE 'image/%'
                        ORDER BY uploaded_date DESC LIMIT 100''')
        else:
            c.execute('''SELECT id, filename, file_type, uploaded_date
                        FROM documents WHERE file_type = ?
                        ORDER BY uploaded_date DESC''', (file_type,))
    else:
        c.execute('''SELECT id, filename, file_type, uploaded_date
                    FROM documents ORDER BY uploaded_date DESC''')

    documents = []
    for row in c.fetchall():
        documents.append({
            'id': row['id'],
            'filename': row['filename'],
            'type': row['file_type'],
            'uploaded_date': row['uploaded_date']
        })

    conn.close()
    return jsonify({'documents': documents})

@app.route('/documents/<int:doc_id>', methods=['GET'])
def get_document(doc_id):
    conn = get_db()
    c = conn.cursor()

    c.execute('SELECT * FROM documents WHERE id = ?', (doc_id,))
    row = c.fetchone()

    if not row:
        return jsonify({'error': 'Document not found'}), 404

    # If it's an image and accept header wants an image, serve the file
    if row['file_type'] and row['file_type'].startswith('image/'):
        accept = request.headers.get('Accept', '')
        # Check if browser is requesting image (img tag) vs JSON (fetch with accept: application/json)
        if 'application/json' not in accept or 'image' in accept:
            # Serve the actual image file
            filepath = row['filepath']
            if os.path.exists(filepath):
                return send_file(filepath, mimetype=row['file_type'])

    # Otherwise return JSON document info
    document = {
        'id': row['id'],
        'filename': row['filename'],
        'type': row['file_type'],
        'content': row['content'],
        'uploaded_date': row['uploaded_date'],
        'filepath': row['filepath']
    }

    # Get entities mentioned in this document
    c.execute('''SELECT DISTINCT e.id, e.name, e.entity_type
                 FROM entities e
                 JOIN entity_mentions em ON e.id = em.entity_id
                 WHERE em.doc_id = ?''', (doc_id,))

    entities = []
    for entity_row in c.fetchall():
        entities.append({
            'id': entity_row['id'],
            'name': entity_row['name'],
            'type': entity_row['entity_type']
        })

    document['entities'] = entities

    conn.close()
    return jsonify(document)

@app.route('/entities', methods=['GET'])
def get_entities():
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT id, name, entity_type, mention_count
                 FROM entities
                 ORDER BY mention_count DESC''')

    entities = []
    for row in c.fetchall():
        entities.append({
            'id': row['id'],
            'name': row['name'],
            'type': row['entity_type'],
            'mentions': row['mention_count']
        })

    conn.close()
    return jsonify({'entities': entities})

@app.route('/network', methods=['GET'])
def get_network():
    """Generate network graph data - optimized for top entities"""
    conn = get_db()
    c = conn.cursor()

    # Get top 50 most mentioned person entities only (instead of all 38k+)
    limit = int(request.args.get('limit', 50))
    c.execute('''SELECT id, name, mention_count
                 FROM entities
                 WHERE entity_type = 'person'
                 ORDER BY mention_count DESC
                 LIMIT ?''', (limit,))
    persons = {row['id']: {'name': row['name'], 'count': row['mention_count']}
               for row in c.fetchall()}

    # Build nodes
    nodes = [{'id': f'entity_{eid}', 'label': data['name'], 'type': 'person',
              'value': data['count']}
             for eid, data in persons.items()]

    # Build edges with single optimized query
    person_ids = list(persons.keys())
    placeholders = ','.join('?' * len(person_ids))

    c.execute(f'''SELECT em1.entity_id as entity1, em2.entity_id as entity2,
                         COUNT(DISTINCT em1.doc_id) as count
                  FROM entity_mentions em1
                  JOIN entity_mentions em2 ON em1.doc_id = em2.doc_id
                  WHERE em1.entity_id IN ({placeholders})
                    AND em2.entity_id IN ({placeholders})
                    AND em1.entity_id < em2.entity_id
                  GROUP BY em1.entity_id, em2.entity_id
                  HAVING count > 0''',
              person_ids + person_ids)

    edges = []
    for row in c.fetchall():
        edges.append({
            'from': f'entity_{row["entity1"]}',
            'to': f'entity_{row["entity2"]}',
            'value': row['count'],
            'title': f'{row["count"]} document(s)'
        })

    conn.close()
    return jsonify({'nodes': nodes, 'edges': edges, 'limited_to': limit})

@app.route('/timeline', methods=['GET'])
def get_timeline():
    """Generate timeline data from extracted events"""
    conn = get_db()
    c = conn.cursor()

    # Check if events table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
    if not c.fetchone():
        # Fall back to old date-based timeline
        c.execute('''SELECT e.name as date, d.id as doc_id, d.filename, em.context
                     FROM entities e
                     JOIN entity_mentions em ON e.id = em.entity_id
                     JOIN documents d ON em.doc_id = d.id
                     WHERE e.entity_type = 'date'
                     AND e.name NOT LIKE "'%"
                     AND LENGTH(e.name) > 3
                     AND em.context IS NOT NULL
                     AND em.context != ''
                     ORDER BY e.name''')

        events = []
        for row in c.fetchall():
            events.append({
                'date': row['date'],
                'doc_id': row['doc_id'],
                'filename': row['filename'],
                'context': row['context']
            })
        conn.close()
        return jsonify({'events': events, 'message': 'Using legacy date timeline. Run extract_events_timeline.py for better results.'})

    # Get real events from events table
    event_type = request.args.get('type')
    min_severity = int(request.args.get('min_severity', 0))

    query = '''SELECT event_date, event_type, event_description, people_involved,
                      locations, doc_id, source_filename, severity
               FROM events
               WHERE 1=1'''
    params = []

    if event_type:
        query += ' AND event_type = ?'
        params.append(event_type)

    if min_severity > 0:
        query += ' AND severity >= ?'
        params.append(min_severity)

    query += ' ORDER BY event_date DESC, severity DESC'

    c.execute(query, params)

    events = []
    for row in c.fetchall():
        events.append({
            'date': row['event_date'],
            'type': row['event_type'],
            'description': row['event_description'],
            'people': row['people_involved'],
            'locations': row['locations'],
            'doc_id': row['doc_id'],
            'filename': row['source_filename'],
            'severity': row['severity']
        })

    conn.close()
    return jsonify({'events': events, 'count': len(events)})

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)

@app.route('/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    c = conn.cursor()

    c.execute('SELECT COUNT(*) as count FROM documents WHERE file_type = "txt"')
    txt_count = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM documents WHERE file_type = "image"')
    img_count = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM entities')
    entity_count = c.fetchone()['count']

    conn.close()

    return jsonify({
        'text_documents': txt_count,
        'images': img_count,
        'entities': entity_count
    })

# ============================================================================
# ADVANCED INVESTIGATIVE FEATURES
# ============================================================================

from advanced_features import (
    advanced_search, get_kwic, add_tag, remove_tag, get_document_tags,
    add_annotation, get_annotations, calculate_cooccurrences,
    get_cooccurrence_matrix, detect_anomalies, get_anomalies,
    export_search_results
)
from geocoding import get_coordinates

@app.route('/api/advanced-search', methods=['POST'])
def api_advanced_search():
    """Advanced search with Boolean operators and filters"""
    data = request.json
    query = data.get('query', '')
    filters = data.get('filters', {})

    results = advanced_search(query, filters)
    return jsonify({'results': results, 'count': len(results)})

@app.route('/api/kwic', methods=['GET'])
def api_kwic():
    """Keyword-in-context concordance"""
    keyword = request.args.get('keyword', '')
    context_words = int(request.args.get('context', 10))

    results = get_kwic(keyword, context_words)
    return jsonify({'results': results, 'count': len(results)})

@app.route('/api/tags/<int:doc_id>', methods=['GET', 'POST', 'DELETE'])
def api_tags(doc_id):
    """Manage document tags"""
    if request.method == 'GET':
        tags = get_document_tags(doc_id)
        return jsonify({'tags': tags})

    elif request.method == 'POST':
        data = request.json
        tag = data.get('tag')
        tag_type = data.get('type', 'custom')
        color = data.get('color', '#d32f2f')

        success = add_tag(doc_id, tag, tag_type, color)
        return jsonify({'success': success})

    elif request.method == 'DELETE':
        data = request.json
        tag = data.get('tag')
        remove_tag(doc_id, tag)
        return jsonify({'success': True})

@app.route('/api/annotations/<int:doc_id>', methods=['GET', 'POST'])
def api_annotations(doc_id):
    """Manage document annotations"""
    if request.method == 'GET':
        annotations = get_annotations(doc_id)
        return jsonify({'annotations': annotations})

    elif request.method == 'POST':
        data = request.json
        text_selection = data.get('text')
        note = data.get('note', '')
        color = data.get('color', 'yellow')
        importance = data.get('importance', 1)

        annotation_id = add_annotation(doc_id, text_selection, note, color, importance)
        return jsonify({'success': True, 'id': annotation_id})

@app.route('/api/cooccurrence', methods=['GET'])
def api_cooccurrence():
    """Get co-occurrence matrix"""
    entity_type = request.args.get('type', 'person')
    min_count = int(request.args.get('min', 1))

    # Calculate if not already done
    calculate_cooccurrences()

    matrix = get_cooccurrence_matrix(entity_type, min_count)
    return jsonify(matrix)

@app.route('/api/anomalies', methods=['GET'])
def api_anomalies():
    """Get anomalous documents based on entity mention density"""
    conn = get_db()
    c = conn.cursor()

    # Find documents with unusually high entity mention counts (statistical anomalies)
    # Get mean and stddev, then find documents > 2 standard deviations above mean
    c.execute('''
        WITH doc_entity_counts AS (
            SELECT d.id, d.filename, COUNT(DISTINCT em.entity_id) as entity_count,
                   d.uploaded_date
            FROM documents d
            LEFT JOIN entity_mentions em ON d.id = em.doc_id
            GROUP BY d.id
        ),
        stats AS (
            SELECT AVG(entity_count) as mean,
                   CAST(SUM((entity_count - (SELECT AVG(entity_count) FROM doc_entity_counts)) *
                            (entity_count - (SELECT AVG(entity_count) FROM doc_entity_counts)))
                        / COUNT(*) AS REAL) as variance
            FROM doc_entity_counts
        )
        SELECT dec.id, dec.filename, dec.entity_count, dec.uploaded_date,
               s.mean, SQRT(s.variance) as stddev,
               (dec.entity_count - s.mean) / SQRT(s.variance) as z_score
        FROM doc_entity_counts dec, stats s
        WHERE dec.entity_count > (s.mean + 2 * SQRT(s.variance))
        ORDER BY z_score DESC
        LIMIT 100
    ''')

    anomalies = []
    for row in c.fetchall():
        anomalies.append({
            'doc_id': row['id'],
            'filename': row['filename'],
            'entity_count': row['entity_count'],
            'uploaded_date': row['uploaded_date'],
            'z_score': round(row['z_score'], 2) if row['z_score'] else 0,
            'reason': f'{row["entity_count"]} entities (mean: {round(row["mean"], 1)})'
        })

    conn.close()
    return jsonify({'anomalies': anomalies, 'count': len(anomalies)})

@app.route('/api/export', methods=['POST'])
def api_export():
    """Export data in various formats"""
    data = request.json
    export_type = data.get('type', 'search_results')
    format_type = data.get('format', 'json')
    results = data.get('data', [])

    exported = export_search_results(results, format_type)

    if format_type == 'csv':
        from flask import Response
        return Response(
            exported,
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=export.csv'}
        )
    else:
        return exported

@app.route('/api/geomap', methods=['GET'])
def api_geomap():
    """Get geocoded location data for mapping"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT name, entity_type, mention_count
                 FROM entities
                 WHERE entity_type = 'location'
                 ORDER BY mention_count DESC''')

    locations = []
    for row in c.fetchall():
        coords = get_coordinates(row['name'])
        if coords:
            locations.append({
                'name': row['name'],
                'lat': coords[0],
                'lng': coords[1],
                'mentions': row['mention_count']
            })

    conn.close()
    return jsonify({'locations': locations, 'count': len(locations)})

# ============================================================================
# FLIGHT LOG ANALYSIS ROUTES
# ============================================================================

@app.route('/api/flights/import/<int:doc_id>', methods=['POST'])
def api_import_flight_log(doc_id):
    """Import flight log from document"""
    from flight_log_analyzer import import_flight_log_document

    try:
        result = import_flight_log_document(doc_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/flights/stats', methods=['GET'])
def api_flight_stats():
    """Get flight statistics"""
    from flight_log_analyzer import get_flight_statistics

    try:
        stats = get_flight_statistics()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/flights/passenger/<passenger_name>', methods=['GET'])
def api_passenger_flights(passenger_name):
    """Get flight history for passenger"""
    from flight_log_analyzer import get_passenger_flight_history

    try:
        flights = get_passenger_flight_history(passenger_name)
        return jsonify({'passenger': passenger_name, 'flights': flights})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/flights/minor-alerts', methods=['GET'])
def api_minor_alerts():
    """Get alerts for minors traveling"""
    from flight_log_analyzer import get_minor_travel_alerts

    try:
        alerts = get_minor_travel_alerts()
        return jsonify({'alerts': alerts, 'count': len(alerts)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/flights/frequent-flyers', methods=['GET'])
def api_frequent_flyers():
    """Get frequent flyers"""
    from flight_log_analyzer import get_frequent_flyers

    min_flights = int(request.args.get('min', 5))

    try:
        flyers = get_frequent_flyers(min_flights)
        return jsonify({'flyers': flyers})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/flights/cotravel', methods=['GET'])
def api_cotravel_network():
    """Get co-travel network"""
    from flight_log_analyzer import get_cotravel_network, calculate_passenger_cotravel

    passenger = request.args.get('passenger')
    min_flights = int(request.args.get('min', 2))

    try:
        # Calculate if not done yet
        calculate_passenger_cotravel()

        network = get_cotravel_network(passenger, min_flights)
        return jsonify({'network': network})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# COMPLETE FLIGHT INTELLIGENCE ROUTES
# ============================================================================

@app.route('/api/flight/minor-alerts', methods=['GET'])
def api_complete_minor_alerts():
    """Complete flight intelligence: Minor travel alerts"""
    from complete_flight_intelligence import find_minor_travel_alerts

    try:
        alerts = find_minor_travel_alerts()
        return jsonify({'alerts': alerts, 'count': len(alerts)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/flight/passenger/<name>', methods=['GET'])
def api_complete_passenger_history(name):
    """Complete flight intelligence: Passenger history"""
    from complete_flight_intelligence import get_passenger_history

    try:
        history = get_passenger_history(name)
        return jsonify(history)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/flight/frequent-flyers', methods=['GET'])
def api_complete_frequent_flyers():
    """Complete flight intelligence: Frequent flyers"""
    from complete_flight_intelligence import get_frequent_flyers

    min_flights = int(request.args.get('min', 3))

    try:
        flyers = get_frequent_flyers(min_flights)
        return jsonify({'flyers': flyers, 'count': len(flyers)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/flight/network', methods=['GET'])
def api_complete_cotravel_network():
    """Complete flight intelligence: Co-travel network"""
    from complete_flight_intelligence import build_cotravel_network

    passenger = request.args.get('passenger')
    min_flights = int(request.args.get('min', 2))

    try:
        network = build_cotravel_network(passenger, min_flights)
        return jsonify(network)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/flight/suspicious-routes', methods=['GET'])
def api_suspicious_routes():
    """Complete flight intelligence: Suspicious routes to Epstein locations"""
    from complete_flight_intelligence import analyze_suspicious_routes

    try:
        routes = analyze_suspicious_routes()
        return jsonify(routes)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# AI-POWERED INVESTIGATIVE ANALYSIS ROUTES
# ============================================================================

@app.route('/api/ai/analyze-document/<int:doc_id>', methods=['POST'])
def api_ai_analyze_document(doc_id):
    """AI analysis of a document to uncover crimes and generate leads"""
    from ai_investigator import analyze_document_for_crimes

    try:
        analysis = analyze_document_for_crimes(doc_id)
        return jsonify(analysis)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/relationship-network', methods=['GET'])
def api_ai_relationship_network():
    """AI-powered relationship network analysis"""
    from ai_investigator import build_relationship_network

    entity_name = request.args.get('entity')
    min_cooccurrence = int(request.args.get('min', 5))

    try:
        analysis = build_relationship_network(entity_name, min_cooccurrence)
        return jsonify(analysis)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/investigation-report', methods=['GET'])
def api_ai_investigation_report():
    """Generate comprehensive AI investigation report"""
    from ai_investigator import generate_investigation_report

    focus_area = request.args.get('focus')

    try:
        report = generate_investigation_report(focus_area)
        return jsonify(report)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/suspicious-patterns', methods=['GET'])
def api_ai_suspicious_patterns():
    """Find documents with suspicious patterns"""
    from ai_investigator import find_suspicious_patterns

    try:
        patterns = find_suspicious_patterns()
        return jsonify(patterns)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/journalist-query', methods=['POST'])
def api_ai_journalist_query():
    """AI Journalist Assistant - Answer natural language queries"""
    from ai_journalist import answer_natural_language_query

    data = request.get_json()
    query = data.get('query', '')

    if not query:
        return jsonify({'error': 'Query is required'}), 400

    try:
        result = answer_natural_language_query(query)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# EMAIL INTELLIGENCE ROUTES
# ============================================================================

@app.route('/api/emails/import/<int:doc_id>', methods=['POST'])
def api_import_emails(doc_id):
    """Import emails from a document"""
    from email_intelligence import import_emails_from_document
    try:
        result = import_emails_from_document(doc_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/stats', methods=['GET'])
def api_email_stats():
    """Get email statistics"""
    from email_intelligence import get_email_statistics
    try:
        stats = get_email_statistics()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/email/suspicious', methods=['GET'])
def api_suspicious_emails():
    """Get suspicious emails"""
    from email_intelligence import get_suspicious_emails
    try:
        emails = get_suspicious_emails()
        return jsonify({'emails': emails, 'count': len(emails)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/email/threads', methods=['GET'])
def api_high_priority_threads():
    """Get high-priority email threads"""
    from email_intelligence import get_high_priority_threads
    min_suspicion = int(request.args.get('min', 2))
    try:
        threads = get_high_priority_threads(min_suspicion)
        return jsonify({'threads': threads, 'count': len(threads)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/email/contacts', methods=['GET'])
def api_email_contacts():
    """Get email contact network"""
    from email_intelligence import get_email_statistics
    try:
        stats = get_email_statistics()
        contacts = stats.get('most_active_contacts', [])
        return jsonify({'contacts': contacts, 'count': len(contacts)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/thread/<thread_id>', methods=['GET'])
def api_email_thread(thread_id):
    """Get emails in a specific thread"""
    from email_intelligence import get_email_thread
    try:
        emails = get_email_thread(thread_id)
        return jsonify({'emails': emails})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/email/search', methods=['GET'])
def api_search_emails():
    """Search emails"""
    from email_intelligence import search_emails
    query = request.args.get('q', '')
    try:
        results = search_emails(query)
        return jsonify({'results': results, 'count': len(results)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/reconstruct', methods=['POST'])
def api_reconstruct_threads():
    """Reconstruct email threads"""
    from email_intelligence import reconstruct_email_threads, calculate_email_contacts
    try:
        threads = reconstruct_email_threads()
        contacts = calculate_email_contacts()
        return jsonify({'threads': threads, 'contacts': contacts})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# FINANCIAL TRACKING ROUTES
# ============================================================================

@app.route('/api/financial/import/<int:doc_id>', methods=['POST'])
def api_import_transactions(doc_id):
    """Import financial transactions from a document"""
    from financial_tracker import import_transactions_from_document
    try:
        result = import_transactions_from_document(doc_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/financial/stats', methods=['GET'])
def api_financial_stats():
    """Get financial statistics"""
    from financial_tracker import get_financial_statistics
    try:
        stats = get_financial_statistics()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/financial/suspicious', methods=['GET'])
def api_suspicious_transactions():
    """Get suspicious transactions"""
    from financial_tracker import get_suspicious_transactions
    try:
        transactions = get_suspicious_transactions()
        return jsonify({'transactions': transactions, 'count': len(transactions)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/financial/patterns', methods=['GET'])
def api_financial_patterns():
    """Get detected suspicious patterns"""
    from financial_tracker import get_detected_patterns
    try:
        patterns = get_detected_patterns()
        return jsonify({'patterns': patterns, 'count': len(patterns)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/financial/detect-patterns', methods=['POST'])
def api_detect_patterns():
    """Detect suspicious financial patterns"""
    from financial_tracker import detect_financial_patterns
    try:
        count = detect_financial_patterns()
        return jsonify({'patterns_detected': count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/financial/money-flows', methods=['GET'])
def api_money_flows():
    """Get money flow network"""
    from financial_tracker import get_money_flow_network
    entity = request.args.get('entity')
    min_amount = float(request.args.get('min', 1000))
    try:
        flows = get_money_flow_network(entity, min_amount)
        return jsonify({'flows': flows, 'count': len(flows)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/financial/top-entities', methods=['GET'])
def api_top_financial_entities():
    """Get top financial entities"""
    from financial_tracker import get_top_entities
    limit = int(request.args.get('limit', 20))
    try:
        entities = get_top_entities(limit)
        return jsonify({'entities': entities})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# TIMELINE BUILDER ROUTES
# ============================================================================

@app.route('/api/timeline/rebuild', methods=['POST'])
def api_rebuild_timeline():
    """Rebuild complete timeline from all sources"""
    from timeline_builder import rebuild_timeline
    try:
        result = rebuild_timeline()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/timeline/stats', methods=['GET'])
def api_timeline_stats():
    """Get timeline statistics"""
    from timeline_builder import get_timeline_statistics
    try:
        stats = get_timeline_statistics()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/timeline/events', methods=['GET'])
def api_timeline_events():
    """Get timeline events with filters"""
    from timeline_builder import get_timeline_events
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    event_type = request.args.get('type')
    min_suspicion = int(request.args.get('suspicion', 0))
    try:
        events = get_timeline_events(start_date, end_date, event_type, min_suspicion)
        return jsonify({'events': events, 'count': len(events)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/timeline/clusters', methods=['GET'])
def api_timeline_clusters():
    """Get timeline clusters"""
    from timeline_builder import get_timeline_clusters
    try:
        clusters = get_timeline_clusters()
        return jsonify({'clusters': clusters, 'count': len(clusters)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/timeline/detect-clusters', methods=['POST'])
def api_detect_clusters():
    """Detect timeline clusters"""
    from timeline_builder import detect_timeline_clusters
    min_events = int(request.args.get('min_events', 3))
    max_days = int(request.args.get('max_days', 7))
    try:
        count = detect_timeline_clusters(min_events, max_days)
        return jsonify({'clusters_detected': count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/timeline/search', methods=['GET'])
def api_timeline_search():
    """Search timeline events"""
    from timeline_builder import search_timeline
    query = request.args.get('q', '')
    try:
        events = search_timeline(query)
        return jsonify({'events': events, 'count': len(events)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/investigate')
def investigate_page():
    """AI Investigation Dashboard"""
    return render_template('investigate.html')

@app.route('/contradictions')
def contradictions_page():
    """Contradiction Detection Dashboard"""
    return render_template('contradictions.html')

@app.route('/mcp')
def mcp_dashboard():
    """MCP Investigation Tools Dashboard"""
    return render_template('mcp_dashboard.html')

# ============================================================================
# MCP INTEGRATIONS API ENDPOINTS
# ============================================================================

@app.route('/api/mcp/query', methods=['POST'])
def mcp_query():
    """Execute custom SQL query"""
    data = request.json
    sql = data.get('sql', '')
    result = query_database(sql)
    return jsonify(result)

@app.route('/api/mcp/entities/<entity_type>')
def mcp_get_entities_by_type(entity_type):
    """Get entities by type"""
    limit = request.args.get('limit', 100, type=int)
    result = db_mcp.get_entities(entity_type, limit)
    return jsonify(result)

@app.route('/api/mcp/memory', methods=['GET', 'POST', 'DELETE'])
def mcp_memory():
    """Memory operations"""
    if request.method == 'GET':
        key = request.args.get('key')
        if key:
            result = memory_mcp.recall(key)
        else:
            result = memory_mcp.list_memories()
        return jsonify(result)

    elif request.method == 'POST':
        data = request.json
        result = memory_mcp.remember(data['key'], data['value'])
        return jsonify(result)

    elif request.method == 'DELETE':
        data = request.json
        result = memory_mcp.forget(data['key'])
        return jsonify(result)

@app.route('/api/mcp/ocr-progress')
def mcp_ocr_progress():
    """Get OCR processing progress"""
    result = query_database("""
        SELECT
            COUNT(*) as total_images,
            SUM(CASE WHEN content NOT LIKE '%[OCR text extraction will be performed%' THEN 1 ELSE 0 END) as processed,
            SUM(CASE WHEN content LIKE '%[OCR text extraction will be performed%' THEN 1 ELSE 0 END) as pending
        FROM documents
        WHERE file_type LIKE 'image/%'
    """)
    if result['success'] and result['data']:
        data = result['data'][0]
        data['progress_percent'] = (data['processed'] / data['total_images'] * 100) if data['total_images'] > 0 else 0
        return jsonify({"success": True, "data": data})
    return jsonify(result)

# ============================================================================
# MISSING ENDPOINTS - Added to fix 404 errors
# ============================================================================

@app.route('/images')
def get_images():
    """Get all image documents"""
    conn = get_db()
    c = conn.cursor()
    c.execute('''SELECT id, filename, uploaded_date, file_type
                 FROM documents
                 WHERE file_type LIKE 'image/%'
                 ORDER BY uploaded_date DESC''')
    images = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify({'images': images, 'count': len(images)})

@app.route('/api/ai-journalist/stats')
def ai_journalist_stats():
    """Get AI Journalist statistics"""
    return jsonify({
        'articles_generated': 0,
        'last_run': None,
        'status': 'not_configured'
    })

@app.route('/api/ai-investigation/stats')
def ai_investigation_stats():
    """Get AI Investigation statistics"""
    return jsonify({
        'investigations': 0,
        'last_run': None,
        'status': 'not_configured'
    })

@app.route('/api/flights/routes')
def flight_routes():
    """Get flight routes"""
    return jsonify({
        'routes': [],
        'count': 0,
        'message': 'Flight data not yet imported'
    })

@app.route('/api/flights/patterns')
def flight_patterns():
    """Get flight patterns"""
    return jsonify({
        'patterns': [],
        'count': 0,
        'message': 'Flight data not yet imported'
    })

@app.route('/api/flights/search')
def flight_search():
    """Search flights"""
    passenger = request.args.get('passenger', '')
    return jsonify({
        'flights': [],
        'count': 0,
        'query': passenger,
        'message': 'Flight data not yet imported'
    })

@app.route('/api/emails/search')
def email_search():
    """Search emails"""
    query = request.args.get('q', '')
    return jsonify({
        'emails': [],
        'count': 0,
        'query': query,
        'message': 'Email data not yet imported'
    })

@app.route('/api/emails/network')
def email_network():
    """Get email network"""
    return jsonify({
        'nodes': [],
        'edges': [],
        'message': 'Email data not yet imported'
    })

@app.route('/api/emails/timeline')
def email_timeline():
    """Get email timeline"""
    return jsonify({
        'events': [],
        'count': 0,
        'message': 'Email data not yet imported'
    })

@app.route('/api/financial/search')
def financial_search():
    """Search financial records"""
    query = request.args.get('q', '')
    return jsonify({
        'transactions': [],
        'count': 0,
        'query': query,
        'message': 'Financial data not yet imported'
    })

@app.route('/api/financial/timeline')
def financial_timeline():
    """Get financial timeline"""
    return jsonify({
        'events': [],
        'count': 0,
        'message': 'Financial data not yet imported'
    })

@app.route('/api/financial/anomalies')
def financial_anomalies():
    """Get financial anomalies"""
    return jsonify({
        'anomalies': [],
        'count': 0,
        'message': 'Financial data not yet imported'
    })

@app.route('/api/geomap/locations')
def geomap_locations():
    """Get locations for geo map"""
    conn = get_db()
    c = conn.cursor()
    c.execute('''SELECT e.name as location, COUNT(em.id) as mention_count
                 FROM entities e
                 LEFT JOIN entity_mentions em ON e.id = em.entity_id
                 WHERE e.entity_type = 'location'
                 GROUP BY e.name
                 ORDER BY mention_count DESC
                 LIMIT 100''')
    locations = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify({'locations': locations, 'count': len(locations)})

@app.route('/api/entities/types')
def entity_types():
    """Get all entity types"""
    conn = get_db()
    c = conn.cursor()
    c.execute('''SELECT entity_type, COUNT(*) as count
                 FROM entities
                 GROUP BY entity_type''')
    types = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify({'types': types, 'count': len(types)})

# Fix Advanced Search to accept GET requests
@app.route('/api/advanced-search', methods=['GET', 'POST'])
def api_advanced_search_fixed():
    """Advanced search with GET support"""
    if request.method == 'POST':
        query = request.json.get('q', '')
    else:
        query = request.args.get('q', '')

    if not query:
        return jsonify({'documents': [], 'count': 0})

    conn = get_db()
    c = conn.cursor()
    c.execute('''SELECT id, filename, content, uploaded_date
                 FROM documents
                 WHERE content LIKE ?
                 LIMIT 100''', (f'%{query}%',))
    docs = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify({'documents': docs, 'count': len(docs)})

# ============================================================================
# CONTRADICTION DETECTION ROUTES
# ============================================================================

@app.route('/api/contradictions/init', methods=['POST'])
def api_init_contradictions():
    """Initialize contradiction detection tables"""
    from contradiction_detector import init_contradiction_tables
    try:
        init_contradiction_tables()
        return jsonify({'success': True, 'message': 'Contradiction detection tables initialized'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contradictions/process/<int:doc_id>', methods=['POST'])
def api_process_document_contradictions(doc_id):
    """Process a specific document for contradictions"""
    from contradiction_detector import process_document_for_contradictions
    try:
        speaker = request.json.get('speaker') if request.json else None
        result = process_document_for_contradictions(doc_id, speaker)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contradictions/process-all', methods=['POST'])
def api_process_all_contradictions():
    """Process all documents for contradictions"""
    from contradiction_detector import process_all_documents
    try:
        results = process_all_documents()
        total_claims = sum(r.get('claims_extracted', 0) for r in results)
        total_contradictions = sum(r.get('contradictions_found', 0) for r in results)
        return jsonify({
            'success': True,
            'documents_processed': len(results),
            'total_claims': total_claims,
            'total_contradictions': total_contradictions,
            'details': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contradictions', methods=['GET'])
def api_get_contradictions():
    """Get all contradictions with optional filters"""
    from contradiction_detector import get_all_contradictions
    try:
        min_confidence = float(request.args.get('confidence', 0.5))
        severity = request.args.get('severity')
        contradictions = get_all_contradictions(min_confidence, severity)
        return jsonify({'contradictions': contradictions, 'count': len(contradictions)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contradictions/stats', methods=['GET'])
def api_contradiction_stats():
    """Get contradiction detection statistics"""
    from contradiction_detector import get_contradiction_stats
    try:
        stats = get_contradiction_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contradictions/high-priority', methods=['GET'])
def api_high_priority_contradictions():
    """Get high-priority contradictions (high severity, high confidence)"""
    from contradiction_detector import get_all_contradictions
    try:
        contradictions = get_all_contradictions(min_confidence=0.7, severity='high')
        return jsonify({'contradictions': contradictions, 'count': len(contradictions)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contradictions/by-speaker/<speaker>', methods=['GET'])
def api_contradictions_by_speaker(speaker):
    """Get contradictions involving a specific speaker"""
    from contradiction_detector import get_db
    try:
        conn = get_db()
        c = conn.cursor()

        c.execute('''SELECT c.*,
                            cl1.claim_text as claim1_text, cl1.speaker as speaker1,
                            cl2.claim_text as claim2_text, cl2.speaker as speaker2,
                            d1.filename as doc1_filename,
                            d2.filename as doc2_filename
                     FROM contradictions c
                     JOIN claims cl1 ON c.claim1_id = cl1.id
                     JOIN claims cl2 ON c.claim2_id = cl2.id
                     JOIN documents d1 ON cl1.source_doc_id = d1.id
                     JOIN documents d2 ON cl2.source_doc_id = d2.id
                     WHERE cl1.speaker = ? OR cl2.speaker = ?
                     ORDER BY c.severity DESC, c.confidence_score DESC''',
                  (speaker, speaker))

        contradictions = [dict(row) for row in c.fetchall()]
        conn.close()

        return jsonify({'contradictions': contradictions, 'count': len(contradictions), 'speaker': speaker})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contradictions/verify/<int:contradiction_id>', methods=['POST'])
def api_verify_contradiction(contradiction_id):
    """Mark a contradiction as verified by investigator"""
    from contradiction_detector import get_db
    try:
        data = request.json or {}
        notes = data.get('notes', '')

        conn = get_db()
        c = conn.cursor()
        c.execute('''UPDATE contradictions
                     SET verified = 1, investigator_notes = ?
                     WHERE id = ?''', (notes, contradiction_id))
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Contradiction verified'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# SEMANTIC SEARCH ROUTES
# ============================================================================

@app.route('/api/semantic-search/init', methods=['POST'])
def api_init_semantic_search():
    """Initialize semantic search tables"""
    from semantic_search import init_semantic_search_tables
    try:
        init_semantic_search_tables()
        return jsonify({'success': True, 'message': 'Semantic search tables initialized'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/semantic-search/generate-embeddings', methods=['POST'])
def api_generate_embeddings():
    """Generate embeddings for all documents"""
    from semantic_search import generate_all_embeddings
    try:
        result = generate_all_embeddings()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/semantic-search/search', methods=['GET'])
def api_semantic_search():
    """Perform semantic search"""
    from semantic_search import semantic_search
    try:
        query = request.args.get('q', '')
        limit = int(request.args.get('limit', 20))
        min_similarity = float(request.args.get('min_similarity', 0.3))

        if not query:
            return jsonify({'error': 'Query parameter "q" is required'}), 400

        results = semantic_search(query, limit, min_similarity)
        return jsonify({'results': results, 'count': len(results), 'query': query})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/semantic-search/hybrid', methods=['GET'])
def api_hybrid_search():
    """Perform hybrid search (semantic + keyword)"""
    from semantic_search import hybrid_search
    try:
        query = request.args.get('q', '')
        limit = int(request.args.get('limit', 20))
        semantic_weight = float(request.args.get('semantic_weight', 0.7))

        if not query:
            return jsonify({'error': 'Query parameter "q" is required'}), 400

        results = hybrid_search(query, limit, semantic_weight)
        return jsonify({'results': results, 'count': len(results), 'query': query})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/semantic-search/stats', methods=['GET'])
def api_semantic_search_stats():
    """Get semantic search statistics"""
    from semantic_search import get_semantic_search_stats
    try:
        stats = get_semantic_search_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/semantic-search/expand-query', methods=['GET'])
def api_expand_query():
    """Expand a query with related terms"""
    from semantic_search import expand_query
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({'error': 'Query parameter "q" is required'}), 400

        expansions = expand_query(query)
        return jsonify({'query': query, 'expansions': expansions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# CROSS-DOCUMENT LINKING ROUTES
# ============================================================================

@app.route('/api/document-linking/init', methods=['POST'])
def api_init_linking():
    """Initialize document linking tables"""
    from document_linking import init_linking_tables
    try:
        init_linking_tables()
        return jsonify({'success': True, 'message': 'Document linking tables initialized'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/document-linking/build', methods=['POST'])
def api_build_links():
    """Build links between all documents"""
    from document_linking import build_document_links
    try:
        result = build_document_links()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/document-linking/related/<int:doc_id>', methods=['GET'])
def api_get_related_docs(doc_id):
    """Get documents related to a specific document"""
    from document_linking import get_related_documents
    try:
        min_strength = float(request.args.get('min_strength', 0.2))
        limit = int(request.args.get('limit', 20))

        related = get_related_documents(doc_id, min_strength, limit)
        return jsonify({'related_documents': related, 'count': len(related)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/document-linking/evidence-chain/<int:doc_id>', methods=['GET'])
def api_evidence_chain(doc_id):
    """Build evidence chain from a document"""
    from document_linking import build_evidence_chain
    try:
        entity = request.args.get('entity', '')
        max_depth = int(request.args.get('max_depth', 5))

        if not entity:
            return jsonify({'error': 'Entity parameter required'}), 400

        chains = build_evidence_chain(doc_id, entity, max_depth)
        return jsonify({'chains': chains, 'count': len(chains)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/document-linking/citation-network', methods=['GET'])
def api_citation_network():
    """Get citation network for an entity"""
    from document_linking import get_citation_network
    try:
        entity = request.args.get('entity', '')
        if not entity:
            return jsonify({'error': 'Entity parameter required'}), 400

        network = get_citation_network(entity)
        return jsonify(network)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/document-linking/stats', methods=['GET'])
def api_linking_stats():
    """Get document linking statistics"""
    from document_linking import get_linking_stats
    try:
        stats = get_linking_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# LEAD PRIORITIZATION ROUTES
# ============================================================================

@app.route('/api/leads/init', methods=['POST'])
def api_init_leads():
    """Initialize lead prioritization tables"""
    from lead_prioritizer import init_leads_tables
    try:
        init_leads_tables()
        return jsonify({'success': True, 'message': 'Lead prioritization tables initialized'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leads/generate', methods=['POST'])
def api_generate_leads():
    """Generate investigative leads from all sources"""
    from lead_prioritizer import generate_all_leads
    try:
        result = generate_all_leads()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leads', methods=['GET'])
def api_get_leads():
    """Get prioritized leads"""
    from lead_prioritizer import get_prioritized_leads
    try:
        status = request.args.get('status')
        lead_type = request.args.get('type')
        limit = int(request.args.get('limit', 50))

        leads = get_prioritized_leads(status, lead_type, limit)
        return jsonify({'leads': leads, 'count': len(leads)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leads/<int:lead_id>/status', methods=['POST'])
def api_update_lead_status(lead_id):
    """Update lead status"""
    from lead_prioritizer import update_lead_status
    try:
        data = request.json or {}
        status = data.get('status')
        notes = data.get('notes')

        if not status:
            return jsonify({'error': 'Status required'}), 400

        success = update_lead_status(lead_id, status, notes)
        if success:
            return jsonify({'success': True, 'message': 'Lead status updated'})
        else:
            return jsonify({'error': 'Lead not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leads/stats', methods=['GET'])
def api_lead_stats():
    """Get lead statistics"""
    from lead_prioritizer import get_lead_stats
    try:
        stats = get_lead_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    print("=" * 50)
    print("Epstein Archive Investigator - Local Edition")
    print("=" * 50)
    print("Server starting on http://localhost:5001")
    print("Upload .txt and .jpg files to begin investigation")
    print("=" * 50)
    app.run(debug=True, port=5001)
