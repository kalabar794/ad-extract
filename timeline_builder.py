"""
Master Timeline Builder
Creates chronological timelines from all data sources: flights, emails, transactions, events
Enables investigators to see the complete picture of when events occurred
"""

import sqlite3
import re
from datetime import datetime
from collections import defaultdict
import json

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_timeline_tables():
    """Initialize database tables for timeline"""
    conn = get_db()
    c = conn.cursor()

    # Timeline events table (unified view of all events)
    c.execute('''CREATE TABLE IF NOT EXISTS timeline_events
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  event_date TEXT NOT NULL,
                  event_type TEXT NOT NULL,
                  event_subtype TEXT,
                  title TEXT NOT NULL,
                  description TEXT,
                  entities_involved TEXT,
                  location TEXT,
                  amount REAL,
                  is_suspicious BOOLEAN DEFAULT 0,
                  suspicion_level INTEGER DEFAULT 0,
                  source_type TEXT,
                  source_id INTEGER,
                  metadata TEXT)''')

    # Timeline clusters (groups of related events)
    c.execute('''CREATE TABLE IF NOT EXISTS timeline_clusters
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  cluster_name TEXT,
                  start_date TEXT,
                  end_date TEXT,
                  event_count INTEGER,
                  description TEXT,
                  significance TEXT,
                  event_ids TEXT)''')

    # Create index for faster date queries
    c.execute('CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(event_date)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_timeline_type ON timeline_events(event_type)')

    conn.commit()
    conn.close()
    print("✓ Timeline tables initialized")

def normalize_date(date_str):
    """Normalize various date formats to YYYY-MM-DD"""
    if not date_str:
        return None

    # Try different date formats
    formats = [
        '%Y-%m-%d',
        '%m/%d/%Y',
        '%m-%d-%Y',
        '%d/%m/%Y',
        '%B %d, %Y',
        '%b %d, %Y',
        '%Y/%m/%d',
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime('%Y-%m-%d')
        except:
            continue

    # Try to extract just the date part if there's extra text
    # Match YYYY-MM-DD
    match = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})', date_str)
    if match:
        try:
            dt = datetime.strptime(match.group(1).replace('/', '-'), '%Y-%m-%d')
            return dt.strftime('%Y-%m-%d')
        except:
            pass

    # Match MM/DD/YYYY
    match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})', date_str)
    if match:
        try:
            dt = datetime.strptime(match.group(1), '%m/%d/%Y')
            return dt.strftime('%Y-%m-%d')
        except:
            try:
                dt = datetime.strptime(match.group(1).replace('/', '-'), '%m-%d-%Y')
                return dt.strftime('%Y-%m-%d')
            except:
                pass

    return None

def import_flights_to_timeline():
    """Import flight data into timeline"""
    conn = get_db()
    c = conn.cursor()

    # Check if flights table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='flights'")
    if not c.fetchone():
        conn.close()
        return 0

    # Get all flights
    c.execute('''SELECT f.id, f.date, f.tail_number, f.origin, f.destination,
                        GROUP_CONCAT(fp.passenger_name, ', ') as passengers,
                        SUM(fp.is_minor) as minor_count
                 FROM flights f
                 LEFT JOIN flight_passengers fp ON f.id = fp.flight_id
                 GROUP BY f.id''')

    flights = c.fetchall()
    count = 0

    for flight in flights:
        normalized_date = normalize_date(flight['date'])
        if not normalized_date:
            continue

        passengers = flight['passengers'] or 'Unknown'
        has_minors = flight['minor_count'] > 0 if flight['minor_count'] else False

        title = f"Flight {flight['tail_number'] or 'Unknown'}: {flight['origin']} → {flight['destination']}"
        description = f"Passengers: {passengers}"

        c.execute('''INSERT INTO timeline_events
                     (event_date, event_type, event_subtype, title, description,
                      entities_involved, location, is_suspicious, suspicion_level,
                      source_type, source_id, metadata)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                 (normalized_date, 'travel', 'flight', title, description,
                  passengers, f"{flight['origin']}-{flight['destination']}",
                  has_minors, 3 if has_minors else 0,
                  'flight', flight['id'],
                  json.dumps({'tail_number': flight['tail_number'],
                             'minor_count': flight['minor_count']})))
        count += 1

    conn.commit()
    conn.close()
    return count

def import_emails_to_timeline():
    """Import email data into timeline"""
    conn = get_db()
    c = conn.cursor()

    # Check if emails table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='emails'")
    if not c.fetchone():
        conn.close()
        return 0

    # Get all emails
    c.execute('''SELECT id, date_sent, from_address, from_name, to_addresses,
                        subject, is_suspicious, suspicious_keywords
                 FROM emails
                 WHERE date_sent IS NOT NULL''')

    emails = c.fetchall()
    count = 0

    for email in emails:
        normalized_date = normalize_date(email['date_sent'])
        if not normalized_date:
            continue

        from_name = email['from_name'] or email['from_address']
        title = f"Email: {email['subject'] or 'No Subject'}"
        description = f"From {from_name} to {email['to_addresses'] or 'unknown'}"

        entities = f"{from_name}, {email['to_addresses']}" if email['to_addresses'] else from_name

        suspicion = 0
        if email['is_suspicious']:
            suspicion = 5

        c.execute('''INSERT INTO timeline_events
                     (event_date, event_type, event_subtype, title, description,
                      entities_involved, is_suspicious, suspicion_level,
                      source_type, source_id, metadata)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                 (normalized_date, 'communication', 'email', title, description,
                  entities, email['is_suspicious'], suspicion,
                  'email', email['id'],
                  json.dumps({'keywords': email['suspicious_keywords']})))
        count += 1

    conn.commit()
    conn.close()
    return count

def import_transactions_to_timeline():
    """Import financial transaction data into timeline"""
    conn = get_db()
    c = conn.cursor()

    # Check if transactions table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
    if not c.fetchone():
        conn.close()
        return 0

    # Get all transactions
    c.execute('''SELECT id, transaction_date, amount, currency, from_entity, to_entity,
                        payment_method, purpose, is_suspicious, red_flags
                 FROM transactions
                 WHERE transaction_date IS NOT NULL''')

    transactions = c.fetchall()
    count = 0

    for txn in transactions:
        normalized_date = normalize_date(txn['transaction_date'])
        if not normalized_date:
            continue

        from_entity = txn['from_entity'] or 'Unknown'
        to_entity = txn['to_entity'] or 'Unknown'

        title = f"Payment: ${txn['amount']:,.2f} {txn['currency']}"
        description = f"{from_entity} → {to_entity}"
        if txn['purpose']:
            description += f" ({txn['purpose']})"
        if txn['payment_method']:
            description += f" [via {txn['payment_method']}]"

        entities = f"{from_entity}, {to_entity}"

        suspicion = 0
        if txn['is_suspicious']:
            # Calculate suspicion based on amount and red flags
            if txn['amount'] >= 100000:
                suspicion = 5
            elif txn['amount'] >= 50000:
                suspicion = 4
            else:
                suspicion = 3

        c.execute('''INSERT INTO timeline_events
                     (event_date, event_type, event_subtype, title, description,
                      entities_involved, amount, is_suspicious, suspicion_level,
                      source_type, source_id, metadata)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                 (normalized_date, 'financial', 'payment', title, description,
                  entities, txn['amount'], txn['is_suspicious'], suspicion,
                  'transaction', txn['id'],
                  json.dumps({'red_flags': txn['red_flags'],
                             'payment_method': txn['payment_method']})))
        count += 1

    conn.commit()
    conn.close()
    return count

def rebuild_timeline():
    """Rebuild complete timeline from all sources"""
    conn = get_db()
    c = conn.cursor()

    print("\nRebuilding master timeline...")

    # Clear existing timeline
    c.execute('DELETE FROM timeline_events')
    c.execute('DELETE FROM timeline_clusters')

    conn.commit()
    conn.close()

    # Import from each source
    flights = import_flights_to_timeline()
    print(f"  ✓ Imported {flights} flight events")

    emails = import_emails_to_timeline()
    print(f"  ✓ Imported {emails} email events")

    transactions = import_transactions_to_timeline()
    print(f"  ✓ Imported {transactions} transaction events")

    total = flights + emails + transactions
    print(f"✓ Timeline rebuilt with {total} total events")

    return {
        'total': total,
        'flights': flights,
        'emails': emails,
        'transactions': transactions
    }

def get_timeline_events(start_date=None, end_date=None, event_type=None, min_suspicion=0):
    """Get timeline events with filters"""
    conn = get_db()
    c = conn.cursor()

    query = 'SELECT * FROM timeline_events WHERE 1=1'
    params = []

    if start_date:
        query += ' AND event_date >= ?'
        params.append(start_date)

    if end_date:
        query += ' AND event_date <= ?'
        params.append(end_date)

    if event_type:
        query += ' AND event_type = ?'
        params.append(event_type)

    if min_suspicion > 0:
        query += ' AND suspicion_level >= ?'
        params.append(min_suspicion)

    query += ' ORDER BY event_date DESC, suspicion_level DESC'

    c.execute(query, params)
    events = [dict(row) for row in c.fetchall()]

    # Parse metadata JSON
    for event in events:
        if event['metadata']:
            try:
                event['metadata'] = json.loads(event['metadata'])
            except:
                pass

    conn.close()
    return events

def detect_timeline_clusters(min_events=3, max_days_apart=7):
    """Detect clusters of related events in timeline"""
    conn = get_db()
    c = conn.cursor()

    print(f"\nDetecting timeline clusters (min {min_events} events within {max_days_apart} days)...")

    # Clear existing clusters
    c.execute('DELETE FROM timeline_clusters')

    # Get all events sorted by date
    c.execute('SELECT * FROM timeline_events ORDER BY event_date')
    events = [dict(row) for row in c.fetchall()]

    clusters = []
    current_cluster = []
    cluster_start_date = None

    for event in events:
        if not event['event_date']:
            continue

        event_date = datetime.strptime(event['event_date'], '%Y-%m-%d')

        if not current_cluster:
            current_cluster.append(event)
            cluster_start_date = event_date
        else:
            # Check if event is within max_days_apart of cluster start
            days_diff = (event_date - cluster_start_date).days

            if days_diff <= max_days_apart:
                current_cluster.append(event)
            else:
                # Save current cluster if it meets minimum
                if len(current_cluster) >= min_events:
                    clusters.append(current_cluster)

                # Start new cluster
                current_cluster = [event]
                cluster_start_date = event_date

    # Don't forget last cluster
    if len(current_cluster) >= min_events:
        clusters.append(current_cluster)

    # Save clusters to database
    clusters_created = 0
    for cluster in clusters:
        if len(cluster) < min_events:
            continue

        start = cluster[0]['event_date']
        end = cluster[-1]['event_date']

        # Generate cluster description
        event_types = Counter(e['event_type'] for e in cluster)
        type_summary = ', '.join(f"{count} {etype}" for etype, count in event_types.most_common())

        # Get all entities involved
        entities = set()
        for event in cluster:
            if event['entities_involved']:
                entities.update([e.strip() for e in event['entities_involved'].split(',')])

        # Calculate significance
        total_suspicion = sum(e['suspicion_level'] or 0 for e in cluster)
        avg_suspicion = total_suspicion / len(cluster)

        if avg_suspicion >= 4:
            significance = 'HIGH'
        elif avg_suspicion >= 2:
            significance = 'MEDIUM'
        else:
            significance = 'LOW'

        cluster_name = f"Activity Cluster: {start} to {end}"
        description = f"{type_summary} involving {', '.join(list(entities)[:5])}"

        event_ids = ','.join(str(e['id']) for e in cluster)

        c.execute('''INSERT INTO timeline_clusters
                     (cluster_name, start_date, end_date, event_count,
                      description, significance, event_ids)
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                 (cluster_name, start, end, len(cluster),
                  description, significance, event_ids))

        clusters_created += 1

    conn.commit()
    conn.close()

    print(f"✓ Detected {clusters_created} timeline clusters")
    return clusters_created

def get_timeline_statistics():
    """Get timeline statistics"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    c.execute('SELECT COUNT(*) as count FROM timeline_events')
    stats['total_events'] = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM timeline_events WHERE is_suspicious = 1')
    stats['suspicious_events'] = c.fetchone()['count']

    c.execute('SELECT event_type, COUNT(*) as count FROM timeline_events GROUP BY event_type')
    stats['by_type'] = [dict(row) for row in c.fetchall()]

    c.execute('SELECT COUNT(*) as count FROM timeline_clusters')
    stats['total_clusters'] = c.fetchone()['count']

    c.execute('SELECT MIN(event_date) as min, MAX(event_date) as max FROM timeline_events')
    row = c.fetchone()
    stats['date_range'] = {'start': row['min'], 'end': row['max']}

    conn.close()
    return stats

def get_timeline_clusters():
    """Get all detected clusters"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT * FROM timeline_clusters
                 ORDER BY significance DESC, event_count DESC''')

    clusters = [dict(row) for row in c.fetchall()]
    conn.close()

    return clusters

def search_timeline(query):
    """Search timeline events"""
    conn = get_db()
    c = conn.cursor()

    search_term = f'%{query}%'

    c.execute('''SELECT * FROM timeline_events
                 WHERE title LIKE ? OR description LIKE ? OR entities_involved LIKE ?
                 ORDER BY event_date DESC''',
             (search_term, search_term, search_term))

    events = [dict(row) for row in c.fetchall()]

    # Parse metadata
    for event in events:
        if event['metadata']:
            try:
                event['metadata'] = json.loads(event['metadata'])
            except:
                pass

    conn.close()
    return events

if __name__ == '__main__':
    print("="*70)
    print("MASTER TIMELINE BUILDER")
    print("="*70)

    # Initialize tables
    init_timeline_tables()

    print("\nTo use this system:")
    print("1. Ensure you have imported flights, emails, and transactions")
    print("2. Run: python3 -c 'from timeline_builder import rebuild_timeline; rebuild_timeline()'")
    print("3. Run: python3 -c 'from timeline_builder import detect_timeline_clusters; detect_timeline_clusters()'")
    print("4. Access timeline via web interface")

    # Show current stats
    stats = get_timeline_statistics()
    print(f"\nCurrent Statistics:")
    print(f"  Total events: {stats['total_events']}")
    print(f"  Suspicious events: {stats['suspicious_events']}")
    print(f"  Timeline clusters: {stats['total_clusters']}")
    if stats['date_range']['start'] and stats['date_range']['end']:
        print(f"  Date range: {stats['date_range']['start']} to {stats['date_range']['end']}")
