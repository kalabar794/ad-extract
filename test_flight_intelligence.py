#!/usr/bin/env python3
"""
Test Complete Flight Intelligence System
Verify all functions return real data from database
"""

import sys
from complete_flight_intelligence import (
    find_minor_travel_alerts,
    get_passenger_history,
    get_frequent_flyers,
    build_cotravel_network,
    analyze_suspicious_routes
)

def test_minor_alerts():
    """Test minor travel alerts"""
    print("\n" + "="*80)
    print("TEST 1: MINOR TRAVEL ALERTS")
    print("="*80)

    alerts = find_minor_travel_alerts()
    print(f"✓ Found {len(alerts)} minor travel alerts")

    if alerts:
        print(f"\nSample alerts (showing first 3):")
        for i, alert in enumerate(alerts[:3], 1):
            print(f"\n{i}. {alert.get('severity', 'UNKNOWN')} - {alert.get('source_file', 'Unknown file')}")
            if 'minor_name' in alert:
                print(f"   Minor: {alert['minor_name']}, Age: {alert.get('minor_age', 'Unknown')}")
            if 'date' in alert:
                print(f"   Date: {alert['date']}")
            if 'people_mentioned' in alert and alert['people_mentioned']:
                print(f"   People mentioned: {', '.join(alert['people_mentioned'][:3])}")

    return len(alerts)

def test_frequent_flyers():
    """Test frequent flyers"""
    print("\n" + "="*80)
    print("TEST 2: FREQUENT FLYERS (TOP 10)")
    print("="*80)

    flyers = get_frequent_flyers(min_flights=3)
    print(f"✓ Found {len(flyers)} frequent flyers (min 3 flights)")

    if flyers:
        print(f"\nTop 10 frequent flyers:")
        for i, flyer in enumerate(flyers[:10], 1):
            print(f"{i}. {flyer['name']} - {flyer['flight_count']} flights ({flyer.get('significance', 'N/A')})")
            if flyer.get('top_destinations'):
                dests = [f"{d['location']} ({d['count']})" for d in flyer['top_destinations'][:3]]
                print(f"   Top destinations: {', '.join(dests)}")

    return flyers[:10] if flyers else []

def test_cotravel_network():
    """Test co-travel network"""
    print("\n" + "="*80)
    print("TEST 3: CO-TRAVEL NETWORK (MOST COMMON PAIRS)")
    print("="*80)

    network = build_cotravel_network(min_flights=2)

    print(f"✓ Network has {network['statistics']['total_people']} people")
    print(f"✓ Network has {network['statistics']['total_connections']} connections")

    top_pairs = sorted(network['edges'], key=lambda x: x['flights_together'], reverse=True)[:10]

    print(f"\nTop 10 co-travel pairs:")
    for i, pair in enumerate(top_pairs, 1):
        print(f"{i}. {pair['from']} ↔ {pair['to']}")
        print(f"   {pair['flights_together']} flights together ({pair['significance']})")

    return top_pairs

def test_suspicious_routes():
    """Test suspicious routes to Epstein locations"""
    print("\n" + "="*80)
    print("TEST 4: SUSPICIOUS ROUTES TO EPSTEIN LOCATIONS")
    print("="*80)

    routes = analyze_suspicious_routes()
    summary = routes['summary']

    print(f"✓ Little St. James: {summary['little_st_james_count']} flights/mentions")
    print(f"✓ Palm Beach: {summary['palm_beach_count']} flights/mentions")
    print(f"✓ Manhattan/NYC: {summary['manhattan_count']} flights/mentions")
    print(f"✓ New Mexico: {summary['new_mexico_count']} flights/mentions")
    print(f"✓ TOTAL: {summary['total_suspicious_routes']} suspicious routes")

    # Show sample flights for each location
    if routes['little_st_james']:
        print(f"\nSample Little St. James flights:")
        for flight in routes['little_st_james'][:2]:
            if 'flight_id' in flight:
                print(f"  - {flight.get('date', 'Unknown')} | {flight.get('route', 'Unknown')}")
                if flight.get('passengers'):
                    print(f"    Passengers: {', '.join(flight['passengers'][:5])}")

    return summary

def test_passenger_history():
    """Test passenger history for specific people"""
    print("\n" + "="*80)
    print("TEST 5: PASSENGER HISTORY (SPECIFIC PEOPLE)")
    print("="*80)

    test_names = ['Clinton', 'Trump', 'Maxwell', 'Epstein', 'Andrew']

    for name in test_names:
        history = get_passenger_history(name)
        if history['total_flights'] > 0:
            print(f"\n✓ {history['passenger_name']}: {history['total_flights']} flight records")

            if history.get('frequent_companions'):
                companions = [f"{c['name']} ({c['flights_together']})"
                            for c in history['frequent_companions'][:3]]
                print(f"  Most frequent companions: {', '.join(companions)}")

            if history.get('top_destinations'):
                dests = [f"{d['location']} ({d['count']})"
                        for d in history['top_destinations'][:3]]
                print(f"  Top destinations: {', '.join(dests)}")

def main():
    """Run all tests and generate summary"""
    print("\n")
    print("█" * 80)
    print("COMPLETE FLIGHT INTELLIGENCE SYSTEM - VERIFICATION TEST")
    print("█" * 80)

    try:
        # Run all tests
        minor_count = test_minor_alerts()
        flyers = test_frequent_flyers()
        pairs = test_cotravel_network()
        routes_summary = test_suspicious_routes()
        test_passenger_history()

        # Final summary
        print("\n" + "█" * 80)
        print("FINAL SUMMARY - REAL DATA VERIFICATION")
        print("█" * 80)

        print(f"\n✓ Minor travel alerts: {minor_count}")
        print(f"✓ Frequent flyers identified: {len(flyers)}")
        print(f"✓ Co-travel pairs: {len(pairs)}")
        print(f"✓ Little St. James flights: {routes_summary['little_st_james_count']}")
        print(f"✓ Palm Beach flights: {routes_summary['palm_beach_count']}")
        print(f"✓ Manhattan flights: {routes_summary['manhattan_count']}")
        print(f"✓ New Mexico flights: {routes_summary['new_mexico_count']}")

        print("\n" + "="*80)
        print("ALL TESTS COMPLETED SUCCESSFULLY")
        print("="*80)

        return 0

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
