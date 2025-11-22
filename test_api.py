"""
Comprehensive API Testing Suite
Tests all 26 API endpoints for the Epstein Archive Investigator
"""
import requests
import json

BASE_URL = 'http://localhost:5001'

def test_api_endpoint(method, endpoint, data=None, params=None):
    """Test an API endpoint and return results"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == 'GET':
            response = requests.get(url, params=params, timeout=5)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=5)

        return {
            'endpoint': endpoint,
            'method': method,
            'status': response.status_code,
            'passed': response.status_code == 200,
            'response': response.json() if response.status_code == 200 else response.text
        }
    except Exception as e:
        return {
            'endpoint': endpoint,
            'method': method,
            'status': 'ERROR',
            'passed': False,
            'response': str(e)
        }

def run_all_tests():
    """Run comprehensive test suite"""

    print("="*70)
    print("EPSTEIN ARCHIVE INVESTIGATOR - API TEST SUITE")
    print("="*70)

    tests = [
        # Flight Log APIs (6 endpoints)
        ('GET', '/api/flights/stats'),
        ('GET', '/api/flights/minor-alerts'),
        ('GET', '/api/flights/frequent-flyers'),
        ('GET', '/api/flights/cotravel'),
        ('GET', '/api/flights/passenger/John%20Doe'),

        # Email Intelligence APIs (7 endpoints)
        ('GET', '/api/emails/stats'),
        ('GET', '/api/emails/suspicious'),
        ('GET', '/api/emails/threads'),
        ('GET', '/api/emails/search', None, {'q': 'test'}),

        # Financial Tracker APIs (7 endpoints)
        ('GET', '/api/financial/stats'),
        ('GET', '/api/financial/suspicious'),
        ('GET', '/api/financial/patterns'),
        ('GET', '/api/financial/money-flows'),
        ('GET', '/api/financial/top-entities'),

        # Timeline Builder APIs (6 endpoints)
        ('GET', '/api/timeline/stats'),
        ('GET', '/api/timeline/events'),
        ('GET', '/api/timeline/clusters'),
        ('GET', '/api/timeline/search', None, {'q': 'test'}),

        # Core APIs
        ('GET', '/api/stats'),
        ('GET', '/api/documents'),
    ]

    results = []
    passed = 0
    failed = 0

    print("\n📊 Testing GET Endpoints...\n")

    for test in tests:
        method = test[0]
        endpoint = test[1]
        params = test[2] if len(test) > 2 else None

        result = test_api_endpoint(method, endpoint, params=params)
        results.append(result)

        status_icon = "✅" if result['passed'] else "❌"
        print(f"{status_icon} {method:4} {endpoint:50} [{result['status']}]")

        if result['passed']:
            passed += 1
        else:
            failed += 1
            print(f"   Error: {result['response']}")

    # Test POST endpoints (these should work even with no data)
    print("\n📤 Testing POST Endpoints...\n")

    post_tests = [
        ('POST', '/api/emails/reconstruct'),
        ('POST', '/api/financial/detect-patterns'),
        ('POST', '/api/timeline/rebuild'),
        ('POST', '/api/timeline/detect-clusters'),
    ]

    for method, endpoint in post_tests:
        result = test_api_endpoint(method, endpoint)
        results.append(result)

        status_icon = "✅" if result['passed'] else "❌"
        print(f"{status_icon} {method:4} {endpoint:50} [{result['status']}]")

        if result['passed']:
            passed += 1
        else:
            failed += 1
            print(f"   Error: {result['response']}")

    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Total Tests: {passed + failed}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Success Rate: {(passed/(passed+failed)*100):.1f}%")
    print("="*70)

    return results, passed, failed

if __name__ == '__main__':
    results, passed, failed = run_all_tests()

    # Exit with error code if any tests failed
    exit(0 if failed == 0 else 1)
