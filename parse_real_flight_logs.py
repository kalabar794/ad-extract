#!/usr/bin/env python3
"""
Parse REAL flight logs from Epstein_Flight_Logs_Unredacted.pdf
This document contains structured CSV data with actual flight manifests
"""

import sqlite3
import csv
import io
from datetime import datetime

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def parse_and_import_real_flight_logs():
    """Parse the actual flight log CSV data"""

    conn = get_db()
    c = conn.cursor()

    # Get the flight log document
    c.execute("SELECT id, content FROM documents WHERE filename = 'Epstein_Flight_Logs_Unredacted.pdf'")
    doc = c.fetchone()

    if not doc:
        print("❌ Flight log document not found!")
        return

    content = doc['content']
    doc_id = doc['id']

    print(f"📄 Parsing flight logs from document ID {doc_id}...")

    # Parse as CSV (tab-delimited based on the content structure)
    flights_by_flight_num = {}
    passenger_count = 0

    import re

    lines = content.split('\n')
    for line in lines:
        # Skip empty lines and header repetitions
        if not line.strip() or 'Date YearAircraft' in line or line.startswith('ID'):
            continue

        try:
            # Use regex to extract date pattern MM/DD/YYYY
            date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', line)
            if not date_match:
                continue
            date_str = date_match.group(1)

            # Extract tail number (N followed by numbers/letters)
            tail_match = re.search(r'(N\d{3,5}[A-Z]{0,2})', line)
            tail_num = tail_match.group(1) if tail_match else "Unknown"

            # Extract airport codes (3-letter codes)
            airport_codes = re.findall(r'\b([A-Z]{3}|[A-Z]{2,4})\b', line)
            # Get DEP and ARR codes (should appear after tail number)
            dep_code = airport_codes[0] if len(airport_codes) > 0 else "UNK"
            arr_code = airport_codes[1] if len(airport_codes) > 1 else "UNK"

            # Extract flight number (look for numbers after route codes)
            flight_match = re.search(r'(\d{3,4})Pass', line)
            if not flight_match:
                continue
            flight_num = flight_match.group(1)

            # Extract passenger name (look for "First Last" pattern or specific known format)
            # Pattern: First name (capitalized) followed by last name, typically after Pass #
            name_pattern = r'Pass \d+.*?([A-Z][a-zﬀ]+)\s+([A-Z][a-z]+)'
            name_match = re.search(name_pattern, line)

            if not name_match:
                continue

            first_name = name_match.group(1)
            last_name = name_match.group(2)
            full_name = f"{first_name} {last_name}".strip()

            # Skip placeholder/unknown passengers
            if not full_name or '?' in full_name or full_name in ['A S', 'Female (1)', 'Male (1)', 'Nanny (1)', 'Passenger (1)']:
                continue

            # Group by flight number
            if flight_num not in flights_by_flight_num:
                flights_by_flight_num[flight_num] = {
                    'date': date_str,
                    'tail_number': tail_num,
                    'origin': dep_code,
                    'destination': arr_code,
                    'passengers': []
                }

            flights_by_flight_num[flight_num]['passengers'].append(full_name)
            passenger_count += 1

        except Exception as e:
            # Skip malformed lines
            continue

    print(f"✓ Parsed {len(flights_by_flight_num)} unique flights")
    print(f"✓ Found {passenger_count} passenger records")

    # Insert into database
    inserted_flights = 0
    inserted_passengers = 0

    for flight_num, flight_data in flights_by_flight_num.items():
        try:
            # Insert flight
            c.execute('''
                INSERT INTO flights (date, tail_number, origin, destination, source_doc_id, raw_text)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                flight_data['date'],
                flight_data['tail_number'],
                flight_data['origin'],
                flight_data['destination'],
                doc_id,
                f"Flight {flight_num}"
            ))

            flight_id = c.lastrowid
            inserted_flights += 1

            # Insert passengers
            for passenger in flight_data['passengers']:
                c.execute('''
                    INSERT INTO flight_passengers (flight_id, passenger_name)
                    VALUES (?, ?)
                ''', (flight_id, passenger))
                inserted_passengers += 1

        except Exception as e:
            print(f"⚠️  Error inserting flight {flight_num}: {e}")
            continue

    conn.commit()
    conn.close()

    print(f"\n{'='*60}")
    print(f"✅ IMPORT COMPLETE")
    print(f"{'='*60}")
    print(f"Flights inserted: {inserted_flights}")
    print(f"Passengers inserted: {inserted_passengers}")
    print(f"Average passengers per flight: {inserted_passengers / inserted_flights if inserted_flights > 0 else 0:.1f}")

    # Show top passengers
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT passenger_name, COUNT(*) as flight_count
        FROM flight_passengers
        GROUP BY passenger_name
        ORDER BY flight_count DESC
        LIMIT 15
    ''')

    print(f"\n📊 Top Passengers:")
    for row in c.fetchall():
        print(f"  {row['passenger_name']}: {row['flight_count']} flights")

    conn.close()

if __name__ == '__main__':
    parse_and_import_real_flight_logs()
