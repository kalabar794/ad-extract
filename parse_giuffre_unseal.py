#!/usr/bin/env python3
"""
Parse Giuffre v Maxwell Unsealed Document
Virginia Giuffre's response to Maxwell's motion for summary judgment
Case No.: 15-cv-07433-RWS
"""

import sqlite3
import re
from collections import defaultdict

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def parse_giuffre_unsealed():
    """Parse Virginia Giuffre v Ghislaine Maxwell unsealed filing"""

    conn = get_db()
    c = conn.cursor()

    # Get the document
    c.execute("SELECT id, content FROM documents WHERE filename = 'Giuffre-unseal.pdf'")
    doc = c.fetchone()

    if not doc:
        print("❌ Giuffre document not found!")
        return

    content = doc['content']
    doc_id = doc['id']

    print(f"\n{'='*70}")
    print(f"⚖️  GIUFFRE v. MAXWELL UNSEALED FILING")
    print(f"{'='*70}")

    # Extract case info
    case_match = re.search(r'Case No[.:]?\s*(\S+)', content)
    if case_match:
        print(f"\n📋 Case Number: {case_match.group(1)}")

    # Extract parties
    print(f"\n👤 Parties:")
    print(f"  Plaintiff: Virginia L. Giuffre")
    print(f"  Defendant: Ghislaine Maxwell")

    # Extract document type
    doc_type_match = re.search(r"PLAINTIFF'?S'? RESPONSE TO (.+)", content)
    if doc_type_match:
        print(f"\n📄 Document Type: Plaintiff's Response to {doc_type_match.group(1)}")

    # Extract witness testimonies mentioned
    print(f"\n👥 Key Witnesses Referenced:")

    witnesses = [
        (r'Joanna Sjoberg', 'Testified about being lured from school'),
        (r'Tony Figueroa', 'Testified about bringing underage girls'),
        (r'Rinaldo Rizzo', 'Testified about passport seizure of 15-year-old'),
        (r'Lyn Miller', 'Testified about Maxwell becoming Giuffre\'s "new mama"'),
        (r'Detective Joseph Recarey', 'Investigated Maxwell in Epstein case'),
        (r'Juan Alessi', 'Epstein household staff'),
        (r'Ron Eppinger', 'Pilot'),
        (r'David Rodgers', 'Pilot'),
    ]

    found_witnesses = []
    for witness_pattern, description in witnesses:
        if re.search(witness_pattern, content, re.IGNORECASE):
            witness_name = re.search(witness_pattern, content, re.IGNORECASE).group(0)
            found_witnesses.append((witness_name, description))
            print(f"  • {witness_name}: {description}")

    # Extract allegations
    print(f"\n📌 Key Allegations Against Maxwell:")

    allegations = [
        r'procurer of underage girls',
        r'sex trafficking',
        r'recruited.*underage girls',
        r'took.*passport',
        r'threatened',
        r'lured.*from.*school',
        r'threesomes',
    ]

    for allegation_pattern in allegations:
        matches = re.findall(f'(.{{0,100}}{allegation_pattern}.{{0,100}})', content, re.IGNORECASE)
        if matches:
            # Get first match and clean it up
            match_text = matches[0].strip()
            # Remove line breaks and extra spaces
            match_text = re.sub(r'\s+', ' ', match_text)
            if len(match_text) > 120:
                match_text = match_text[:117] + "..."
            print(f"  • {match_text}")

    # Extract named individuals (potential trafficking victims/witnesses)
    print(f"\n👥 Named Individuals:")

    # Look for specific name patterns in context
    individual_patterns = [
        r'Virginia (?:L\. )?Giuffre',
        r'Ghislaine Maxwell',
        r'Jeffrey (?:E\. )?Epstein',
        r'Prince Andrew',
        r'Alan Dershowitz',
        r'Bill Richardson',
        r'Jean[- ]Luc Brunel',
    ]

    found_individuals = set()
    for pattern in individual_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            # Normalize the name
            name = matches[0]
            found_individuals.add(name)

    for individual in sorted(found_individuals):
        print(f"  • {individual}")

    # Extract entities and add to database
    entities_added = 0

    all_entities = [
        ('Virginia L. Giuffre', 'PERSON', 'Plaintiff - Trafficking victim'),
        ('Ghislaine Maxwell', 'PERSON', 'Defendant - Alleged procurer'),
        ('Jeffrey E. Epstein', 'PERSON', 'Convicted pedophile'),
    ]

    # Add witnesses
    for witness_name, description in found_witnesses:
        all_entities.append((witness_name, 'PERSON', f'Witness - {description}'))

    # Add named individuals
    for individual in found_individuals:
        if individual not in [e[0] for e in all_entities]:
            all_entities.append((individual, 'PERSON', 'Named in Giuffre v Maxwell'))

    for entity_name, entity_type, context in all_entities:
        try:
            c.execute('''
                INSERT OR IGNORE INTO entities (name, type, source_doc_id, context)
                VALUES (?, ?, ?, ?)
            ''', (entity_name, entity_type, doc_id, context))
            entities_added += c.rowcount
        except:
            pass

    # Extract locations mentioned
    print(f"\n📍 Locations Referenced:")

    location_patterns = [
        r'Palm Beach',
        r'New York',
        r'London',
        r'Paris',
        r'New Mexico',
        r'Virgin Islands',
        r'Little St\. James',
        r'Florida',
    ]

    found_locations = set()
    for pattern in location_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            found_locations.add(pattern.replace(r'\.', '.'))

    for location in sorted(found_locations):
        print(f"  • {location}")

    conn.commit()
    conn.close()

    print(f"\n✅ Entities extracted: {entities_added}")
    print(f"✅ Document integrated into database")

if __name__ == '__main__':
    print("="*70)
    print("GIUFFRE UNSEALED DOCUMENT PARSER")
    print("="*70)

    parse_giuffre_unsealed()

    print(f"\n{'='*70}")
    print("✅ PARSING COMPLETE")
    print(f"{'='*70}")
