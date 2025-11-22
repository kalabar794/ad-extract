#!/usr/bin/env python3
"""
Event Timeline Extractor
Extracts real events (crimes, meetings, flights, interactions) from documents
Creates an actual investigative timeline instead of just date metadata
"""

import sqlite3
import re
from datetime import datetime
from collections import defaultdict
import spacy

# Load spaCy model
try:
    nlp = spacy.load('en_core_web_sm')
except:
    print("Installing spaCy model...")
    import os
    os.system('python3 -m spacy download en_core_web_sm')
    nlp = spacy.load('en_core_web_sm')

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_events_table():
    """Create events table for timeline"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS events
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  event_date TEXT,
                  event_type TEXT,
                  event_description TEXT NOT NULL,
                  people_involved TEXT,
                  locations TEXT,
                  doc_id INTEGER,
                  source_filename TEXT,
                  context TEXT,
                  severity INTEGER DEFAULT 0,
                  FOREIGN KEY (doc_id) REFERENCES documents(id))''')

    c.execute('CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)')

    conn.commit()
    conn.close()
    print("✓ Events table initialized")

def extract_date_from_text(text):
    """Extract the most likely date from a text snippet"""
    # Common date patterns
    patterns = [
        r'(\d{1,2}/\d{1,2}/\d{4})',  # MM/DD/YYYY
        r'(\d{4}-\d{1,2}-\d{1,2})',  # YYYY-MM-DD
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',  # Month DD, YYYY
        r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}',  # Mon DD, YYYY
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0)

    return None

def normalize_date(date_str):
    """Convert various date formats to YYYY-MM-DD"""
    if not date_str:
        return None

    formats = [
        '%m/%d/%Y',
        '%Y-%m-%d',
        '%B %d, %Y',
        '%b %d, %Y',
        '%d %B %Y',
        '%d %b %Y',
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime('%Y-%m-%d')
        except:
            continue

    return None

def classify_event_type(text):
    """Classify the type of event based on keywords"""
    text_lower = text.lower()

    # Crime-related
    if any(word in text_lower for word in ['abuse', 'assault', 'rape', 'molest', 'trafficking', 'prostitution', 'victim', 'crime', 'illegal']):
        return 'CRIME'

    # Travel-related
    if any(word in text_lower for word in ['flight', 'flew', 'travel', 'airplane', 'airport', 'departed', 'arrived', 'trip']):
        return 'TRAVEL'

    # Meeting/Communication
    if any(word in text_lower for word in ['meeting', 'met with', 'spoke with', 'call', 'email', 'message', 'communication', 'discuss']):
        return 'MEETING'

    # Financial
    if any(word in text_lower for word in ['payment', 'paid', 'transfer', 'money', 'cash', 'check', 'wire', 'transaction', 'dollar']):
        return 'FINANCIAL'

    # Legal
    if any(word in text_lower for word in ['court', 'trial', 'testimony', 'deposition', 'lawsuit', 'judge', 'attorney', 'subpoena']):
        return 'LEGAL'

    # Investigation
    if any(word in text_lower for word in ['investigation', 'interview', 'interrogation', 'evidence', 'witness', 'statement']):
        return 'INVESTIGATION'

    return 'OTHER'

def calculate_severity(text, event_type):
    """Calculate severity score 0-10 based on keywords"""
    text_lower = text.lower()
    severity = 0

    # High severity keywords
    high_keywords = ['rape', 'assault', 'abuse', 'minor', 'child', 'underage', 'trafficking', 'forced', 'coerced']
    for keyword in high_keywords:
        if keyword in text_lower:
            severity += 3

    # Medium severity keywords
    medium_keywords = ['illegal', 'crime', 'victim', 'complaint', 'allegation', 'suspect']
    for keyword in medium_keywords:
        if keyword in text_lower:
            severity += 2

    # Low severity keywords
    low_keywords = ['concern', 'question', 'inquiry', 'review']
    for keyword in low_keywords:
        if keyword in text_lower:
            severity += 1

    # Event type adjustments
    if event_type == 'CRIME':
        severity += 2
    elif event_type == 'INVESTIGATION':
        severity += 1

    return min(severity, 10)  # Cap at 10

def extract_events_from_document(doc_id, filename, content):
    """Extract events from a single document"""
    if not content or len(content) < 100:
        return []

    events = []

    # Split into sentences
    doc = nlp(content[:1000000])  # Limit to 1M chars for performance

    # Look for sentences with dates and actions
    for sent in doc.sents:
        sent_text = sent.text.strip()

        # Skip very short sentences
        if len(sent_text) < 30:
            continue

        # Extract entities from sentence
        people = [ent.text for ent in sent.ents if ent.label_ == 'PERSON']
        locations = [ent.text for ent in sent.ents if ent.label_ in ['GPE', 'LOC', 'FAC']]
        dates = [ent.text for ent in sent.ents if ent.label_ == 'DATE']

        # Look for action verbs
        has_action = any(token.pos_ == 'VERB' and token.dep_ in ['ROOT', 'conj'] for token in sent)

        # If sentence has people, action, and context, it might be an event
        if people and has_action and len(sent_text) > 40:
            event_date = dates[0] if dates else extract_date_from_text(sent_text)
            normalized_date = normalize_date(event_date) if event_date else None

            event_type = classify_event_type(sent_text)
            severity = calculate_severity(sent_text, event_type)

            # Only include events with some significance
            if severity > 0 or event_type in ['CRIME', 'INVESTIGATION', 'LEGAL']:
                events.append({
                    'event_date': normalized_date,
                    'event_type': event_type,
                    'event_description': sent_text,
                    'people_involved': ', '.join(people[:5]),  # Limit to 5 people
                    'locations': ', '.join(locations[:3]),  # Limit to 3 locations
                    'doc_id': doc_id,
                    'source_filename': filename,
                    'context': sent_text[:500],  # Full sentence as context
                    'severity': severity
                })

    return events

def extract_events_from_all_documents():
    """Extract events from all documents"""
    conn = get_db()
    c = conn.cursor()

    print("\n" + "="*70)
    print("EVENT TIMELINE EXTRACTOR")
    print("="*70)

    # Clear existing events
    c.execute('DELETE FROM events')
    conn.commit()

    # Get all documents with content
    c.execute('''SELECT id, filename, content
                 FROM documents
                 WHERE content IS NOT NULL
                 AND LENGTH(content) > 100
                 ORDER BY id''')

    docs = c.fetchall()
    total_docs = len(docs)

    print(f"\nProcessing {total_docs} documents...")

    total_events = 0

    for idx, doc in enumerate(docs, 1):
        if idx % 100 == 0:
            print(f"  Processing {idx}/{total_docs}...")

        try:
            events = extract_events_from_document(doc['id'], doc['filename'], doc['content'])

            # Insert events into database
            for event in events:
                c.execute('''INSERT INTO events
                             (event_date, event_type, event_description, people_involved,
                              locations, doc_id, source_filename, context, severity)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                         (event['event_date'], event['event_type'], event['event_description'],
                          event['people_involved'], event['locations'], event['doc_id'],
                          event['source_filename'], event['context'], event['severity']))

                total_events += 1

            # Commit every 50 documents
            if idx % 50 == 0:
                conn.commit()

        except Exception as e:
            print(f"  Error processing doc {doc['id']}: {str(e)[:100]}")
            continue

    conn.commit()
    conn.close()

    print(f"\n✓ Extracted {total_events} events from {total_docs} documents")

    return total_events

def get_timeline_summary():
    """Get summary of extracted events"""
    conn = get_db()
    c = conn.cursor()

    # Count by event type
    c.execute('''SELECT event_type, COUNT(*) as count
                 FROM events
                 GROUP BY event_type
                 ORDER BY count DESC''')

    print("\nEvent Types:")
    for row in c.fetchall():
        print(f"  {row['event_type']}: {row['count']}")

    # Count by severity
    c.execute('''SELECT severity, COUNT(*) as count
                 FROM events
                 WHERE severity > 0
                 GROUP BY severity
                 ORDER BY severity DESC''')

    print("\nSeverity Distribution:")
    for row in c.fetchall():
        print(f"  Severity {row['severity']}: {row['count']} events")

    # Top involved people
    c.execute('''SELECT people_involved, COUNT(*) as count
                 FROM events
                 WHERE people_involved != ''
                 GROUP BY people_involved
                 ORDER BY count DESC
                 LIMIT 20''')

    print("\nMost Mentioned People:")
    for row in c.fetchall():
        if row['people_involved']:
            print(f"  {row['people_involved']}: {row['count']} events")

    conn.close()

def main():
    init_events_table()
    extract_events_from_all_documents()
    get_timeline_summary()

    print("\n" + "="*70)
    print("✓ Event timeline extraction complete!")
    print("\nView the timeline in the web interface:")
    print("  http://localhost:5001/timeline")
    print("="*70)

if __name__ == '__main__':
    main()
