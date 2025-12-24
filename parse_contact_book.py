#!/usr/bin/env python3
"""
Parse Epstein Contact Book
Extract names and create contacts database
"""

import sqlite3
import re

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_contacts_table():
    """Create contacts table"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS contacts
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  full_entry TEXT,
                  source_doc_id INTEGER,
                  FOREIGN KEY (source_doc_id) REFERENCES documents(id))''')

    conn.commit()
    conn.close()
    print("✓ Contacts table initialized")

def parse_contact_book():
    """Parse contact book and extract names"""

    init_contacts_table()

    conn = get_db()
    c = conn.cursor()

    # Get the contact book document
    c.execute("SELECT id, content FROM documents WHERE filename LIKE '%Contact_Book%'")
    doc = c.fetchone()

    if not doc:
        print("❌ Contact book document not found!")
        return

    content = doc['content']
    doc_id = doc['id']

    print(f"📕 Parsing contact book from document ID {doc_id}...")

    # Extract names using patterns
    contacts = []

    # Split into lines
    lines = content.split('\n')

    for line in lines:
        line = line.strip()

        # Skip empty lines, headers, and redaction notes
        if not line or '*Redactions' in line or 'contact information' in line:
            continue

        # Skip lines with only symbols/punctuation
        if re.match(r'^[^\w\s]+$', line):
            continue

        # Pattern for names: Capitalized words, possibly with &, commas
        # Examples: "Abby", "Agnew, Marie Claire & John", "Allan, Nick & Sarah"
        name_pattern = r'^([A-Z][A-Za-z\'\-\.]+(?:\s*[&,]\s*[A-Z][A-Za-z\'\-\.]+)*(?:\s+[A-Z][A-Za-z\'\-\.]+)*)'

        match = re.match(name_pattern, line)
        if match:
            name = match.group(1).strip()

            # Clean up the name
            name = re.sub(r'\s+', ' ', name)  # Normalize whitespace
            name = re.sub(r'[\.•\-]+$', '', name)  # Remove trailing punctuation

            # Skip if too short or looks like noise
            if len(name) < 2 or name.lower() in ['b', 'a', 'for', 'or']:
                continue

            contacts.append({
                'name': name,
                'full_entry': line,
                'source_doc_id': doc_id
            })

    print(f"✓ Extracted {len(contacts)} contacts")

    # Insert into database
    inserted = 0
    for contact in contacts:
        try:
            c.execute('''
                INSERT INTO contacts (name, full_entry, source_doc_id)
                VALUES (?, ?, ?)
            ''', (contact['name'], contact['full_entry'], contact['source_doc_id']))
            inserted += 1
        except Exception as e:
            print(f"⚠️  Error inserting {contact['name']}: {e}")

    conn.commit()
    conn.close()

    print(f"\n{'='*60}")
    print(f"✅ CONTACT BOOK PROCESSED")
    print(f"{'='*60}")
    print(f"Contacts inserted: {inserted}")

    # Show sample contacts
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT name FROM contacts ORDER BY name LIMIT 20')

    print(f"\n📋 Sample contacts:")
    for row in c.fetchall():
        print(f"  • {row['name']}")

    conn.close()

if __name__ == '__main__':
    parse_contact_book()
