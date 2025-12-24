"""
Flight Log Analysis System
Parses flight manifests, builds passenger networks, detects suspicious patterns
"""

import sqlite3
import re
from datetime import datetime
from collections import defaultdict, Counter
import json

# Noise patterns and entries to filter out during parsing
NOISE_PATTERNS = [
    r'^Is [A-Z]',  # "Is Read", "Is Invitation"
    r'^On [A-Z][a-z]{2}',  # "On Mon", "On Fri", "On Sep"
    r'^The ',
    r'^Subject:',
    r'^From:',
    r'^To:',
    r'^Date:',
    r'@',  # Email addresses
    r'http',
    r'www\.',
    r'^\d{4}$',  # Just years
    r'^\d{1,2}/\d{1,2}',  # Dates
]

NOISE_ENTRIES = {
    # Locations
    'New York', 'United States', 'Palm Beach', 'Hong Kong', 'White House',
    'Los Angeles', 'San Francisco', 'Washington', 'London', 'Paris',
    'Miami', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx',
    'West Palm Beach', 'West Bank', 'East Coast', 'West Coast',
    'New Mexico', 'Santa Fe', 'Virgin Islands', 'Middle East',
    'New York City', 'Saudi Arabia', 'Tel Aviv', 'United Kingdom',

    # Organizations
    'Merrill Lynch', 'Merrill Lynch Global Research', 'New York Times',
    'Wall Street Journal', 'Washington Post', 'CNN', 'BBC', 'Reuters',
    'Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Citigroup',
    'General Partner', 'Managing Partner', 'Senior Partner',
    'Justice Department', 'Investment Strategy Group', 'Financial Reporter',
    'Advisory Committee', 'Prime Minister', 'Supreme Court',

    # Generic names/placeholders
    'Jane Doe', 'John Doe', 'Unknown', 'Unidentified', 'Anonymous',

    # Document/email artifacts
    'Is Read', 'Is Invitation', 'Is Attachment', 'Is Email',
    'Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook',
}

def is_valid_passenger_name(name):
    """Check if a name is likely a real passenger (not noise)"""
    if not name or len(name.strip()) <= 2:
        return False

    # Check regex patterns
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, name, re.IGNORECASE):
            return False

    # Check exact matches (case insensitive)
    if name in NOISE_ENTRIES or name.lower() in {n.lower() for n in NOISE_ENTRIES}:
        return False

    # Remove entries that are all caps and more than 2 words (likely headers)
    if name.isupper() and len(name.split()) > 2:
        return False

    return True

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_flight_tables():
    """Initialize database tables for flight log data"""
    conn = get_db()
    c = conn.cursor()

    # Flights table
    c.execute('''CREATE TABLE IF NOT EXISTS flights
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  date TEXT NOT NULL,
                  tail_number TEXT,
                  origin TEXT,
                  destination TEXT,
                  source_doc_id INTEGER,
                  raw_text TEXT,
                  FOREIGN KEY (source_doc_id) REFERENCES documents(id))''')

    # Passengers table
    c.execute('''CREATE TABLE IF NOT EXISTS flight_passengers
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  flight_id INTEGER NOT NULL,
                  passenger_name TEXT NOT NULL,
                  age INTEGER,
                  is_minor BOOLEAN DEFAULT 0,
                  role TEXT,
                  notes TEXT,
                  FOREIGN KEY (flight_id) REFERENCES flights(id))''')

    # Flight routes (for visualization)
    c.execute('''CREATE TABLE IF NOT EXISTS flight_routes
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  route_name TEXT UNIQUE,
                  origin TEXT,
                  destination TEXT,
                  flight_count INTEGER DEFAULT 1,
                  first_flight_date TEXT,
                  last_flight_date TEXT)''')

    # Passenger network (who flew with whom)
    c.execute('''CREATE TABLE IF NOT EXISTS passenger_cotravel
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  passenger1 TEXT NOT NULL,
                  passenger2 TEXT NOT NULL,
                  flight_count INTEGER DEFAULT 1,
                  flights TEXT,
                  UNIQUE(passenger1, passenger2))''')

    conn.commit()
    conn.close()
    print("✓ Flight log tables initialized")

def parse_flight_manifest_text(text):
    """
    Parse flight manifest from text

    Expected formats:
    - Date: MM/DD/YYYY or Month DD, YYYY
    - Tail Number: N###XX
    - Route: ORIGIN to DESTINATION or ORIGIN → DESTINATION
    - Passengers: List of names
    """

    flights = []

    # Pattern for dates
    date_patterns = [
        r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',
        r'\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b'
    ]

    # Pattern for tail numbers (N followed by numbers/letters)
    tail_pattern = r'\b(N\d{3,5}[A-Z]{0,2})\b'

    # Pattern for routes
    route_patterns = [
        r'(?:from\s+)?([A-Z]{3,}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:to|→)\s+([A-Z]{3,}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'([A-Z]{3})\s*[-–—]\s*([A-Z]{3})'  # Airport codes
    ]

    # Split into potential flight entries
    lines = text.split('\n')

    current_flight = {}
    passenger_names = []

    for line in lines:
        line = line.strip()
        if not line:
            if current_flight and passenger_names:
                current_flight['passengers'] = passenger_names
                flights.append(current_flight)
                current_flight = {}
                passenger_names = []
            continue

        # Try to find date
        for pattern in date_patterns:
            date_match = re.search(pattern, line, re.IGNORECASE)
            if date_match:
                current_flight['date'] = date_match.group(1)
                break

        # Try to find tail number
        tail_match = re.search(tail_pattern, line)
        if tail_match:
            current_flight['tail_number'] = tail_match.group(1)

        # Try to find route
        for pattern in route_patterns:
            route_match = re.search(pattern, line, re.IGNORECASE)
            if route_match:
                current_flight['origin'] = route_match.group(1).strip()
                current_flight['destination'] = route_match.group(2).strip()
                break

        # If line looks like a name (2+ words, capitalized), could be passenger
        name_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\b'
        name_matches = re.findall(name_pattern, line)
        for name in name_matches:
            if len(name.split()) >= 2 and is_valid_passenger_name(name):  # At least first and last name, and not noise
                # Check for age indicators
                age_match = re.search(r'\((\d{1,2})\)', line)
                age = int(age_match.group(1)) if age_match else None
                passenger_names.append({'name': name, 'age': age})

    # Add last flight if exists
    if current_flight and passenger_names:
        current_flight['passengers'] = passenger_names
        flights.append(current_flight)

    return flights

def import_flight_log_document(doc_id):
    """Import flight log data from a document"""
    conn = get_db()
    c = conn.cursor()

    # Get document content
    c.execute('SELECT content, filename FROM documents WHERE id = ?', (doc_id,))
    doc = c.fetchone()

    if not doc:
        conn.close()
        return {'error': 'Document not found'}

    content = doc['content']
    filename = doc['filename']

    print(f"\nParsing flight logs from: {filename}")

    # Parse flights
    flights = parse_flight_manifest_text(content)

    if not flights:
        print(f"  No flight data found in document")
        conn.close()
        return {'flights': 0, 'passengers': 0}

    flights_added = 0
    passengers_added = 0

    for flight in flights:
        # Insert flight
        c.execute('''INSERT INTO flights (date, tail_number, origin, destination, source_doc_id, raw_text)
                     VALUES (?, ?, ?, ?, ?, ?)''',
                 (flight.get('date'), flight.get('tail_number'),
                  flight.get('origin'), flight.get('destination'),
                  doc_id, str(flight)))

        flight_id = c.lastrowid
        flights_added += 1

        # Insert passengers
        for passenger in flight.get('passengers', []):
            is_minor = passenger.get('age') and passenger['age'] < 18

            c.execute('''INSERT INTO flight_passengers
                         (flight_id, passenger_name, age, is_minor)
                         VALUES (?, ?, ?, ?)''',
                     (flight_id, passenger['name'], passenger.get('age'), is_minor))
            passengers_added += 1

        # Update route statistics
        if flight.get('origin') and flight.get('destination'):
            route_name = f"{flight['origin']} → {flight['destination']}"
            c.execute('''INSERT INTO flight_routes
                         (route_name, origin, destination, flight_count, first_flight_date, last_flight_date)
                         VALUES (?, ?, ?, 1, ?, ?)
                         ON CONFLICT(route_name) DO UPDATE SET
                         flight_count = flight_count + 1,
                         last_flight_date = excluded.last_flight_date''',
                     (route_name, flight['origin'], flight['destination'],
                      flight.get('date'), flight.get('date')))

    conn.commit()
    conn.close()

    print(f"  ✓ Imported {flights_added} flights, {passengers_added} passengers")

    return {'flights': flights_added, 'passengers': passengers_added}

def calculate_passenger_cotravel():
    """Calculate who flew with whom"""
    conn = get_db()
    c = conn.cursor()

    print("\nCalculating passenger co-travel networks...")

    # Clear existing data
    c.execute('DELETE FROM passenger_cotravel')

    # Get all flights with passengers
    c.execute('''SELECT f.id as flight_id, f.date, f.origin, f.destination,
                        GROUP_CONCAT(fp.passenger_name, '|') as passengers
                 FROM flights f
                 JOIN flight_passengers fp ON f.id = fp.flight_id
                 GROUP BY f.id''')

    flights = c.fetchall()

    cotravel = defaultdict(lambda: {'count': 0, 'flights': []})

    for flight in flights:
        passengers = flight['passengers'].split('|')
        flight_id = flight['flight_id']

        # Find all pairs of passengers on this flight
        for i, p1 in enumerate(passengers):
            for p2 in passengers[i+1:]:
                # Sort names to ensure consistent key
                key = tuple(sorted([p1, p2]))
                cotravel[key]['count'] += 1
                cotravel[key]['flights'].append(flight_id)

    # Insert into database
    for (p1, p2), data in cotravel.items():
        c.execute('''INSERT INTO passenger_cotravel
                     (passenger1, passenger2, flight_count, flights)
                     VALUES (?, ?, ?, ?)''',
                 (p1, p2, data['count'], json.dumps(data['flights'])))

    conn.commit()
    conn.close()

    print(f"✓ Calculated {len(cotravel)} co-travel relationships")

def get_passenger_flight_history(passenger_name):
    """Get all flights for a specific passenger"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT f.date, f.tail_number, f.origin, f.destination,
                        fp.age, fp.is_minor,
                        GROUP_CONCAT(fp2.passenger_name, ', ') as co_passengers
                 FROM flights f
                 JOIN flight_passengers fp ON f.id = fp.flight_id
                 LEFT JOIN flight_passengers fp2 ON f.id = fp2.flight_id
                    AND fp2.passenger_name != fp.passenger_name
                 WHERE fp.passenger_name LIKE ?
                 GROUP BY f.id
                 ORDER BY f.date''',
             (f'%{passenger_name}%',))

    flights = [dict(row) for row in c.fetchall()]
    conn.close()

    return flights

def get_minor_travel_alerts():
    """Find instances of minors traveling (RED FLAG DETECTOR)"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT f.id, f.date, f.origin, f.destination,
                        fp.passenger_name, fp.age,
                        GROUP_CONCAT(fp2.passenger_name, ', ') as adult_passengers
                 FROM flights f
                 JOIN flight_passengers fp ON f.id = fp.flight_id
                 LEFT JOIN flight_passengers fp2 ON f.id = fp2.flight_id
                    AND fp2.is_minor = 0 AND fp2.passenger_name != fp.passenger_name
                 WHERE fp.is_minor = 1
                 GROUP BY f.id, fp.passenger_name
                 ORDER BY f.date''')

    alerts = [dict(row) for row in c.fetchall()]
    conn.close()

    return alerts

def get_frequent_flyers(min_flights=5):
    """Get passengers with most flights"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT passenger_name, COUNT(*) as flight_count,
                        MIN(age) as age_if_known,
                        SUM(is_minor) as minor_flights
                 FROM flight_passengers
                 GROUP BY passenger_name
                 HAVING flight_count >= ?
                 ORDER BY flight_count DESC''',
             (min_flights,))

    flyers = [dict(row) for row in c.fetchall()]
    conn.close()

    return flyers

def get_cotravel_network(passenger_name=None, min_flights=2):
    """Get who flew with whom"""
    conn = get_db()
    c = conn.cursor()

    if passenger_name:
        c.execute('''SELECT passenger1, passenger2, flight_count, flights
                     FROM passenger_cotravel
                     WHERE (passenger1 LIKE ? OR passenger2 LIKE ?)
                     AND flight_count >= ?
                     ORDER BY flight_count DESC''',
                 (f'%{passenger_name}%', f'%{passenger_name}%', min_flights))
    else:
        c.execute('''SELECT passenger1, passenger2, flight_count, flights
                     FROM passenger_cotravel
                     WHERE flight_count >= ?
                     ORDER BY flight_count DESC
                     LIMIT 100''',
                 (min_flights,))

    network = [dict(row) for row in c.fetchall()]
    conn.close()

    return network

def get_flight_statistics():
    """Get overall flight statistics"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    c.execute('SELECT COUNT(*) as count FROM flights')
    stats['total_flights'] = c.fetchone()['count']

    c.execute('SELECT COUNT(DISTINCT passenger_name) as count FROM flight_passengers')
    stats['unique_passengers'] = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM flight_passengers WHERE is_minor = 1')
    stats['minor_passengers'] = c.fetchone()['count']

    c.execute('SELECT COUNT(DISTINCT route_name) as count FROM flight_routes')
    stats['unique_routes'] = c.fetchone()['count']

    c.execute('''SELECT route_name, flight_count
                 FROM flight_routes
                 ORDER BY flight_count DESC
                 LIMIT 10''')
    stats['top_routes'] = [dict(row) for row in c.fetchall()]

    conn.close()

    return stats

if __name__ == '__main__':
    print("="*70)
    print("FLIGHT LOG ANALYSIS SYSTEM")
    print("="*70)

    # Initialize tables
    init_flight_tables()

    print("\nTo use this system:")
    print("1. Upload flight log PDFs to the main app")
    print("2. Run: python3 -c 'from flight_log_analyzer import import_flight_log_document; import_flight_log_document(DOC_ID)'")
    print("3. Run: python3 -c 'from flight_log_analyzer import calculate_passenger_cotravel; calculate_passenger_cotravel()'")
    print("4. Access analysis via web interface")

    # Show current stats
    stats = get_flight_statistics()
    print(f"\nCurrent Statistics:")
    print(f"  Total flights: {stats['total_flights']}")
    print(f"  Unique passengers: {stats['unique_passengers']}")
    print(f"  Minor passengers: {stats['minor_passengers']}")
    print(f"  Unique routes: {stats['unique_routes']}")
