#!/usr/bin/env python3
"""
Comprehensive Feature Test Suite
Tests all endpoints and features in the investigation app
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5001"

class FeatureTester:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []

    def test(self, name, url, expected_keys=None, method='GET', data=None):
        """Test an endpoint"""
        try:
            if method == 'GET':
                response = requests.get(f"{BASE_URL}{url}", timeout=5)
            elif method == 'POST':
                response = requests.post(f"{BASE_URL}{url}", json=data, timeout=5)

            if response.status_code == 200:
                if expected_keys:
                    result = response.json()
                    missing = [k for k in expected_keys if k not in result]
                    if missing:
                        self.failed.append(f"❌ {name} - Missing keys: {missing}")
                    else:
                        self.passed.append(f"✅ {name}")
                else:
                    self.passed.append(f"✅ {name}")
            elif response.status_code == 500:
                self.failed.append(f"❌ {name} - SERVER ERROR 500")
                print(f"   Error: {response.text[:200]}")
            else:
                self.warnings.append(f"⚠️  {name} - Status {response.status_code}")
        except requests.exceptions.Timeout:
            self.warnings.append(f"⚠️  {name} - Timeout")
        except Exception as e:
            self.failed.append(f"❌ {name} - {str(e)[:100]}")

    def report(self):
        """Print test report"""
        print("\n" + "="*70)
        print("FEATURE TEST REPORT")
        print("="*70)

        print(f"\n✅ PASSED ({len(self.passed)}):")
        for item in self.passed:
            print(f"  {item}")

        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for item in self.warnings:
                print(f"  {item}")

        if self.failed:
            print(f"\n❌ FAILED ({len(self.failed)}):")
            for item in self.failed:
                print(f"  {item}")

        print("\n" + "="*70)
        total = len(self.passed) + len(self.warnings) + len(self.failed)
        print(f"Total: {total} tests | Passed: {len(self.passed)} | Warnings: {len(self.warnings)} | Failed: {len(self.failed)}")
        print("="*70 + "\n")

def main():
    print("="*70)
    print("TESTING ALL APP FEATURES")
    print("="*70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    tester = FeatureTester()

    # Core Pages
    print("Testing Core Pages...")
    tester.test("Main Dashboard", "/")
    tester.test("MCP Dashboard", "/mcp")

    # Statistics
    print("Testing Statistics...")
    tester.test("Stats Endpoint", "/stats", expected_keys=['entities', 'text_documents'])

    # Search & Documents
    print("Testing Search & Documents...")
    tester.test("Search Endpoint", "/search?q=epstein")
    tester.test("Documents List", "/documents")
    tester.test("Images List", "/images")

    # Entities & Network
    print("Testing Entities & Network...")
    tester.test("Entities List", "/entities")
    tester.test("Network Graph", "/network")

    # Timeline
    print("Testing Timeline...")
    tester.test("Timeline Events", "/timeline", expected_keys=['events'])
    tester.test("Timeline Stats", "/api/timeline/stats")
    tester.test("Timeline Events API", "/api/timeline/events")
    tester.test("Timeline Clusters", "/api/timeline/clusters")

    # AI Features
    print("Testing AI Features...")
    tester.test("AI Journalist Stats", "/api/ai-journalist/stats")
    tester.test("AI Investigation Stats", "/api/ai-investigation/stats")

    # Flight Logs
    print("Testing Flight Logs...")
    tester.test("Flight Stats", "/api/flights/stats")
    tester.test("Flight Routes", "/api/flights/routes")
    tester.test("Flight Patterns", "/api/flights/patterns")
    tester.test("Flight Search", "/api/flights/search?passenger=epstein")

    # Email Intelligence
    print("Testing Email Intelligence...")
    tester.test("Email Stats", "/api/emails/stats")
    tester.test("Email Search", "/api/emails/search?q=test")
    tester.test("Email Network", "/api/emails/network")
    tester.test("Email Timeline", "/api/emails/timeline")

    # Financial Tracker
    print("Testing Financial Tracker...")
    tester.test("Financial Stats", "/api/financial/stats")
    tester.test("Financial Search", "/api/financial/search?q=payment")
    tester.test("Financial Timeline", "/api/financial/timeline")
    tester.test("Financial Anomalies", "/api/financial/anomalies")

    # Advanced Search
    print("Testing Advanced Search...")
    tester.test("Advanced Search", "/api/advanced-search?q=epstein")

    # KWIC (Keyword in Context)
    print("Testing KWIC...")
    tester.test("KWIC Search", "/api/kwic?keyword=epstein")

    # Co-occurrence
    print("Testing Co-occurrence...")
    tester.test("Co-occurrence Matrix", "/api/cooccurrence?entity=epstein")

    # Anomalies
    print("Testing Anomalies...")
    tester.test("Anomaly Detection", "/api/anomalies")

    # GeoMap
    print("Testing GeoMap...")
    tester.test("GeoMap Locations", "/api/geomap/locations")

    # MCP Integration
    print("Testing MCP Integration...")
    tester.test("MCP Entities", "/api/mcp/entities/PERSON?limit=5")
    tester.test("MCP Memory", "/api/mcp/memory")
    tester.test("MCP OCR Progress", "/api/mcp/ocr-progress")

    # Entity-specific endpoints
    print("Testing Entity Endpoints...")
    tester.test("Entity Types", "/api/entities/types")

    # Generate report
    tester.report()

    if tester.failed:
        print("🔴 CRITICAL: Some features are broken and need fixing!\n")
        return 1
    elif tester.warnings:
        print("🟡 WARNING: Some features need attention\n")
        return 0
    else:
        print("🟢 SUCCESS: All features working correctly!\n")
        return 0

if __name__ == '__main__':
    exit(main())
