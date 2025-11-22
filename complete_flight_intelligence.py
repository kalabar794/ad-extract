#!/usr/bin/env python3
"""
Complete Flight Intelligence System
Analyzes flight documents in database.db for investigative intelligence
"""

import sqlite3
import re
from collections import defaultdict, Counter
from datetime import datetime
import json

def get_db():
    """Get database connection"""
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# ============================================================================
# CORE INTELLIGENCE FUNCTIONS
# ============================================================================

def find_minor_travel_alerts():
    """
    Identify flights with minors - CRITICAL for investigation
    Returns detailed alerts about minor passengers
    """
    conn = get_db()
    c = conn.cursor()

    # First check if we have structured flight data
    c.execute('SELECT COUNT(*) as count FROM flights')
    flight_count = c.fetchone()['count']

    alerts = []

    if flight_count > 0:
        # Use structured flight data
        c.execute('''SELECT f.id, f.date, f.tail_number, f.origin, f.destination,
                            fp.passenger_name, fp.age,
                            GROUP_CONCAT(fp2.passenger_name, ', ') as adult_passengers,
                            d.filename
                     FROM flights f
                     JOIN flight_passengers fp ON f.id = fp.flight_id
                     LEFT JOIN flight_passengers fp2 ON f.id = fp2.flight_id
                        AND fp2.is_minor = 0 AND fp2.passenger_name != fp.passenger_name
                     LEFT JOIN documents d ON f.source_doc_id = d.id
                     WHERE fp.is_minor = 1
                     GROUP BY f.id, fp.passenger_name
                     ORDER BY f.date''')

        for row in c.fetchall():
            alerts.append({
                'flight_id': row['id'],
                'date': row['date'],
                'tail_number': row['tail_number'],
                'route': f"{row['origin']} → {row['destination']}" if row['origin'] and row['destination'] else 'Unknown',
                'minor_name': row['passenger_name'],
                'minor_age': row['age'],
                'adult_passengers': row['adult_passengers'] if row['adult_passengers'] else 'None recorded',
                'source_file': row['filename'],
                'severity': 'CRITICAL' if row['age'] and row['age'] < 16 else 'HIGH'
            })

    # Also check unstructured documents for minor indicators
    c.execute('''SELECT d.id, d.filename, d.content, d.uploaded_date
                 FROM documents d
                 WHERE (d.filename LIKE '%flight%' OR d.content LIKE '%flight%' OR d.content LIKE '%manifest%')
                 AND d.file_type = 'txt'
                 LIMIT 500''')

    docs = c.fetchall()

    minor_keywords = [
        'minor', 'child', 'girl', 'boy', 'underage', 'young', 'teenager',
        'age 14', 'age 15', 'age 16', 'age 17', '14 year', '15 year', '16 year', '17 year',
        'daughter', 'unaccompanied', 'juvenile'
    ]

    for doc in docs:
        content_lower = doc['content'].lower()

        # Check for minor indicators
        found_indicators = [kw for kw in minor_keywords if kw in content_lower]

        if found_indicators:
            # Extract dates
            dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', doc['content'])

            # Extract entities
            c.execute('''SELECT e.name, e.entity_type
                         FROM entities e
                         JOIN entity_mentions em ON e.id = em.entity_id
                         WHERE em.doc_id = ? AND e.entity_type = 'person'
                         ORDER BY e.mention_count DESC
                         LIMIT 10''', (doc['id'],))

            people = [row['name'] for row in c.fetchall()]

            # Extract routes
            routes = re.findall(r'(?:to|from|arrived|departed)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
                              doc['content'][:2000])

            # Check if already in alerts
            already_added = any(alert.get('source_file') == doc['filename'] for alert in alerts)

            if not already_added:
                alerts.append({
                    'doc_id': doc['id'],
                    'date': dates[0] if dates else 'Unknown',
                    'source_file': doc['filename'],
                    'indicators': found_indicators[:5],
                    'people_mentioned': people[:5],
                    'routes': list(set(routes))[:5] if routes else [],
                    'excerpt': doc['content'][:400],
                    'severity': 'CRITICAL' if any(x in found_indicators for x in ['minor', 'underage', 'child']) else 'HIGH'
                })

    conn.close()
    return alerts


def get_passenger_history(name):
    """
    Get all flights for a specific person
    Returns comprehensive travel history
    """
    conn = get_db()
    c = conn.cursor()

    history = {
        'passenger_name': name,
        'flights': [],
        'total_flights': 0,
        'destinations': [],
        'frequent_companions': [],
        'date_range': None
    }

    # Check structured flight data
    c.execute('''SELECT f.id, f.date, f.tail_number, f.origin, f.destination,
                        fp.age, fp.is_minor,
                        GROUP_CONCAT(fp2.passenger_name, ', ') as co_passengers,
                        d.filename
                 FROM flights f
                 JOIN flight_passengers fp ON f.id = fp.flight_id
                 LEFT JOIN flight_passengers fp2 ON f.id = fp2.flight_id
                    AND fp2.passenger_name != fp.passenger_name
                 LEFT JOIN documents d ON f.source_doc_id = d.id
                 WHERE fp.passenger_name LIKE ?
                 GROUP BY f.id
                 ORDER BY f.date''',
             (f'%{name}%',))

    structured_flights = c.fetchall()

    for row in structured_flights:
        history['flights'].append({
            'flight_id': row['id'],
            'date': row['date'],
            'tail_number': row['tail_number'],
            'route': f"{row['origin']} → {row['destination']}" if row['origin'] and row['destination'] else 'Unknown',
            'origin': row['origin'],
            'destination': row['destination'],
            'age_at_time': row['age'],
            'was_minor': bool(row['is_minor']),
            'co_passengers': row['co_passengers'].split(', ') if row['co_passengers'] else [],
            'source_file': row['filename']
        })

        if row['destination']:
            history['destinations'].append(row['destination'])

    # Also check unstructured documents
    c.execute('''SELECT d.id, d.filename, d.content, d.uploaded_date
                 FROM documents d
                 JOIN entity_mentions em ON d.id = em.doc_id
                 JOIN entities e ON em.entity_id = e.id
                 WHERE e.name LIKE ?
                 AND (d.filename LIKE '%flight%' OR d.content LIKE '%flight%' OR d.content LIKE '%flew%')
                 ORDER BY d.uploaded_date DESC
                 LIMIT 100''',
             (f'%{name}%',))

    docs = c.fetchall()

    for doc in docs:
        # Extract dates
        dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', doc['content'])

        # Extract routes
        routes = re.findall(r'(?:to|from|departed|arrived)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
                          doc['content'][:2000])

        # Get co-passengers
        c.execute('''SELECT e.name
                     FROM entities e
                     JOIN entity_mentions em ON e.id = em.entity_id
                     WHERE em.doc_id = ? AND e.entity_type = 'person' AND e.name NOT LIKE ?
                     ORDER BY e.mention_count DESC
                     LIMIT 5''',
                 (doc['id'], f'%{name}%'))

        co_passengers = [row['name'] for row in c.fetchall()]

        # Only add if not already in structured flights
        already_added = any(f.get('source_file') == doc['filename'] for f in history['flights'])

        if not already_added:
            history['flights'].append({
                'doc_id': doc['id'],
                'source_file': doc['filename'],
                'dates': list(set(dates))[:3],
                'routes': list(set(routes))[:5],
                'co_passengers': co_passengers,
                'excerpt': doc['content'][:300]
            })

            history['destinations'].extend(routes)

    # Calculate statistics
    history['total_flights'] = len(history['flights'])

    if history['destinations']:
        dest_counter = Counter(history['destinations'])
        history['top_destinations'] = [{'location': loc, 'count': cnt}
                                       for loc, cnt in dest_counter.most_common(5)]

    # Get frequent companions
    all_companions = []
    for flight in history['flights']:
        all_companions.extend(flight.get('co_passengers', []))

    if all_companions:
        companion_counter = Counter(all_companions)
        history['frequent_companions'] = [{'name': name, 'flights_together': cnt}
                                         for name, cnt in companion_counter.most_common(10)]

    conn.close()
    return history


def get_frequent_flyers(min_flights=5):
    """
    Get people with most flights - identifies key network players
    """
    conn = get_db()
    c = conn.cursor()

    flyers = []

    # Check structured flight data
    c.execute('''SELECT passenger_name, COUNT(*) as flight_count,
                        MIN(age) as age_if_known,
                        SUM(is_minor) as minor_flights
                 FROM flight_passengers
                 GROUP BY passenger_name
                 HAVING flight_count >= ?
                 ORDER BY flight_count DESC''',
             (min_flights,))

    structured_flyers = {row['passenger_name']: {
        'name': row['passenger_name'],
        'flight_count': row['flight_count'],
        'age_known': row['age_if_known'],
        'minor_flights': row['minor_flights'],
        'source': 'structured_data'
    } for row in c.fetchall()}

    # Also check unstructured documents
    c.execute('''SELECT e.name, COUNT(DISTINCT d.id) as doc_count, e.mention_count
                 FROM entities e
                 JOIN entity_mentions em ON e.id = em.entity_id
                 JOIN documents d ON em.doc_id = d.id
                 WHERE e.entity_type = 'person'
                 AND (d.filename LIKE '%flight%' OR d.content LIKE '%flight%' OR d.content LIKE '%flew%')
                 GROUP BY e.id
                 HAVING doc_count >= ?
                 ORDER BY doc_count DESC''',
             (min_flights,))

    doc_flyers = c.fetchall()

    # Merge data
    for row in doc_flyers:
        name = row['name']
        if name in structured_flyers:
            structured_flyers[name]['doc_mentions'] = row['doc_count']
        else:
            structured_flyers[name] = {
                'name': name,
                'flight_count': row['doc_count'],
                'doc_mentions': row['doc_count'],
                'source': 'document_analysis'
            }

    # Get top destinations for each
    for name, data in structured_flyers.items():
        c.execute('''SELECT destination, COUNT(*) as count
                     FROM flights f
                     JOIN flight_passengers fp ON f.id = fp.flight_id
                     WHERE fp.passenger_name = ? AND f.destination IS NOT NULL
                     GROUP BY destination
                     ORDER BY count DESC
                     LIMIT 5''',
                 (name,))

        destinations = [{'location': row['destination'], 'count': row['count']}
                       for row in c.fetchall()]
        data['top_destinations'] = destinations

        # Determine significance
        flight_count = data['flight_count']
        data['significance'] = 'CRITICAL' if flight_count > 20 else 'HIGH' if flight_count > 10 else 'MODERATE'

        flyers.append(data)

    # Sort by flight count
    flyers.sort(key=lambda x: x['flight_count'], reverse=True)

    conn.close()
    return flyers


def build_cotravel_network(passenger_name=None, min_flights=2):
    """
    Build network of who flew with whom - reveals relationships
    """
    conn = get_db()
    c = conn.cursor()

    network = {
        'nodes': [],
        'edges': [],
        'statistics': {}
    }

    # Check if we have structured flight data
    c.execute('SELECT COUNT(*) as count FROM flights')
    if c.fetchone()['count'] == 0:
        # No structured flights, build from document co-occurrence
        print("Building network from document co-occurrence (no structured flight data)...")

        # Get flight documents
        c.execute('''SELECT id FROM documents
                     WHERE filename LIKE '%flight%' OR content LIKE '%flight%' OR content LIKE '%flew%'
                     LIMIT 200''')

        flight_docs = [row['id'] for row in c.fetchall()]

        # Build co-travel network from document co-occurrence
        cooccur = defaultdict(lambda: defaultdict(int))

        for doc_id in flight_docs:
            c.execute('''SELECT e.name
                         FROM entities e
                         JOIN entity_mentions em ON e.id = em.entity_id
                         WHERE em.doc_id = ? AND e.entity_type = 'person'
                         ORDER BY e.mention_count DESC
                         LIMIT 15''', (doc_id,))

            people = [row['name'] for row in c.fetchall()]

            for i, person1 in enumerate(people):
                for person2 in people[i+1:]:
                    cooccur[person1][person2] += 1
                    cooccur[person2][person1] += 1

        # Convert to network format
        nodes_set = set()
        edges = []
        processed = set()

        for person1, partners in cooccur.items():
            for person2, count in partners.items():
                pair = tuple(sorted([person1, person2]))
                if pair not in processed and count >= min_flights:
                    nodes_set.add(person1)
                    nodes_set.add(person2)
                    edges.append({
                        'from': person1,
                        'to': person2,
                        'flights_together': count,
                        'significance': 'CRITICAL' if count > 10 else 'HIGH' if count > 5 else 'MODERATE'
                    })
                    processed.add(pair)

        # Filter by passenger name if specified
        if passenger_name:
            edges = [e for e in edges if passenger_name.lower() in e['from'].lower() or
                    passenger_name.lower() in e['to'].lower()]
            nodes_set = set()
            for e in edges:
                nodes_set.add(e['from'])
                nodes_set.add(e['to'])

        # Build nodes
        for node_name in nodes_set:
            network['nodes'].append({
                'id': node_name,
                'name': node_name,
                'total_flights': 0  # Unknown from documents
            })

        network['edges'] = sorted(edges, key=lambda x: x['flights_together'], reverse=True)[:100]

    else:
        # Use structured flight data
        # Calculate cotravel if not already done
        c.execute('SELECT COUNT(*) as count FROM passenger_cotravel')
        if c.fetchone()['count'] == 0:
            conn.close()
            # Need to calculate cotravel
            print("Calculating cotravel network...")
            calculate_cotravel_from_data()
            # Reconnect
            conn = get_db()
            c = conn.cursor()

        # Get cotravel data
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

        cotravel_data = c.fetchall()

        # Build nodes and edges
        nodes_set = set()
        edges = []

        for row in cotravel_data:
            p1 = row['passenger1']
            p2 = row['passenger2']
            count = row['flight_count']

            nodes_set.add(p1)
            nodes_set.add(p2)

            edges.append({
                'from': p1,
                'to': p2,
                'flights_together': count,
                'significance': 'CRITICAL' if count > 10 else 'HIGH' if count > 5 else 'MODERATE'
            })

        # Convert nodes to list with details
        for node_name in nodes_set:
            # Get flight count for this person
            c.execute('''SELECT COUNT(*) as count FROM flight_passengers WHERE passenger_name = ?''',
                     (node_name,))
            flight_count = c.fetchone()['count']

            network['nodes'].append({
                'id': node_name,
                'name': node_name,
                'total_flights': flight_count
            })

        network['edges'] = edges

    network['statistics'] = {
        'total_people': len(network['nodes']),
        'total_connections': len(network['edges']),
        'most_connected': max(network['edges'], key=lambda x: x['flights_together']) if network['edges'] else None
    }

    conn.close()
    return network


def analyze_suspicious_routes():
    """
    Analyze trips to Epstein-related locations
    Key locations: Little St. James, Palm Beach, Manhattan, New Mexico
    """
    conn = get_db()
    c = conn.cursor()

    suspicious_locations = [
        'Little St. James', 'Little Saint James', 'St. James', 'LSJ',
        'Palm Beach', 'West Palm Beach',
        'Manhattan', 'New York', 'NYC', 'Teterboro',
        'New Mexico', 'Santa Fe', 'Zorro Ranch'
    ]

    results = {
        'little_st_james': [],
        'palm_beach': [],
        'manhattan': [],
        'new_mexico': [],
        'summary': {}
    }

    # Check structured flight data
    for location in suspicious_locations:
        c.execute('''SELECT f.id, f.date, f.tail_number, f.origin, f.destination,
                            GROUP_CONCAT(fp.passenger_name, ', ') as passengers,
                            d.filename
                     FROM flights f
                     LEFT JOIN flight_passengers fp ON f.id = fp.flight_id
                     LEFT JOIN documents d ON f.source_doc_id = d.id
                     WHERE f.origin LIKE ? OR f.destination LIKE ?
                     GROUP BY f.id
                     ORDER BY f.date''',
                 (f'%{location}%', f'%{location}%'))

        location_flights = []
        for row in c.fetchall():
            flight_data = {
                'flight_id': row['id'],
                'date': row['date'],
                'tail_number': row['tail_number'],
                'route': f"{row['origin']} → {row['destination']}",
                'passengers': row['passengers'].split(', ') if row['passengers'] else [],
                'source_file': row['filename']
            }
            location_flights.append(flight_data)

        # Categorize by location type
        if location.lower() in ['little st. james', 'little saint james', 'st. james', 'lsj']:
            results['little_st_james'].extend(location_flights)
        elif location.lower() in ['palm beach', 'west palm beach']:
            results['palm_beach'].extend(location_flights)
        elif location.lower() in ['manhattan', 'new york', 'nyc', 'teterboro']:
            results['manhattan'].extend(location_flights)
        elif location.lower() in ['new mexico', 'santa fe', 'zorro ranch']:
            results['new_mexico'].extend(location_flights)

    # Also check unstructured documents
    for location in suspicious_locations:
        c.execute('''SELECT d.id, d.filename, d.content
                     FROM documents d
                     WHERE (d.filename LIKE '%flight%' OR d.content LIKE '%flight%')
                     AND d.content LIKE ?
                     LIMIT 100''',
                 (f'%{location}%',))

        docs = c.fetchall()

        for doc in docs:
            # Extract dates
            dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', doc['content'])

            # Extract people
            c.execute('''SELECT e.name
                         FROM entities e
                         JOIN entity_mentions em ON e.id = em.entity_id
                         WHERE em.doc_id = ? AND e.entity_type = 'person'
                         ORDER BY e.mention_count DESC
                         LIMIT 10''',
                     (doc['id'],))

            people = [row['name'] for row in c.fetchall()]

            doc_data = {
                'doc_id': doc['id'],
                'source_file': doc['filename'],
                'location_mentioned': location,
                'dates': dates[:3] if dates else [],
                'people': people,
                'excerpt': doc['content'][:400]
            }

            # Categorize
            if location.lower() in ['little st. james', 'little saint james', 'st. james', 'lsj']:
                if not any(f.get('doc_id') == doc['id'] for f in results['little_st_james']):
                    results['little_st_james'].append(doc_data)
            elif location.lower() in ['palm beach', 'west palm beach']:
                if not any(f.get('doc_id') == doc['id'] for f in results['palm_beach']):
                    results['palm_beach'].append(doc_data)
            elif location.lower() in ['manhattan', 'new york', 'nyc', 'teterboro']:
                if not any(f.get('doc_id') == doc['id'] for f in results['manhattan']):
                    results['manhattan'].append(doc_data)
            elif location.lower() in ['new mexico', 'santa fe', 'zorro ranch']:
                if not any(f.get('doc_id') == doc['id'] for f in results['new_mexico']):
                    results['new_mexico'].append(doc_data)

    # Generate summary
    results['summary'] = {
        'little_st_james_count': len(results['little_st_james']),
        'palm_beach_count': len(results['palm_beach']),
        'manhattan_count': len(results['manhattan']),
        'new_mexico_count': len(results['new_mexico']),
        'total_suspicious_routes': (len(results['little_st_james']) +
                                   len(results['palm_beach']) +
                                   len(results['manhattan']) +
                                   len(results['new_mexico']))
    }

    conn.close()
    return results


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_cotravel_from_data():
    """Calculate passenger cotravel relationships"""
    try:
        conn = get_db()
        c = conn.cursor()

        # Clear existing
        c.execute('DELETE FROM passenger_cotravel')

        # Get all flights with passengers
        c.execute('''SELECT f.id as flight_id,
                            GROUP_CONCAT(fp.passenger_name, '|') as passengers
                     FROM flights f
                     JOIN flight_passengers fp ON f.id = fp.flight_id
                     GROUP BY f.id''')

        flights = c.fetchall()

        cotravel = defaultdict(lambda: {'count': 0, 'flights': []})

        for flight in flights:
            if not flight['passengers']:
                continue

            passengers = flight['passengers'].split('|')
            flight_id = flight['flight_id']

            # Find all pairs
            for i, p1 in enumerate(passengers):
                for p2 in passengers[i+1:]:
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
        return len(cotravel)

    except Exception as e:
        print(f"Error calculating cotravel: {e}")
        return 0
    finally:
        if conn:
            conn.close()


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == '__main__':
    print("=" * 80)
    print("COMPLETE FLIGHT INTELLIGENCE SYSTEM")
    print("=" * 80)

    # 1. Minor Travel Alerts
    print("\n1. MINOR TRAVEL ALERTS")
    print("-" * 80)
    minor_alerts = find_minor_travel_alerts()
    print(f"Found {len(minor_alerts)} minor travel alerts\n")

    for alert in minor_alerts[:5]:
        print(f"{alert.get('severity', 'HIGH')}: {alert.get('source_file', 'Unknown')}")
        if 'minor_name' in alert:
            print(f"  Minor: {alert['minor_name']} (age {alert['minor_age']})")
        if 'date' in alert:
            print(f"  Date: {alert['date']}")
        if 'route' in alert:
            print(f"  Route: {alert['route']}")
        if 'people_mentioned' in alert and alert['people_mentioned']:
            print(f"  People: {', '.join(alert['people_mentioned'][:3])}")
        print()

    # 2. Frequent Flyers
    print("\n2. TOP 10 FREQUENT FLYERS")
    print("-" * 80)
    flyers = get_frequent_flyers(min_flights=3)

    for i, flyer in enumerate(flyers[:10], 1):
        print(f"{i}. {flyer['name']} - {flyer['flight_count']} flights ({flyer.get('significance', 'MODERATE')})")
        if flyer.get('top_destinations'):
            dests = ', '.join([d['location'] for d in flyer['top_destinations'][:3]])
            print(f"   Top destinations: {dests}")

    # 3. Co-travel Network
    print("\n\n3. MOST COMMON CO-TRAVEL PAIRS")
    print("-" * 80)
    network = build_cotravel_network(min_flights=2)

    top_pairs = sorted(network['edges'], key=lambda x: x['flights_together'], reverse=True)[:10]
    for i, pair in enumerate(top_pairs, 1):
        print(f"{i}. {pair['from']} ↔ {pair['to']}")
        print(f"   {pair['flights_together']} flights together ({pair['significance']})")

    # 4. Suspicious Routes
    print("\n\n4. FLIGHTS TO EPSTEIN LOCATIONS")
    print("-" * 80)
    routes = analyze_suspicious_routes()

    print(f"\nLittle St. James: {routes['summary']['little_st_james_count']} flights/mentions")
    for flight in routes['little_st_james'][:3]:
        if 'flight_id' in flight:
            print(f"  {flight.get('date', 'Unknown')} - {flight.get('route', 'Unknown')}")
            if flight.get('passengers'):
                print(f"    Passengers: {', '.join(flight['passengers'][:5])}")

    print(f"\nPalm Beach: {routes['summary']['palm_beach_count']} flights/mentions")
    for flight in routes['palm_beach'][:3]:
        if 'flight_id' in flight:
            print(f"  {flight.get('date', 'Unknown')} - {flight.get('route', 'Unknown')}")

    print(f"\nManhattan/NYC: {routes['summary']['manhattan_count']} flights/mentions")
    print(f"New Mexico: {routes['summary']['new_mexico_count']} flights/mentions")

    print("\n" + "=" * 80)
    print("INTELLIGENCE SUMMARY COMPLETE")
    print("=" * 80)
