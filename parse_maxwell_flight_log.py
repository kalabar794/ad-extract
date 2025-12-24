#!/usr/bin/env python3
"""
Parse Maxwell Trial Flight Log
This is a scanned/handwritten document, so extraction will be limited
"""

import sqlite3
import re
from datetime import datetime

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def parse_maxwell_flight_log():
    """Parse the Maxwell trial flight log (handwritten scans)"""

    conn = get_db()
    c = conn.cursor()

    # Get the document
    c.execute("SELECT id, content FROM documents WHERE id = 29040")
    doc = c.fetchone()

    if not doc:
        print("❌ Flight log document not found!")
        return

    content = doc['content']
    doc_id = doc['id']

    print(f"✈️  Parsing Maxwell trial flight log from document ID {doc_id}...")
    print(f"⚠️  Note: This is a scanned/handwritten document, extraction may be limited")

    flights_added = 0
    passengers_added = 0

    # Look for date patterns and airport codes
    lines = content.split('\n')

    current_flight_data = {}

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Look for dates (various formats)
        date_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line)

        # Look for airport codes (3-4 letter codes)
        airport_codes = re.findall(r'\b([A-Z]{3,4})\b', line)

        # Look for tail numbers
        tail_match = re.search(r'(N\d{3,5}[A-Z]{0,2})', line)

        # Look for names (capitalized words, 2+ parts)
        name_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b'
        names = re.findall(name_pattern, line)

        if date_match:
            # If we have a previous flight with data, save it
            if current_flight_data.get('date') and current_flight_data.get('passengers'):
                try:
                    c.execute('''
                        INSERT INTO flights (date, tail_number, origin, destination, source_doc_id, raw_text)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        current_flight_data['date'],
                        current_flight_data.get('tail_number', 'Unknown'),
                        current_flight_data.get('origin', 'UNK'),
                        current_flight_data.get('destination', 'UNK'),
                        doc_id,
                        line[:200]
                    ))

                    flight_id = c.lastrowid
                    flights_added += 1

                    # Add passengers
                    for passenger in current_flight_data['passengers']:
                        c.execute('''
                            INSERT INTO flight_passengers (flight_id, passenger_name)
                            VALUES (?, ?)
                        ''', (flight_id, passenger))
                        passengers_added += 1

                except Exception as e:
                    pass

            # Start new flight
            current_flight_data = {
                'date': date_match.group(1),
                'passengers': []
            }

        if tail_match and current_flight_data:
            current_flight_data['tail_number'] = tail_match.group(1)

        if len(airport_codes) >= 2 and current_flight_data:
            current_flight_data['origin'] = airport_codes[0]
            current_flight_data['destination'] = airport_codes[1]

        # Add names as potential passengers
        for name in names:
            if current_flight_data and len(name.split()) >= 2:
                # Skip common non-passenger words
                if name not in ['United States', 'New York', 'Palm Beach']:
                    if 'passengers' in current_flight_data:
                        current_flight_data['passengers'].append(name)

    conn.commit()
    conn.close()

    print(f"\n{'='*60}")
    print(f"✅ MAXWELL FLIGHT LOG PROCESSED")
    print(f"{'='*60}")
    print(f"Additional flights extracted: {flights_added}")
    print(f"Additional passengers extracted: {passengers_added}")
    print(f"\n⚠️  Note: Handwritten scan quality limits extraction accuracy")

if __name__ == '__main__':
    parse_maxwell_flight_log()
