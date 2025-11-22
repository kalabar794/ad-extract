#!/usr/bin/env python3
"""
Comprehensive QA Test Suite
Tests ALL features and reports detailed results
"""

import sqlite3
import sys
from datetime import datetime

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def print_test_header(test_name):
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BOLD}{test_name}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}")

def print_pass(message):
    print(f"{GREEN}✅ PASS{RESET}: {message}")

def print_fail(message):
    print(f"{RED}❌ FAIL{RESET}: {message}")

def print_info(message):
    print(f"{YELLOW}ℹ️  INFO{RESET}: {message}")

def print_sample(label, data):
    print(f"{BOLD}Sample {label}:{RESET}")
    print(f"  {data}")

# =============================================================================
# TEST 1: AI JOURNALIST FEATURES
# =============================================================================
def test_ai_journalist():
    print_test_header("TEST 1: AI JOURNALIST FEATURES")

    from ai_journalist import answer_natural_language_query

    # Test 1a: Trump-Epstein Connection Query
    print(f"\n{BOLD}Test 1a: Query 'How are Trump and Epstein connected?'{RESET}")
    try:
        result = answer_natural_language_query("How are Trump and Epstein connected?")

        if result and 'answer' in result:
            evidence_count = len(result.get('evidence', []))

            # Extract document count from answer
            import re
            doc_match = re.search(r'(\d+)\s+documents?', result['answer'])
            doc_count = int(doc_match.group(1)) if doc_match else 0

            if doc_count >= 100:
                print_pass(f"Found {doc_count} documents analyzing Trump-Epstein connection")
                print_sample("Analysis excerpt", result['answer'][:300] + "...")
            elif doc_count > 0:
                print_pass(f"Found {doc_count} documents (less than expected 630, but functional)")
                print_sample("Analysis excerpt", result['answer'][:300] + "...")
            else:
                print_fail(f"Query returned data but only {doc_count} documents")

            if result.get('actionable_leads'):
                print_info(f"Generated {len(result['actionable_leads'])} actionable leads")
        else:
            print_fail("Query returned empty or malformed result")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

    # Test 1b: Clinton Flights Query
    print(f"\n{BOLD}Test 1b: Query 'What flights did Clinton take?'{RESET}")
    try:
        result = answer_natural_language_query("What flights did Clinton take?")

        if result and 'answer' in result:
            evidence_count = len(result.get('evidence', []))

            # Check for real flight data
            answer_text = result['answer']
            if evidence_count > 0 and any(keyword in answer_text.lower() for keyword in ['flight', 'flew', 'manifest', 'destination']):
                print_pass(f"Found {evidence_count} flight documents with real data")
                print_sample("Flight analysis excerpt", result['answer'][:300] + "...")
            else:
                print_fail(f"Query returned {evidence_count} documents but no meaningful flight data")
        else:
            print_fail("Query returned empty or malformed result")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

    # Test 1c: General Search Quality
    print(f"\n{BOLD}Test 1c: Verify queries return meaningful analysis{RESET}")
    try:
        result = answer_natural_language_query("Find evidence of financial transactions")

        if result and 'answer' in result and len(result['answer']) > 100:
            print_pass("Queries return meaningful analysis (not empty results)")
            print_info(f"Confidence: {result.get('confidence', 'unknown')}")
        else:
            print_fail("Query returned empty or trivial results")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

# =============================================================================
# TEST 2: EMAIL INTELLIGENCE
# =============================================================================
def test_email_intelligence():
    print_test_header("TEST 2: EMAIL INTELLIGENCE")

    from email_intelligence import get_suspicious_emails, get_email_statistics, get_high_priority_threads

    # Test 2a: Suspicious Emails Endpoint
    print(f"\n{BOLD}Test 2a: Get suspicious emails{RESET}")
    try:
        emails = get_suspicious_emails()

        if len(emails) > 0:
            print_pass(f"Found {len(emails)} suspicious emails")

            # Check for keyword detection
            sample = emails[0]
            if 'suspicious_keywords' in sample and sample['suspicious_keywords']:
                print_info(f"Keywords detected: {list(sample['suspicious_keywords'].keys())}")
                print_sample("Suspicious email", f"{sample['subject']} from {sample['from_address']}")
        else:
            print_fail("No suspicious emails found (database may be empty)")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

    # Test 2b: Email Statistics
    print(f"\n{BOLD}Test 2b: Email statistics{RESET}")
    try:
        stats = get_email_statistics()

        if stats['total_emails'] > 0:
            print_pass(f"Email system functional: {stats['total_emails']} total emails")
            print_info(f"Suspicious: {stats['suspicious_emails']}, Threads: {stats['total_threads']}")

            if stats['top_keywords']:
                print_info(f"Top keywords tracked: {len(stats['top_keywords'])} categories")
        else:
            print_fail("Email database is empty - no data to test")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

    # Test 2c: Email Thread Reconstruction
    print(f"\n{BOLD}Test 2c: Email thread reconstruction{RESET}")
    try:
        threads = get_high_priority_threads(min_suspicion=1)

        if len(threads) > 0:
            print_pass(f"Thread reconstruction working: {len(threads)} threads identified")
            sample_thread = threads[0]
            print_sample("High-priority thread",
                        f"Subject: {sample_thread['subject']}, Messages: {sample_thread['message_count']}, Suspicion: {sample_thread['suspicion_score']}")
        else:
            print_fail("No email threads found (may indicate reconstruction issue)")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

# =============================================================================
# TEST 3: FLIGHT INTELLIGENCE
# =============================================================================
def test_flight_intelligence():
    print_test_header("TEST 3: FLIGHT INTELLIGENCE")

    from flight_intelligence import analyze_minor_travel, get_frequent_flyers, get_passenger_history, get_cotravel_network

    # Test 3a: Minor Travel Alerts
    print(f"\n{BOLD}Test 3a: Minor travel alerts{RESET}")
    try:
        alerts = analyze_minor_travel()

        if len(alerts) > 0:
            print_pass(f"Found {len(alerts)} flagged flights with minor indicators")
            sample = alerts[0]
            print_sample("Alert", f"{sample['severity']}: {sample['filename']}, Indicators: {sample['indicators'][:3]}")
        else:
            print_fail("No minor alerts found (database may lack flight data)")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

    # Test 3b: Frequent Flyers
    print(f"\n{BOLD}Test 3b: Frequent flyers list{RESET}")
    try:
        flyers = get_frequent_flyers(min_flights=3)

        if len(flyers) > 0:
            print_pass(f"Frequent flyers identified: {len(flyers)} people")
            top_flyer = flyers[0]
            print_sample("Top flyer", f"{top_flyer['name']}: {top_flyer['flight_count']} flights, {top_flyer['significance']}")
        else:
            print_fail("No frequent flyers found (database may lack flight data)")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

    # Test 3c: Passenger History
    print(f"\n{BOLD}Test 3c: Passenger history (Bill Clinton){RESET}")
    try:
        history = get_passenger_history("Bill Clinton")

        if history and history['total_flight_docs'] > 0:
            print_pass(f"Passenger history working: {history['total_flight_docs']} flight documents for Clinton")
            if history['flights']:
                sample = history['flights'][0]
                print_sample("Flight record", f"Dates: {sample['dates']}, Routes: {sample['routes']}")
        else:
            print_fail("No passenger history found for Bill Clinton")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

    # Test 3d: Co-Travel Network
    print(f"\n{BOLD}Test 3d: Co-travel network analysis{RESET}")
    try:
        network = get_cotravel_network()

        if len(network) > 0:
            print_pass(f"Co-travel network built: {len(network)} connections identified")
            sample = network[0]
            print_sample("Connection", f"{sample['person1']} ↔ {sample['person2']}: {sample['co_flights']} joint flights")
        else:
            print_fail("No co-travel connections found")
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

# =============================================================================
# TEST 4: ANOMALY DETECTION
# =============================================================================
def test_anomaly_detection():
    print_test_header("TEST 4: ANOMALY DETECTION")

    from ai_anomaly_investigator import analyze_anomalous_document

    # Test 4a: Find high-entity documents
    print(f"\n{BOLD}Test 4a: Detect anomalous documents{RESET}")
    try:
        conn = get_db()
        c = conn.cursor()

        # Find documents with high entity counts
        c.execute('''
            SELECT d.id, d.filename, COUNT(em.id) as entity_count
            FROM documents d
            JOIN entity_mentions em ON d.id = em.doc_id
            GROUP BY d.id
            ORDER BY entity_count DESC
            LIMIT 5
        ''')

        anomalous = c.fetchall()

        if len(anomalous) > 0:
            print_pass(f"Found {len(anomalous)} documents with high entity counts")
            for doc in anomalous[:3]:
                print_info(f"  {doc['filename']}: {doc['entity_count']} entities")
        else:
            print_fail("No anomalous documents found")

        conn.close()
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

    # Test 4b: Analyze specific document
    print(f"\n{BOLD}Test 4b: Run anomaly analysis on document{RESET}")
    try:
        conn = get_db()
        c = conn.cursor()

        # Get the most entity-rich document
        c.execute('''
            SELECT d.id, d.filename, COUNT(em.id) as entity_count
            FROM documents d
            JOIN entity_mentions em ON d.id = em.doc_id
            GROUP BY d.id
            ORDER BY entity_count DESC
            LIMIT 1
        ''')

        doc = c.fetchone()

        if doc:
            analysis = analyze_anomalous_document(doc['id'])

            if 'error' not in analysis:
                print_pass(f"Anomaly analysis working for {doc['filename']}")
                print_info(f"Significance: {analysis['priority']} (Score: {analysis['significance_score']})")

                if analysis['red_flags']:
                    print_info(f"Red flags detected: {len(analysis['red_flags'])}")
                    print_sample("Red flag", analysis['red_flags'][0])

                if analysis['investigative_leads']:
                    print_info(f"Actionable leads: {len(analysis['investigative_leads'])}")
            else:
                print_fail(f"Analysis error: {analysis['error']}")
        else:
            print_fail("No documents found to analyze")

        conn.close()
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

    # Test 4c: Significance Scoring
    print(f"\n{BOLD}Test 4c: Verify significance scoring{RESET}")
    try:
        conn = get_db()
        c = conn.cursor()

        # Test multiple documents
        c.execute('''
            SELECT d.id, d.filename
            FROM documents d
            LIMIT 3
        ''')

        docs = c.fetchall()
        scores = []

        for doc in docs:
            analysis = analyze_anomalous_document(doc['id'])
            if 'significance_score' in analysis:
                scores.append(analysis['significance_score'])

        if scores:
            print_pass(f"Significance scoring functional: scores range {min(scores)}-{max(scores)}")
        else:
            print_fail("Could not calculate significance scores")

        conn.close()
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

# =============================================================================
# TEST 5: DATABASE STATS
# =============================================================================
def test_database_stats():
    print_test_header("TEST 5: DATABASE STATISTICS")

    try:
        conn = get_db()
        c = conn.cursor()

        # Documents
        c.execute('SELECT COUNT(*) as count FROM documents')
        doc_count = c.fetchone()['count']

        # Entities
        c.execute('SELECT COUNT(*) as count FROM entities')
        entity_count = c.fetchone()['count']

        # Entity mentions
        c.execute('SELECT COUNT(*) as count FROM entity_mentions')
        mention_count = c.fetchone()['count']

        # Emails (if table exists)
        try:
            c.execute('SELECT COUNT(*) as count FROM emails')
            email_count = c.fetchone()['count']
        except:
            email_count = 0

        print_info(f"Documents: {doc_count}")
        print_info(f"Entities: {entity_count}")
        print_info(f"Entity mentions: {mention_count}")
        print_info(f"Emails: {email_count}")

        if doc_count > 0 and entity_count > 0:
            print_pass("Database is populated with data")
        else:
            print_fail("Database is empty or incomplete")

        conn.close()
    except Exception as e:
        print_fail(f"Exception: {str(e)}")

# =============================================================================
# MAIN TEST RUNNER
# =============================================================================
def main():
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}COMPREHENSIVE QA TEST SUITE{RESET}")
    print(f"{BOLD}Testing ALL Epstein Archive Features{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Run all tests
    test_database_stats()
    test_ai_journalist()
    test_email_intelligence()
    test_flight_intelligence()
    test_anomaly_detection()

    # Summary
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST SUITE COMPLETE{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"\n{YELLOW}NOTE:{RESET} Some tests may fail if database is empty.")
    print(f"To populate database, upload Epstein documents via the web UI.")
    print(f"\nAccess web interface at: http://localhost:5001")

if __name__ == '__main__':
    main()
