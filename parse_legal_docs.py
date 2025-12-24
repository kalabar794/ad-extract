#!/usr/bin/env python3
"""
Parse Legal Documents - BILLS and Complaints
Extract key information from:
1. BILLS-119hr4405enr.pdf - Epstein Files Transparency Act
2. doe-trump-complaint-3.pdf - Doe v Trump/Epstein complaint
"""

import sqlite3
import re
from datetime import datetime

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def parse_epstein_transparency_act():
    """Parse H.R. 4405 - Epstein Files Transparency Act"""

    conn = get_db()
    c = conn.cursor()

    # Get the document
    c.execute("SELECT id, content FROM documents WHERE filename = 'BILLS-119hr4405enr.pdf'")
    doc = c.fetchone()

    if not doc:
        print("❌ BILLS document not found!")
        return

    content = doc['content']
    doc_id = doc['id']

    print(f"\n{'='*70}")
    print(f"⚖️  EPSTEIN FILES TRANSPARENCY ACT (H.R. 4405)")
    print(f"{'='*70}")

    # Extract key provisions
    provisions = []

    # Short title
    if 'Epstein Files Transparency Act' in content:
        provisions.append("✓ Official Title: 'Epstein Files Transparency Act'")

    # Deadline
    deadline_match = re.search(r'Not later than (\d+) days', content)
    if deadline_match:
        provisions.append(f"✓ Release Deadline: {deadline_match.group(1)} days after enactment")

    # Format requirements
    if 'searchable and downloadable' in content:
        provisions.append("✓ Format: Searchable and downloadable")

    # Scope - what must be released
    print("\n📋 Required Disclosures:")
    scopes = [
        (r'Jeffrey Epstein including all investigations', 'All Epstein investigations, prosecutions, custodial matters'),
        (r'Ghislaine Maxwell', 'All Ghislaine Maxwell records'),
        (r'Flight logs or travel records', 'Flight logs, manifests, pilot records, customs docs'),
        (r'Individuals.*government officials', 'Government officials connected to Epstein'),
        (r'immunity deals.*non-prosecution agreements', 'Immunity deals, plea bargains, sealed settlements'),
        (r'Internal DOJ communications', 'Internal DOJ emails, memos, briefings'),
    ]

    for pattern, description in scopes:
        if re.search(pattern, content, re.IGNORECASE):
            print(f"  • {description}")

    print(f"\n📅 Key Provisions:")
    for provision in provisions:
        print(f"  {provision}")

    # Extract entities and add to database
    entities_added = 0

    # Key entities mentioned
    key_entities = [
        ('Jeffrey Epstein', 'PERSON'),
        ('Ghislaine Maxwell', 'PERSON'),
        ('Attorney General', 'ROLE'),
        ('Department of Justice', 'ORGANIZATION'),
        ('Federal Bureau of Investigation', 'ORGANIZATION'),
    ]

    for entity_name, entity_type in key_entities:
        if entity_name in content:
            try:
                c.execute('''
                    INSERT OR IGNORE INTO entities (name, type, source_doc_id, context)
                    VALUES (?, ?, ?, ?)
                ''', (entity_name, entity_type, doc_id, f'Epstein Files Transparency Act - {entity_type}'))
                entities_added += c.rowcount
            except:
                pass

    conn.commit()
    conn.close()

    print(f"\n✅ Entities extracted: {entities_added}")

def parse_doe_trump_complaint():
    """Parse Jane Doe v Trump & Epstein complaint"""

    conn = get_db()
    c = conn.cursor()

    # Get the document
    c.execute("SELECT id, content FROM documents WHERE filename = 'doe-trump-complaint-3.pdf'")
    doc = c.fetchone()

    if not doc:
        print("❌ Complaint document not found!")
        return

    content = doc['content']
    doc_id = doc['id']

    print(f"\n{'='*70}")
    print(f"⚖️  JANE DOE v. TRUMP & EPSTEIN COMPLAINT")
    print(f"{'='*70}")

    # Extract case info
    case_match = re.search(r'Case No[.:]?\s*(\S+)', content)
    if case_match:
        print(f"\n📋 Case Number: {case_match.group(1)}")

    # Extract filing date
    filing_dates = re.findall(r'(?:Filed|September)\s+(\d{1,2})/(\d{1,2})/(\d{2,4})', content)
    if filing_dates:
        print(f"📅 Filing Date: {filing_dates[-1][0]}/{filing_dates[-1][1]}/{filing_dates[-1][2]}")

    # Extract legal claims
    print(f"\n⚖️  Legal Claims:")
    claims = [
        'RAPE',
        'SEXUAL MISCONDUCT',
        'CRIMINAL SEXUAL ACTS',
        'SEXUAL ABUSE',
        'FORCIBLE TOUCHING',
        'ASSAULT',
        'BATTERY',
        'INTENTIONAL.*INFLICTION OF EMOTIONAL DISTRESS',
        'RECKLESS INFLICTION OF EMOTIONAL DISTRESS',
        'DURESS',
        'FALSE IMPRISONMENT',
        'DEFAMATION'
    ]

    for claim in claims:
        if re.search(claim, content, re.IGNORECASE):
            clean_claim = claim.replace('.*', ' ').title()
            print(f"  • {clean_claim}")

    # Extract key facts/allegations
    print(f"\n📌 Key Allegations:")

    # Look for age references
    age_refs = re.findall(r'(\d{2})\s*(?:years old|year old)', content)
    if age_refs:
        print(f"  • Plaintiff age: {age_refs[0]} years old")

    # Look for location references
    locations = re.findall(r'(?:in|at)\s+(New York|Manhattan|Palm Beach|Florida|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', content)
    unique_locations = list(set(locations))[:5]
    if unique_locations:
        print(f"  • Locations: {', '.join(unique_locations)}")

    # Extract defendants
    print(f"\n👤 Defendants:")
    defendants = [
        ('Donald J. Trump', 'PERSON'),
        ('Jeffrey E. Epstein', 'PERSON'),
    ]

    for defendant, _ in defendants:
        if defendant in content:
            print(f"  • {defendant}")

    # Extract entities and add to database
    entities_added = 0

    all_entities = defendants + [
        ('Jane Doe', 'PERSON'),
        ('Southern District of New York', 'ORGANIZATION'),
    ]

    for entity_name, entity_type in all_entities:
        if entity_name in content:
            try:
                c.execute('''
                    INSERT OR IGNORE INTO entities (name, type, source_doc_id, context)
                    VALUES (?, ?, ?, ?)
                ''', (entity_name, entity_type, doc_id, f'Doe v Trump/Epstein Complaint - {entity_type}'))
                entities_added += c.rowcount
            except:
                pass

    conn.commit()
    conn.close()

    print(f"\n✅ Entities extracted: {entities_added}")

if __name__ == '__main__':
    print("="*70)
    print("LEGAL DOCUMENTS PARSER")
    print("="*70)

    parse_epstein_transparency_act()
    parse_doe_trump_complaint()

    print(f"\n{'='*70}")
    print("✅ PARSING COMPLETE")
    print(f"{'='*70}")
