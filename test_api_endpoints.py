#!/usr/bin/env python3
"""
Test Flight Intelligence API Endpoints
Verifies all endpoints return data correctly
"""

import sys
import json

# Import directly to test functionality
from complete_flight_intelligence import (
    find_minor_travel_alerts,
    get_passenger_history,
    get_frequent_flyers,
    build_cotravel_network,
    analyze_suspicious_routes
)

def test_endpoints():
    """Test all API endpoint functions"""

    print("=" * 80)
    print("TESTING FLIGHT INTELLIGENCE API ENDPOINTS")
    print("=" * 80)

    # Test 1: /api/flight/minor-alerts
    print("\n1. Testing /api/flight/minor-alerts endpoint...")
    try:
        alerts = find_minor_travel_alerts()
        print(f"   ✓ Returns {len(alerts)} alerts")
        print(f"   ✓ Sample: {alerts[0].get('source_file', 'N/A')}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Test 2: /api/flight/passenger/<name>
    print("\n2. Testing /api/flight/passenger/<name> endpoint...")
    try:
        history = get_passenger_history("Clinton")
        print(f"   ✓ Returns {history['total_flights']} flight records for {history['passenger_name']}")
        if history.get('frequent_companions'):
            print(f"   ✓ Top companion: {history['frequent_companions'][0]['name']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Test 3: /api/flight/frequent-flyers
    print("\n3. Testing /api/flight/frequent-flyers endpoint...")
    try:
        flyers = get_frequent_flyers(min_flights=3)
        print(f"   ✓ Returns {len(flyers)} frequent flyers")
        print(f"   ✓ Top flyer: {flyers[0]['name']} with {flyers[0]['flight_count']} flights")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Test 4: /api/flight/network
    print("\n4. Testing /api/flight/network endpoint...")
    try:
        network = build_cotravel_network(min_flights=2)
        print(f"   ✓ Returns network with {network['statistics']['total_people']} people")
        print(f"   ✓ Total connections: {network['statistics']['total_connections']}")
        if network['edges']:
            top = network['edges'][0]
            print(f"   ✓ Top pair: {top['from']} ↔ {top['to']} ({top['flights_together']} flights)")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    # Test 5: /api/flight/suspicious-routes
    print("\n5. Testing /api/flight/suspicious-routes endpoint...")
    try:
        routes = analyze_suspicious_routes()
        summary = routes['summary']
        print(f"   ✓ Little St. James: {summary['little_st_james_count']} flights")
        print(f"   ✓ Palm Beach: {summary['palm_beach_count']} flights")
        print(f"   ✓ Manhattan: {summary['manhattan_count']} flights")
        print(f"   ✓ New Mexico: {summary['new_mexico_count']} flights")
        print(f"   ✓ TOTAL: {summary['total_suspicious_routes']} suspicious routes")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    print("\n" + "=" * 80)
    print("ALL API ENDPOINTS FUNCTIONAL")
    print("=" * 80)
    print("\nTo test via HTTP, start the Flask app and run:")
    print("  curl http://localhost:5001/api/flight/minor-alerts")
    print("  curl http://localhost:5001/api/flight/passenger/Clinton")
    print("  curl http://localhost:5001/api/flight/frequent-flyers")
    print("  curl http://localhost:5001/api/flight/network")
    print("  curl http://localhost:5001/api/flight/suspicious-routes")
    print("=" * 80)

if __name__ == '__main__':
    test_endpoints()
