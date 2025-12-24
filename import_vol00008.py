#!/usr/bin/env python3
"""
VOL00008 Epstein Files Importer
Processes and imports 10,593+ documents from the Epstein case discovery files
"""

import os
import sqlite3
import re
from datetime import datetime
from pypdf import PdfReader
from pathlib import Path
import hashlib

# Configuration
VOL00008_BASE = "/Users/jonathon/Auto1111/Claude/VOL00008"
DATABASE_PATH = "/Users/jonathon/Auto1111/Claude/database.db"
IMAGES_DIR = os.path.join(VOL00008_BASE, "IMAGES")
NATIVES_DIR = os.path.join(VOL00008_BASE, "NATIVES")
OPT_FILE = os.path.join(VOL00008_BASE, "DATA", "VOL00008.OPT")

# Key persons of interest for entity extraction
PERSONS_OF_INTEREST = [
    "Jeffrey Epstein", "Epstein", "Ghislaine Maxwell", "Maxwell",
    "Virginia Giuffre", "Virginia Roberts", "Prince Andrew", "Andrew",
    "Bill Clinton", "Clinton", "Donald Trump", "Trump",
    "Alan Dershowitz", "Dershowitz", "Les Wexner", "Wexner",
    "Jean-Luc Brunel", "Brunel", "Sarah Kellen", "Kellen",
    "Nadia Marcinkova", "Adriana Ross", "Lesley Groff",
    "Alexander Acosta", "Acosta", "R. Alexander Acosta",
    "Courtney Wild", "Annie Farmer", "Maria Farmer",
    "Kevin Spacey", "Chris Tucker", "Naomi Campbell",
    "Bill Richardson", "George Mitchell", "Glenn Dubin",
    "Eva Dubin", "Leon Black", "Jes Staley", "Lawrence Krauss",
    "Ehud Barak", "Woody Allen", "Steven Pinker",
    "Larry Summers", "Mort Zuckerman", "Bill Gates",
    "Marvin Minsky", "Reid Hoffman", "Peter Thiel"
]

# Key locations
KEY_LOCATIONS = [
    "Little St. James", "St. James Island", "Little Saint James",
    "Palm Beach", "New York", "Manhattan", "Florida",
    "New Mexico", "Zorro Ranch", "Paris", "London",
    "US Virgin Islands", "Virgin Islands", "USVI",
    "MCC New York", "Metropolitan Correctional Center",
    "MDC Brooklyn", "66 El Brillo Way", "9 East 71st",
    "East 71st Street", "Ohio", "Columbus"
]

# Document categories for classification
DOC_CATEGORIES = {
    'email': ['From:', 'To:', 'Subject:', 'Date:', 'Sent:', '@'],
    'court_filing': ['UNITED STATES DISTRICT COURT', 'Case', 'Plaintiff', 'Defendant', 'MOTION', 'ORDER'],
    'fbi': ['FBI', 'Federal Bureau', 'Special Agent'],
    'medical': ['medical', 'pharmacy', 'prescription', 'inmate', 'health'],
    'calendar': ['Event:', 'Start Date:', 'End Date:', 'Organizer:', 'Location:'],
    'financial': ['$', 'payment', 'transfer', 'account', 'bank'],
    'deposition': ['DEPOSITION', 'Q.', 'A.', 'WITNESS', 'sworn'],
    'flight': ['flight', 'passenger', 'aircraft', 'N727JE', 'N908JE', 'N909JE']
}

def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_tables():
    """Initialize additional tables for VOL00008 analysis"""
    conn = get_db()
    c = conn.cursor()

    # VOL00008 document index
    c.execute('''CREATE TABLE IF NOT EXISTS vol00008_docs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        efta_id TEXT UNIQUE NOT NULL,
        filepath TEXT NOT NULL,
        doc_id INTEGER,
        page_count INTEGER,
        doc_category TEXT,
        has_text INTEGER DEFAULT 0,
        is_parent INTEGER DEFAULT 0,
        parent_efta TEXT,
        extracted_date TEXT,
        key_persons TEXT,
        key_locations TEXT,
        suspicion_score INTEGER DEFAULT 0,
        import_date TEXT
    )''')

    # High-priority findings
    c.execute('''CREATE TABLE IF NOT EXISTS high_priority_findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id INTEGER,
        efta_id TEXT,
        finding_type TEXT,
        description TEXT,
        persons_involved TEXT,
        locations_involved TEXT,
        date_mentioned TEXT,
        severity INTEGER DEFAULT 1,
        verified INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT
    )''')

    # Document relationships
    c.execute('''CREATE TABLE IF NOT EXISTS doc_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_doc_id INTEGER,
        target_doc_id INTEGER,
        relationship_type TEXT,
        confidence REAL,
        shared_entities TEXT,
        created_at TEXT
    )''')

    conn.commit()
    conn.close()
    print("Tables initialized")

def parse_opt_file():
    """Parse the OPT file to understand document structure"""
    documents = {}

    with open(OPT_FILE, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            parts = line.strip().split(',')
            if len(parts) >= 3:
                efta_id = parts[0]
                filepath = parts[2].replace('\\', '/')
                is_parent = 'Y' in parts[3] if len(parts) > 3 else False
                page_count = int(parts[-1]) if parts[-1].isdigit() else 0

                documents[efta_id] = {
                    'filepath': filepath,
                    'is_parent': is_parent,
                    'page_count': page_count
                }

    return documents

def classify_document(text):
    """Classify document type based on content"""
    text_lower = text.lower()
    scores = {}

    for category, keywords in DOC_CATEGORIES.items():
        score = sum(1 for kw in keywords if kw.lower() in text_lower)
        if score > 0:
            scores[category] = score

    if scores:
        return max(scores, key=scores.get)
    return 'unknown'

def extract_persons(text):
    """Extract persons of interest from text"""
    found = []
    for person in PERSONS_OF_INTEREST:
        if re.search(r'\b' + re.escape(person) + r'\b', text, re.IGNORECASE):
            found.append(person)
    return list(set(found))

def extract_locations(text):
    """Extract key locations from text"""
    found = []
    for location in KEY_LOCATIONS:
        if re.search(r'\b' + re.escape(location) + r'\b', text, re.IGNORECASE):
            found.append(location)
    return list(set(found))

def calculate_suspicion_score(text, persons, locations, category):
    """Calculate suspicion score based on content analysis"""
    score = 0
    text_lower = text.lower()

    # High-value persons
    high_value = ['epstein', 'maxwell', 'prince andrew', 'acosta', 'minor', 'underage', 'girl']
    for term in high_value:
        if term in text_lower:
            score += 10

    # Key locations
    suspicious_locations = ['little st. james', 'mcc', 'zorro ranch']
    for loc in suspicious_locations:
        if loc in text_lower:
            score += 5

    # Suspicious terms
    suspicious_terms = ['massage', 'recruit', 'victim', 'traffick', 'minor', 'abuse',
                       'payment', 'cash', 'silence', 'settlement', 'nda', 'immunity']
    for term in suspicious_terms:
        if term in text_lower:
            score += 3

    # Category bonuses
    if category == 'medical':
        score += 5  # Medical records from MCC very important
    if category == 'calendar':
        score += 3  # Calendar entries show connections

    # Person count bonus
    score += len(persons) * 2

    return min(score, 100)  # Cap at 100

def extract_dates(text):
    """Extract dates from text"""
    dates = []

    # Various date patterns
    patterns = [
        r'\b\d{1,2}/\d{1,2}/\d{2,4}\b',  # MM/DD/YYYY
        r'\b\d{4}-\d{2}-\d{2}\b',  # YYYY-MM-DD
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b',
        r'\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b'
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        dates.extend(matches)

    return list(set(dates))

def extract_pdf_text(filepath):
    """Extract text from PDF"""
    try:
        reader = PdfReader(filepath)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip(), len(reader.pages)
    except Exception as e:
        return None, 0

def import_document(efta_id, filepath, doc_info, conn):
    """Import a single document"""
    c = conn.cursor()

    full_path = os.path.join(VOL00008_BASE, filepath)
    if not os.path.exists(full_path):
        return None

    # Check if already imported
    c.execute('SELECT doc_id FROM vol00008_docs WHERE efta_id = ?', (efta_id,))
    existing = c.fetchone()
    if existing:
        return existing['doc_id']

    # Extract text
    text, page_count = extract_pdf_text(full_path)
    has_text = 1 if text and len(text) > 50 else 0

    # Classify and analyze
    if text:
        category = classify_document(text)
        persons = extract_persons(text)
        locations = extract_locations(text)
        suspicion_score = calculate_suspicion_score(text, persons, locations, category)
    else:
        category = 'scanned'
        persons = []
        locations = []
        suspicion_score = 0

    # Insert into documents table
    upload_date = datetime.now().isoformat()
    c.execute('''INSERT INTO documents (filename, filepath, file_type, content, uploaded_date, metadata)
                 VALUES (?, ?, ?, ?, ?, ?)''',
              (efta_id + '.pdf', full_path, 'txt', text or '', upload_date,
               f'{{"source": "VOL00008", "category": "{category}"}}'))
    doc_id = c.lastrowid

    # Add to FTS if has text
    if has_text and text:
        c.execute('INSERT INTO documents_fts (doc_id, filename, content) VALUES (?, ?, ?)',
                  (doc_id, efta_id + '.pdf', text))

    # Insert into vol00008_docs
    c.execute('''INSERT INTO vol00008_docs
                 (efta_id, filepath, doc_id, page_count, doc_category, has_text,
                  is_parent, key_persons, key_locations, suspicion_score, import_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
              (efta_id, filepath, doc_id, page_count or doc_info.get('page_count', 0),
               category, has_text, 1 if doc_info.get('is_parent') else 0,
               ','.join(persons), ','.join(locations), suspicion_score, upload_date))

    # Extract and store entities
    if text:
        extract_and_store_entities(doc_id, text, persons, locations, c)

    # Flag high-priority findings
    if suspicion_score >= 20:
        description = f"High-value document: {category}, score={suspicion_score}"
        c.execute('''INSERT INTO high_priority_findings
                     (doc_id, efta_id, finding_type, description, persons_involved,
                      locations_involved, severity, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                  (doc_id, efta_id, category, description, ','.join(persons),
                   ','.join(locations), min(suspicion_score // 10, 10), upload_date))

    return doc_id

def extract_and_store_entities(doc_id, text, persons, locations, cursor):
    """Extract and store entities in the database"""

    # Store persons
    for person in persons:
        cursor.execute('''INSERT INTO entities (name, entity_type, mention_count)
                         VALUES (?, 'person', 1)
                         ON CONFLICT(name, entity_type) DO UPDATE SET mention_count = mention_count + 1''',
                      (person,))

        cursor.execute('SELECT id FROM entities WHERE name = ? AND entity_type = ?', (person, 'person'))
        entity_row = cursor.fetchone()
        if entity_row:
            entity_id = entity_row[0]
            context = text[:500]
            cursor.execute('''INSERT INTO entity_mentions (doc_id, entity_id, context)
                             VALUES (?, ?, ?)''', (doc_id, entity_id, context))

    # Store locations
    for location in locations:
        cursor.execute('''INSERT INTO entities (name, entity_type, mention_count)
                         VALUES (?, 'location', 1)
                         ON CONFLICT(name, entity_type) DO UPDATE SET mention_count = mention_count + 1''',
                      (location,))

        cursor.execute('SELECT id FROM entities WHERE name = ? AND entity_type = ?', (location, 'location'))
        entity_row = cursor.fetchone()
        if entity_row:
            entity_id = entity_row[0]
            cursor.execute('''INSERT INTO entity_mentions (doc_id, entity_id, context)
                             VALUES (?, ?, ?)''', (doc_id, entity_id, text[:500]))

    # Extract and store dates
    dates = extract_dates(text)
    for date in dates[:10]:  # Limit to 10 dates per doc
        cursor.execute('''INSERT INTO entities (name, entity_type, mention_count)
                         VALUES (?, 'date', 1)
                         ON CONFLICT(name, entity_type) DO UPDATE SET mention_count = mention_count + 1''',
                      (date,))

def import_all_documents(limit=None):
    """Import all documents from VOL00008"""
    init_tables()

    print("Parsing OPT file...")
    opt_docs = parse_opt_file()
    print(f"Found {len(opt_docs)} document entries in OPT file")

    # Get all PDFs
    all_pdfs = []
    for subdir in sorted(os.listdir(IMAGES_DIR)):
        subdir_path = os.path.join(IMAGES_DIR, subdir)
        if os.path.isdir(subdir_path):
            for f in os.listdir(subdir_path):
                if f.endswith('.pdf'):
                    efta_id = f.replace('.pdf', '')
                    filepath = f"IMAGES/{subdir}/{f}"
                    doc_info = opt_docs.get(efta_id, {})
                    all_pdfs.append((efta_id, filepath, doc_info))

    print(f"Found {len(all_pdfs)} PDF files")

    if limit:
        all_pdfs = all_pdfs[:limit]
        print(f"Limiting to {limit} files")

    conn = get_db()

    # Import in batches
    batch_size = 100
    imported = 0
    high_priority = 0

    for i, (efta_id, filepath, doc_info) in enumerate(all_pdfs):
        try:
            doc_id = import_document(efta_id, filepath, doc_info, conn)
            if doc_id:
                imported += 1

            # Commit in batches
            if (i + 1) % batch_size == 0:
                conn.commit()
                print(f"Progress: {i+1}/{len(all_pdfs)} documents ({imported} imported)")

        except Exception as e:
            print(f"Error importing {efta_id}: {e}")
            continue

    conn.commit()

    # Get high priority count
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM high_priority_findings')
    high_priority = c.fetchone()[0]

    conn.close()

    return {
        'total_processed': len(all_pdfs),
        'imported': imported,
        'high_priority_findings': high_priority
    }

def get_high_priority_summary():
    """Get summary of high-priority findings"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT h.*, v.doc_category, v.key_persons, v.key_locations
                 FROM high_priority_findings h
                 JOIN vol00008_docs v ON h.doc_id = v.doc_id
                 ORDER BY h.severity DESC, v.suspicion_score DESC
                 LIMIT 100''')

    findings = [dict(row) for row in c.fetchall()]
    conn.close()
    return findings

def analyze_person_network(person_name):
    """Analyze documents mentioning a specific person"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT v.efta_id, v.doc_category, v.key_persons, v.key_locations,
                        v.suspicion_score, d.content
                 FROM vol00008_docs v
                 JOIN documents d ON v.doc_id = d.id
                 WHERE v.key_persons LIKE ?
                 ORDER BY v.suspicion_score DESC''',
              (f'%{person_name}%',))

    results = [dict(row) for row in c.fetchall()]
    conn.close()
    return results

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--full':
        print("Starting FULL import of VOL00008...")
        result = import_all_documents()
    else:
        print("Starting sample import (1000 docs)...")
        result = import_all_documents(limit=1000)

    print("\n" + "="*60)
    print("IMPORT COMPLETE")
    print("="*60)
    print(f"Total processed: {result['total_processed']}")
    print(f"Documents imported: {result['imported']}")
    print(f"High-priority findings: {result['high_priority_findings']}")

    print("\n" + "="*60)
    print("TOP HIGH-PRIORITY FINDINGS")
    print("="*60)

    findings = get_high_priority_summary()
    for f in findings[:20]:
        print(f"\n[{f['efta_id']}] ({f['doc_category']}) Score: {f['severity']}")
        print(f"  Persons: {f.get('key_persons', 'N/A')}")
        print(f"  Locations: {f.get('key_locations', 'N/A')}")
