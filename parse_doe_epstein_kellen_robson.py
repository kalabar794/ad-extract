#!/usr/bin/env python3
"""
Parse Jane Doe v. Epstein, Robson, Kellen Case
Southern District of Florida Case No. 08-80804-CIV-MARRA/JOHNSON
Court opinion and order regarding remand to state court
"""

import sqlite3
import re

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def parse_doe_epstein_case():
    """Parse Jane Doe v Epstein/Kellen/Robson court document"""

    conn = get_db()
    c = conn.cursor()

    # Get the document
    c.execute("SELECT id, content FROM documents WHERE filename = 'USCOURTS-flsd-9_08-cv-80804-0.pdf'")
    doc = c.fetchone()

    if not doc:
        print("❌ USCOURTS document not found!")
        return

    content = doc['content']
    doc_id = doc['id']

    print(f"\n{'='*70}")
    print(f"⚖️  JANE DOE v. EPSTEIN, KELLEN, ROBSON")
    print(f"{'='*70}")

    # Extract case info
    case_match = re.search(r'NO\.\s+(\d{2}-\d{5})-CIV', content)
    if case_match:
        print(f"\n📋 Case Number: {case_match.group(1)}-CIV-MARRA/JOHNSON")

    court_match = re.search(r'(SOUTHERN DISTRICT OF FLORIDA)', content)
    if court_match:
        print(f"🏛️  Court: U.S. District Court, {court_match.group(1).title()}")

    # Extract filing date
    filing_match = re.search(r'filed.*?on\s+(\w+\s+\d{1,2},\s+\d{4})', content, re.IGNORECASE)
    if filing_match:
        print(f"📅 Filed: {filing_match.group(1)}")

    # Extract parties
    print(f"\n👤 Parties:")
    print(f"  Plaintiff: Jane Doe, a/k/a Jane Doe No. 1")
    print(f"  Defendants:")

    defendants = [
        ('Jeffrey Epstein', 'Primary defendant - Sexual assault'),
        ('Haley Robson', 'Recruiter'),
        ('Sarah Kellen', 'Co-conspirator'),
    ]

    for defendant_name, role in defendants:
        if defendant_name in content:
            print(f"    • {defendant_name} ({role})")

    # Extract claims
    print(f"\n⚖️  Legal Claims:")
    claims = [
        (r'sexual assault', 'Sexual Assault against Epstein'),
        (r'civil conspiracy', 'Civil Conspiracy'),
        (r'intentional infliction of emotional distress', 'Intentional Infliction of Emotional Distress'),
        (r'Florida Statute Section 772\.103', 'Civil Remedy under FL Statute 772.103'),
    ]

    for pattern, claim_name in claims:
        if re.search(pattern, content, re.IGNORECASE):
            print(f"  • {claim_name}")

    # Extract key facts
    print(f"\n📌 Key Allegations:")

    # Victim age
    age_match = re.search(r'Plaintiff, then (\d+) years old', content)
    if age_match:
        print(f"  • Victim age at time of assault: {age_match.group(1)} years old")

    # Year
    year_match = re.search(r'In or about (\d{4})', content)
    if year_match:
        print(f"  • Incidents occurred: {year_match.group(1)}")

    # Recruitment scheme
    if 'recruited girls ostensibly to give a wealthy man a massage' in content:
        print(f"  • Recruitment method: Under guise of giving 'massage for monetary compensation'")

    if 'economically disadvantaged' in content:
        print(f"  • Target victims: Economically disadvantaged underage girls")

    # Location
    location_match = re.search(r'(Loxahatchee|Palm Beach)', content)
    if location_match:
        print(f"  • Location: Palm Beach mansion, victims from Loxahatchee area")

    # Modus operandi
    print(f"\n🔍 Modus Operandi Described:")

    mo_elements = [
        (r'Robson.*contacted.*before.*Epstein was at his Palm Beach residence', 'Robson contacted when Epstein at Palm Beach residence'),
        (r'directed Robson to bring one or more underage girls', 'Robson directed to bring underage girls to residence'),
        (r'Kellen.*gathered.*personal information', 'Kellen collected victims\' personal information'),
        (r'gave them money', 'Victims paid money after assaults'),
    ]

    for pattern, description in mo_elements:
        if re.search(pattern, content, re.IGNORECASE):
            print(f"  • {description}")

    # Extract court action
    print(f"\n📋 Court Action:")
    if 'Motion to Remand' in content:
        print(f"  • Document Type: Opinion and Order Remanding Case to State Court")
    if 'Palm Beach County, Florida' in content:
        print(f"  • Original Filing: Circuit Court, Palm Beach County, Florida")

    # Extract entities and add to database
    entities_added = 0

    all_entities = [
        ('Jane Doe No. 1', 'PERSON', 'Plaintiff - 14-year-old victim (2005)'),
        ('Jeffrey Epstein', 'PERSON', 'Defendant - Sexual assault'),
        ('Haley Robson', 'PERSON', 'Defendant - Recruiter of underage girls'),
        ('Sarah Kellen', 'PERSON', 'Defendant - Co-conspirator, collected victim info'),
        ('Palm Beach County', 'LOCATION', 'Original jurisdiction'),
        ('Loxahatchee', 'LOCATION', 'Area where victims recruited'),
    ]

    for entity_name, entity_type, context in all_entities:
        try:
            c.execute('''
                INSERT OR IGNORE INTO entities (name, type, source_doc_id, context)
                VALUES (?, ?, ?, ?)
            ''', (entity_name, entity_type, doc_id, context))
            entities_added += c.rowcount
        except:
            pass

    conn.commit()
    conn.close()

    print(f"\n✅ Entities extracted: {entities_added}")
    print(f"✅ Document integrated into database")

if __name__ == '__main__':
    print("="*70)
    print("DOE v. EPSTEIN/KELLEN/ROBSON PARSER")
    print("="*70)

    parse_doe_epstein_case()

    print(f"\n{'='*70}")
    print("✅ PARSING COMPLETE")
    print(f"{'='*70}")
