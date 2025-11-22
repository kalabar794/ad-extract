#!/usr/bin/env python3
"""
Flight Intelligence System - Extract Real Insights from Flight Documents
Not useless crap - ACTUAL investigative intelligence
"""

import sqlite3
import re
from collections import defaultdict, Counter
from datetime import datetime

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def extract_passenger_from_context(text, keywords=['passenger', 'flew', 'aboard', 'traveling with']):
    """Extract passenger names from flight context"""
    passengers = []

    # Look for patterns like "Clinton flew" or "with Maxwell"
    patterns = [
        r'(\w+\s+\w+)\s+(?:flew|traveled|aboard)',
        r'with\s+(\w+\s+\w+)',
        r'passenger[s]?:\s*([^\.]+)',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        passengers.extend(matches)

    return list(set(passengers))

def analyze_minor_travel():
    """
    CRITICAL: Find minors traveling without parents
    Real investigative intelligence
    """
    conn = get_db()
    c = conn.cursor()

    # Get flight documents
    c.execute('''
        SELECT id, filename, content
        FROM documents
        WHERE filename LIKE '%flight%' OR filename LIKE '%manifest%' OR content LIKE '%flight%'
        LIMIT 500
    ''')

    docs = c.fetchall()

    minor_alerts = []
    minor_keywords = [
        'minor', 'child', 'girl', 'boy', 'underage', 'young', 'teenager',
        'age 14', 'age 15', 'age 16', 'age 17', '14 year', '15 year', '16 year', '17 year',
        'daughter', 'unaccompanied'
    ]

    for doc in docs:
        content = doc['content'].lower()

        # Check for minor indicators
        found_indicators = [kw for kw in minor_keywords if kw in content]

        if found_indicators:
            # Extract dates
            dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', doc['content'])

            # Extract entities from this document
            c.execute('''
                SELECT e.name, e.entity_type
                FROM entities e
                JOIN entity_mentions em ON e.id = em.entity_id
                WHERE em.doc_id = ? AND e.entity_type = 'person'
                ORDER BY e.mention_count DESC
                LIMIT 10
            ''', (doc['id'],))

            people = [row['name'] for row in c.fetchall()]

            # Extract routes
            routes = re.findall(r'(?:to|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', doc['content'][:2000])

            minor_alerts.append({
                'doc_id': doc['id'],
                'filename': doc['filename'],
                'date': dates[0] if dates else 'Unknown',
                'indicators': found_indicators,
                'people_mentioned': people,
                'routes': list(set(routes))[:5],
                'excerpt': doc['content'][:500],
                'severity': 'CRITICAL' if any(x in found_indicators for x in ['minor', 'underage', 'child']) else 'HIGH'
            })

    return minor_alerts

def get_passenger_history(person_name=None):
    """
    Track all flights for a specific person
    Real passenger tracking intelligence
    """
    conn = get_db()
    c = conn.cursor()

    if person_name:
        # Get specific person's flights
        c.execute('''
            SELECT d.id, d.filename, d.content, e.mention_count
            FROM documents d
            JOIN entity_mentions em ON d.id = em.doc_id
            JOIN entities e ON em.entity_id = e.id
            WHERE e.name = ?
            AND (d.filename LIKE '%flight%' OR d.content LIKE '%flight%' OR d.content LIKE '%flew%')
            ORDER BY d.uploaded_date DESC
            LIMIT 100
        ''', (person_name,))

        docs = c.fetchall()

        flights = []
        for doc in docs:
            # Extract dates
            dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', doc['content'])

            # Extract routes
            routes = re.findall(r'(?:to|from|departed|arrived)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', doc['content'][:2000])

            # Get co-passengers
            c.execute('''
                SELECT e.name
                FROM entities e
                JOIN entity_mentions em ON e.id = em.entity_id
                WHERE em.doc_id = ? AND e.entity_type = 'person' AND e.name != ?
                ORDER BY e.mention_count DESC
                LIMIT 5
            ''', (doc['id'], person_name))

            co_passengers = [row['name'] for row in c.fetchall()]

            flights.append({
                'doc_id': doc['id'],
                'filename': doc['filename'],
                'dates': list(set(dates))[:5],
                'routes': list(set(routes))[:5],
                'co_passengers': co_passengers,
                'excerpt': doc['content'][:300]
            })

        return {
            'person': person_name,
            'total_flight_docs': len(flights),
            'flights': flights
        }

    else:
        # Get all people with flight records
        c.execute('''
            SELECT e.name, COUNT(DISTINCT d.id) as flight_count
            FROM entities e
            JOIN entity_mentions em ON e.id = em.entity_id
            JOIN documents d ON em.doc_id = d.id
            WHERE e.entity_type = 'person'
            AND (d.filename LIKE '%flight%' OR d.content LIKE '%flight%' OR d.content LIKE '%flew%')
            GROUP BY e.id
            HAVING flight_count > 3
            ORDER BY flight_count DESC
            LIMIT 50
        ''')

        return [{'name': row['name'], 'flight_count': row['flight_count']} for row in c.fetchall()]

def get_frequent_flyers(min_flights=5):
    """
    Identify key players - people with most flights
    Real network intelligence
    """
    conn = get_db()
    c = conn.cursor()

    c.execute('''
        SELECT e.name, COUNT(DISTINCT d.id) as flight_count, e.mention_count
        FROM entities e
        JOIN entity_mentions em ON e.id = em.entity_id
        JOIN documents d ON em.doc_id = d.id
        WHERE e.entity_type = 'person'
        AND (d.filename LIKE '%flight%' OR d.content LIKE '%flight%' OR d.content LIKE '%flew%' OR d.content LIKE '%plane%')
        GROUP BY e.id
        HAVING flight_count >= ?
        ORDER BY flight_count DESC
        LIMIT 30
    ''', (min_flights,))

    flyers = []
    for row in c.fetchall():
        name = row['name']
        flight_count = row['flight_count']

        # Get destinations for this person
        c.execute('''
            SELECT d.content
            FROM documents d
            JOIN entity_mentions em ON d.id = em.doc_id
            JOIN entities e ON em.entity_id = e.id
            WHERE e.name = ?
            AND (d.filename LIKE '%flight%' OR d.content LIKE '%flight%')
            LIMIT 20
        ''', (name,))

        all_content = ' '.join([row['content'][:1000] for row in c.fetchall()])
        routes = re.findall(r'(?:to|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', all_content)
        route_freq = Counter(routes)
        top_routes = route_freq.most_common(3)

        flyers.append({
            'name': name,
            'flight_count': flight_count,
            'top_destinations': [r[0] for r in top_routes],
            'significance': 'CRITICAL' if flight_count > 20 else 'HIGH' if flight_count > 10 else 'MODERATE'
        })

    return flyers

def get_cotravel_network():
    """
    Who flew with whom - build passenger networks
    Real network mapping intelligence
    """
    conn = get_db()
    c = conn.cursor()

    # Get flight documents
    c.execute('''
        SELECT id FROM documents
        WHERE filename LIKE '%flight%' OR content LIKE '%flight%' OR content LIKE '%flew%'
        LIMIT 200
    ''')

    flight_docs = [row['id'] for row in c.fetchall()]

    # Build co-travel network
    network = defaultdict(lambda: defaultdict(int))

    for doc_id in flight_docs:
        # Get all people in this flight document
        c.execute('''
            SELECT e.name
            FROM entities e
            JOIN entity_mentions em ON e.id = em.entity_id
            WHERE em.doc_id = ? AND e.entity_type = 'person'
            ORDER BY e.mention_count DESC
            LIMIT 15
        ''', (doc_id,))

        people = [row['name'] for row in c.fetchall()]

        # Create co-travel connections
        for i, person1 in enumerate(people):
            for person2 in people[i+1:]:
                network[person1][person2] += 1
                network[person2][person1] += 1

    # Convert to list format
    connections = []
    processed = set()

    for person1, partners in network.items():
        for person2, count in partners.items():
            pair = tuple(sorted([person1, person2]))
            if pair not in processed and count >= 3:
                connections.append({
                    'person1': person1,
                    'person2': person2,
                    'co_flights': count,
                    'significance': 'CRITICAL' if count > 10 else 'HIGH' if count > 5 else 'MODERATE'
                })
                processed.add(pair)

    # Sort by co-flight count
    connections.sort(key=lambda x: x['co_flights'], reverse=True)

    return connections[:50]

if __name__ == '__main__':
    print("="*70)
    print("FLIGHT INTELLIGENCE SYSTEM - REAL INVESTIGATIVE DATA")
    print("="*70)

    # 1. Minor Travel Alerts
    print("\n🚨 MINOR TRAVEL ALERTS")
    print("="*70)
    minor_alerts = analyze_minor_travel()
    print(f"Found {len(minor_alerts)} alerts")
    for alert in minor_alerts[:5]:
        print(f"\n{alert['severity']}: {alert['filename']}")
        print(f"  Date: {alert['date']}")
        print(f"  Indicators: {', '.join(alert['indicators'][:3])}")
        print(f"  People: {', '.join(alert['people_mentioned'][:5])}")
        if alert['routes']:
            print(f"  Routes: {', '.join(alert['routes'])}")

    # 2. Frequent Flyers
    print("\n\n🔁 FREQUENT FLYERS - KEY PLAYERS")
    print("="*70)
    flyers = get_frequent_flyers(5)
    for flyer in flyers[:15]:
        print(f"{flyer['significance']}: {flyer['name']}")
        print(f"  {flyer['flight_count']} flight documents")
        if flyer['top_destinations']:
            print(f"  Top destinations: {', '.join(flyer['top_destinations'])}")

    # 3. Co-Travel Network
    print("\n\n🕸️ CO-TRAVEL NETWORK - WHO FLEW WITH WHOM")
    print("="*70)
    network = get_cotravel_network()
    for conn in network[:15]:
        print(f"{conn['significance']}: {conn['person1']} ↔ {conn['person2']}")
        print(f"  {conn['co_flights']} joint flights\n")

    # 4. Specific passenger history
    print("\n\n👤 PASSENGER HISTORY: Bill Clinton")
    print("="*70)
    history = get_passenger_history("Bill Clinton")
    print(f"Total flight documents: {history['total_flight_docs']}")
    for flight in history['flights'][:5]:
        print(f"\n  {flight['filename']}")
        if flight['dates']:
            print(f"    Dates: {', '.join(flight['dates'])}")
        if flight['routes']:
            print(f"    Routes: {', '.join(flight['routes'])}")
        if flight['co_passengers']:
            print(f"    With: {', '.join(flight['co_passengers'])}")
