#!/usr/bin/env python3
"""
Test script for the Contradiction Detection Engine
Creates sample contradictory statements and tests the detection
"""

import sqlite3
from contradiction_detector import (
    init_contradiction_tables,
    extract_claims_from_text,
    save_claim,
    detect_contradictions_for_claim,
    save_contradiction,
    get_all_contradictions,
    get_contradiction_stats
)

def setup_test_database():
    """Create a test database with sample documents"""
    conn = sqlite3.connect('database.db')
    c = conn.cursor()

    # Create documents table if not exists
    c.execute('''CREATE TABLE IF NOT EXISTS documents
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  filename TEXT NOT NULL,
                  filepath TEXT NOT NULL,
                  file_type TEXT NOT NULL,
                  content TEXT,
                  uploaded_date TEXT NOT NULL,
                  metadata TEXT)''')

    # Create entities table if not exists
    c.execute('''CREATE TABLE IF NOT EXISTS entities
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE NOT NULL,
                  entity_type TEXT NOT NULL,
                  mention_count INTEGER DEFAULT 1)''')

    conn.commit()
    conn.close()

def create_test_documents():
    """Create test documents with contradictory content"""
    conn = sqlite3.connect('database.db')
    c = conn.cursor()

    test_documents = [
        {
            'filename': 'deposition_john_doe.txt',
            'content': '''
            I met Jeffrey Epstein in June 2001 at his mansion in Manhattan.
            We discussed a business deal worth $100,000.
            I never visited his island in the Caribbean.
            I was in New York on July 4, 2001.
            I have no knowledge of any illegal activities.
            ''',
            'speaker': 'John Doe'
        },
        {
            'filename': 'deposition_john_doe_second.txt',
            'content': '''
            I don't recall ever meeting Jeffrey Epstein.
            The transaction was for $500,000, not a smaller amount.
            I visited Little St. James island twice in 2001.
            On July 4, 2001, I was in Paris with my family.
            I witnessed several concerning activities at his properties.
            ''',
            'speaker': 'John Doe'
        },
        {
            'filename': 'flight_log_analysis.txt',
            'content': '''
            Flight records show John Doe traveled to St. Thomas on June 15, 2001.
            The passenger manifest lists him on three separate flights to the Virgin Islands.
            All flights were aboard Epstein's private aircraft.
            ''',
            'speaker': 'Investigator'
        },
        {
            'filename': 'financial_records.txt',
            'content': '''
            Wire transfer records show a payment of $250,000 from Epstein to John Doe's account.
            The transaction date was June 10, 2001.
            The memo line states "consulting services".
            ''',
            'speaker': 'Bank Records'
        }
    ]

    doc_ids = []
    for doc in test_documents:
        c.execute('''INSERT INTO documents (filename, filepath, file_type, content, uploaded_date)
                     VALUES (?, ?, ?, ?, datetime('now'))''',
                  (doc['filename'], '/test/' + doc['filename'], 'txt', doc['content']))
        doc_ids.append({'id': c.lastrowid, 'speaker': doc['speaker']})

    conn.commit()
    conn.close()

    return doc_ids

def run_test():
    """Run the contradiction detection test"""
    print("="*70)
    print("CONTRADICTION DETECTION ENGINE - TEST")
    print("="*70)

    # Setup
    print("\n1. Setting up test environment...")
    setup_test_database()
    init_contradiction_tables()
    print("   ✓ Database tables initialized")

    # Create test documents
    print("\n2. Creating test documents with contradictory statements...")
    doc_ids = create_test_documents()
    print(f"   ✓ Created {len(doc_ids)} test documents")

    # Extract claims and detect contradictions
    print("\n3. Extracting claims and detecting contradictions...")
    total_claims = 0
    total_contradictions = 0

    for doc in doc_ids:
        print(f"\n   Processing document ID {doc['id']} (Speaker: {doc['speaker']})...")

        # Get document content
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        c.execute('SELECT content FROM documents WHERE id = ?', (doc['id'],))
        content = c.fetchone()[0]
        conn.close()

        # Extract claims
        claims = extract_claims_from_text(content, doc['id'], doc['speaker'])
        print(f"   - Extracted {len(claims)} claims")

        # Save claims and detect contradictions
        for claim in claims:
            claim_id = save_claim(claim, doc['id'])
            total_claims += 1

            # Detect contradictions for this claim
            contradictions = detect_contradictions_for_claim(claim_id)
            for contradiction in contradictions:
                save_contradiction(contradiction)
                total_contradictions += 1

    print(f"\n   ✓ Total claims extracted: {total_claims}")
    print(f"   ✓ Total contradictions detected: {total_contradictions}")

    # Display results
    print("\n4. Contradiction Detection Results:")
    print("-"*70)

    stats = get_contradiction_stats()
    print(f"\n   Summary:")
    print(f"   - Total contradictions: {stats['total_contradictions']}")
    print(f"   - High confidence: {stats['high_confidence_contradictions']}")
    print(f"   - By severity: {stats.get('by_severity', {})}")
    print(f"   - By type: {stats.get('by_type', {})}")

    # Show top contradictions
    print("\n5. Top Contradictions Found:")
    print("-"*70)

    contradictions = get_all_contradictions(min_confidence=0.5)

    for i, c in enumerate(contradictions[:5], 1):  # Show top 5
        print(f"\n   Contradiction #{i}:")
        print(f"   Type: {c['contradiction_type'].upper()}")
        print(f"   Severity: {c['severity'].upper()}")
        print(f"   Confidence: {c['confidence_score']:.2%}")
        print(f"\n   Claim 1 ({c.get('speaker1', 'Unknown')}):")
        print(f"   \"{c['claim1_text']}\"")
        print(f"   Source: {c.get('doc1_filename', 'Unknown')}")
        print(f"\n   Claim 2 ({c.get('speaker2', 'Unknown')}):")
        print(f"   \"{c['claim2_text']}\"")
        print(f"   Source: {c.get('doc2_filename', 'Unknown')}")
        print(f"\n   Analysis: {c['explanation']}")
        print("   " + "-"*66)

    print("\n" + "="*70)
    print("TEST COMPLETE!")
    print("="*70)
    print("\nTo view all contradictions, visit:")
    print("http://localhost:5001/contradictions")
    print("\n")

if __name__ == '__main__':
    try:
        run_test()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
