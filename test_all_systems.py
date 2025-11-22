#!/usr/bin/env python3
"""
COMPREHENSIVE TEST SUITE FOR ALL INVESTIGATIVE SYSTEMS
Tests every feature and verifies real data is returned
"""

import requests
import json
import sys
from datetime import datetime
from collections import defaultdict

BASE_URL = 'http://localhost:5001'

class TestReport:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.results = []
        self.feature_data = defaultdict(dict)

    def test(self, name, func):
        """Run a test and record results"""
        self.tests_run += 1
        try:
            result = func()
            if result['success']:
                self.tests_passed += 1
                status = '✓ PASS'
                print(f"{status} {name}")
            else:
                self.tests_failed += 1
                status = '✗ FAIL'
                print(f"{status} {name}: {result.get('error', 'Unknown error')}")

            self.results.append({
                'name': name,
                'status': status,
                'data_count': result.get('data_count', 0),
                'details': result.get('details', {}),
                'error': result.get('error')
            })

            # Store feature data for report
            category = name.split(':')[0]
            self.feature_data[category][name] = result

        except Exception as e:
            self.tests_failed += 1
            print(f"✗ FAIL {name}: {str(e)}")
            self.results.append({
                'name': name,
                'status': '✗ FAIL',
                'error': str(e)
            })

    def summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed} ({100*self.tests_passed/self.tests_run:.1f}%)")
        print(f"Failed: {self.tests_failed}")
        print("="*80)

        return {
            'total': self.tests_run,
            'passed': self.tests_passed,
            'failed': self.tests_failed,
            'pass_rate': 100*self.tests_passed/self.tests_run if self.tests_run > 0 else 0
        }

# ============================================================================
# TEST FUNCTIONS
# ============================================================================

def test_basic_stats():
    """Test basic document statistics"""
    try:
        r = requests.get(f'{BASE_URL}/stats', timeout=10)
        data = r.json()

        total_items = data.get('text_documents', 0) + data.get('images', 0) + data.get('entities', 0)

        return {
            'success': total_items > 0,
            'data_count': total_items,
            'details': data,
            'error': 'No data found' if total_items == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_documents():
    """Test document retrieval"""
    try:
        r = requests.get(f'{BASE_URL}/documents', timeout=10)
        data = r.json()
        docs = data.get('documents', [])

        return {
            'success': len(docs) > 0,
            'data_count': len(docs),
            'details': {'sample': docs[:3] if docs else []},
            'error': 'No documents found' if len(docs) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_entities():
    """Test entity extraction"""
    try:
        r = requests.get(f'{BASE_URL}/entities', timeout=10)
        data = r.json()
        entities = data.get('entities', [])

        return {
            'success': len(entities) > 0,
            'data_count': len(entities),
            'details': {'top_entities': entities[:5]},
            'error': 'No entities found' if len(entities) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_network():
    """Test entity network graph"""
    try:
        r = requests.get(f'{BASE_URL}/network', timeout=10)
        data = r.json()
        nodes = data.get('nodes', [])
        edges = data.get('edges', [])

        return {
            'success': len(nodes) > 0,
            'data_count': len(nodes) + len(edges),
            'details': {'nodes': len(nodes), 'edges': len(edges)},
            'error': 'No network data' if len(nodes) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_timeline():
    """Test timeline events"""
    try:
        r = requests.get(f'{BASE_URL}/timeline', timeout=10)
        data = r.json()
        events = data.get('events', [])

        return {
            'success': len(events) > 0,
            'data_count': len(events),
            'details': {'sample_events': events[:3]},
            'error': 'No timeline events' if len(events) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_email_intelligence():
    """Test email intelligence system"""
    try:
        r = requests.get(f'{BASE_URL}/api/emails/stats', timeout=10)
        data = r.json()

        total = data.get('total_emails', 0)
        suspicious = data.get('suspicious_emails', 0)

        return {
            'success': total > 0,
            'data_count': total,
            'details': {
                'total_emails': total,
                'suspicious_emails': suspicious,
                'threads': data.get('total_threads', 0),
                'contacts': data.get('contact_relationships', 0)
            },
            'error': 'No emails found' if total == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_flight_intelligence():
    """Test flight intelligence system"""
    try:
        r = requests.get(f'{BASE_URL}/api/flights/stats', timeout=10)
        data = r.json()

        total = data.get('total_flights', 0)

        return {
            'success': total > 0,
            'data_count': total,
            'details': {
                'total_flights': total,
                'total_passengers': data.get('total_passengers', 0),
                'unique_routes': data.get('unique_routes', 0)
            },
            'error': 'No flight data' if total == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_financial_intelligence():
    """Test financial tracking system"""
    try:
        r = requests.get(f'{BASE_URL}/api/financial/stats', timeout=10)
        data = r.json()

        total = data.get('total_transactions', 0)

        return {
            'success': total > 0,
            'data_count': total,
            'details': {
                'total_transactions': total,
                'total_amount': data.get('total_amount', 0),
                'suspicious_transactions': data.get('suspicious_transactions', 0),
                'financial_entities': data.get('financial_entities', 0)
            },
            'error': 'No financial data' if total == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_timeline_builder():
    """Test timeline builder system"""
    try:
        r = requests.get(f'{BASE_URL}/api/timeline/stats', timeout=10)
        data = r.json()

        total = data.get('total_events', 0)

        return {
            'success': total > 0,
            'data_count': total,
            'details': {
                'total_events': total,
                'by_type': data.get('events_by_type', {}),
                'suspicious_events': data.get('suspicious_events', 0)
            },
            'error': 'No timeline events' if total == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_anomaly_detection():
    """Test anomaly detection system"""
    try:
        r = requests.get(f'{BASE_URL}/api/anomalies', timeout=10)
        data = r.json()
        anomalies = data.get('anomalies', [])

        return {
            'success': len(anomalies) > 0,
            'data_count': len(anomalies),
            'details': {'anomalies_found': len(anomalies)},
            'error': 'No anomalies detected' if len(anomalies) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_ai_journalist():
    """Test AI journalist query system"""
    try:
        r = requests.post(f'{BASE_URL}/api/ai/journalist-query',
                         json={'query': 'Who is mentioned most frequently?'},
                         timeout=30)
        data = r.json()

        has_response = 'response' in data and len(data['response']) > 0

        return {
            'success': has_response,
            'data_count': 1 if has_response else 0,
            'details': {'response_length': len(data.get('response', ''))},
            'error': 'No response generated' if not has_response else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_minor_alerts():
    """Test minor travel alerts"""
    try:
        r = requests.get(f'{BASE_URL}/api/flight/minor-alerts', timeout=10)
        data = r.json()
        alerts = data.get('alerts', [])

        return {
            'success': len(alerts) > 0,
            'data_count': len(alerts),
            'details': {'critical_alerts': len(alerts)},
            'error': 'No minor alerts found' if len(alerts) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_suspicious_emails():
    """Test suspicious email detection"""
    try:
        r = requests.get(f'{BASE_URL}/api/email/suspicious', timeout=10)
        data = r.json()
        emails = data.get('emails', [])

        return {
            'success': len(emails) > 0,
            'data_count': len(emails),
            'details': {'suspicious_emails': len(emails)},
            'error': 'No suspicious emails found' if len(emails) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_suspicious_transactions():
    """Test suspicious financial transactions"""
    try:
        r = requests.get(f'{BASE_URL}/api/financial/suspicious', timeout=10)
        data = r.json()
        transactions = data.get('transactions', [])

        return {
            'success': len(transactions) > 0,
            'data_count': len(transactions),
            'details': {'suspicious_transactions': len(transactions)},
            'error': 'No suspicious transactions found' if len(transactions) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_cooccurrence():
    """Test entity co-occurrence matrix"""
    try:
        r = requests.get(f'{BASE_URL}/api/cooccurrence?type=person&min=1', timeout=10)
        data = r.json()

        has_data = 'entities' in data and len(data.get('entities', [])) > 0

        return {
            'success': has_data,
            'data_count': len(data.get('entities', [])),
            'details': data,
            'error': 'No co-occurrence data' if not has_data else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_geomap():
    """Test geographic mapping"""
    try:
        r = requests.get(f'{BASE_URL}/api/geomap', timeout=10)
        data = r.json()
        locations = data.get('locations', [])

        return {
            'success': len(locations) > 0,
            'data_count': len(locations),
            'details': {'mapped_locations': len(locations)},
            'error': 'No geocoded locations' if len(locations) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_search():
    """Test full-text search"""
    try:
        r = requests.get(f'{BASE_URL}/search?q=Epstein', timeout=10)
        data = r.json()
        results = data.get('results', [])

        return {
            'success': len(results) > 0,
            'data_count': len(results),
            'details': {'search_results': len(results)},
            'error': 'No search results' if len(results) == 0 else None
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("="*80)
    print("COMPREHENSIVE SYSTEM TEST SUITE")
    print("Testing all investigative features...")
    print("="*80)
    print()

    # Check if server is running
    try:
        r = requests.get(f'{BASE_URL}/', timeout=5)
        if r.status_code != 200:
            print("ERROR: Server is not responding correctly")
            sys.exit(1)
    except:
        print("ERROR: Cannot connect to server. Is it running on port 5001?")
        print("Start with: python3 app.py")
        sys.exit(1)

    report = TestReport()

    # Core Features
    print("\n--- CORE FEATURES ---")
    report.test("CORE: Basic Statistics", test_basic_stats)
    report.test("CORE: Document Retrieval", test_documents)
    report.test("CORE: Entity Extraction", test_entities)
    report.test("CORE: Network Graph", test_network)
    report.test("CORE: Timeline", test_timeline)
    report.test("CORE: Full-Text Search", test_search)
    report.test("CORE: Co-occurrence Analysis", test_cooccurrence)
    report.test("CORE: Geographic Mapping", test_geomap)

    # Intelligence Systems
    print("\n--- INTELLIGENCE SYSTEMS ---")
    report.test("INTEL: Email Intelligence", test_email_intelligence)
    report.test("INTEL: Flight Intelligence", test_flight_intelligence)
    report.test("INTEL: Financial Intelligence", test_financial_intelligence)
    report.test("INTEL: Timeline Builder", test_timeline_builder)

    # Advanced Detection
    print("\n--- ADVANCED DETECTION ---")
    report.test("DETECTION: Minor Travel Alerts", test_minor_alerts)
    report.test("DETECTION: Suspicious Emails", test_suspicious_emails)
    report.test("DETECTION: Suspicious Transactions", test_suspicious_transactions)
    report.test("DETECTION: Anomaly Detection", test_anomaly_detection)

    # AI Features
    print("\n--- AI FEATURES ---")
    report.test("AI: Journalist Query System", test_ai_journalist)

    # Print summary
    summary = report.summary()

    # Generate detailed report
    print("\n" + "="*80)
    print("DETAILED FEATURE DATA")
    print("="*80)

    for category, tests in report.feature_data.items():
        print(f"\n{category}:")
        for test_name, result in tests.items():
            if result.get('success'):
                print(f"  ✓ {test_name.split(': ')[1]}: {result.get('data_count', 0)} items")
                if result.get('details'):
                    for key, value in result['details'].items():
                        if isinstance(value, (int, float)):
                            print(f"    - {key}: {value}")

    # Save report
    report_data = {
        'timestamp': datetime.now().isoformat(),
        'summary': summary,
        'results': report.results,
        'feature_data': dict(report.feature_data)
    }

    with open('test_results_comprehensive.json', 'w') as f:
        json.dump(report_data, f, indent=2)

    print("\n" + "="*80)
    print(f"Full report saved to: test_results_comprehensive.json")
    print("="*80)

    # Exit with appropriate code
    sys.exit(0 if report.tests_failed == 0 else 1)

if __name__ == '__main__':
    main()
