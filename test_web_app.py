#!/usr/bin/env python3
"""
Comprehensive Web Application Tester for Epstein Archive Investigator
Uses Playwright to test every feature and identify broken functionality
"""

import asyncio
import json
import os
from datetime import datetime
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:5001"
SCREENSHOTS_DIR = "/Users/jonathon/Auto1111/Claude/test_screenshots"

# Test results storage
test_results = {
    "timestamp": datetime.now().isoformat(),
    "pages_tested": [],
    "api_endpoints_tested": [],
    "broken_features": [],
    "working_features": [],
    "empty_data": [],
    "errors": []
}

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

async def test_api_endpoint(page, endpoint, description):
    """Test an API endpoint and record results"""
    try:
        response = await page.goto(f"{BASE_URL}{endpoint}")
        status = response.status

        if status == 200:
            try:
                data = await response.json()
                is_empty = False

                # Check if data is meaningfully populated
                if isinstance(data, dict):
                    for key, val in data.items():
                        if isinstance(val, list) and len(val) == 0:
                            is_empty = True
                        elif isinstance(val, int) and val == 0:
                            is_empty = True

                if is_empty:
                    test_results["empty_data"].append({
                        "endpoint": endpoint,
                        "description": description,
                        "response": str(data)[:200]
                    })
                    return f"⚠️ EMPTY: {endpoint}"
                else:
                    test_results["working_features"].append({
                        "endpoint": endpoint,
                        "description": description,
                        "status": status
                    })
                    return f"✅ OK: {endpoint}"
            except:
                return f"✅ OK (non-JSON): {endpoint}"
        else:
            test_results["broken_features"].append({
                "endpoint": endpoint,
                "description": description,
                "status": status
            })
            return f"❌ BROKEN ({status}): {endpoint}"
    except Exception as e:
        test_results["errors"].append({
            "endpoint": endpoint,
            "description": description,
            "error": str(e)
        })
        return f"❌ ERROR: {endpoint} - {str(e)[:50]}"

async def test_page_feature(page, tab_id, description):
    """Test a tab/feature on the main page"""
    try:
        await page.goto(BASE_URL)
        await page.wait_for_load_state("networkidle")

        # Try clicking the tab
        tab_selector = f"button.tab:has-text('{tab_id}')"
        tab = await page.query_selector(tab_selector)

        if tab:
            await tab.click()
            await asyncio.sleep(1)

            # Take screenshot
            screenshot_path = f"{SCREENSHOTS_DIR}/{tab_id.replace(' ', '_').lower()}.png"
            await page.screenshot(path=screenshot_path)

            # Check for error messages or empty states
            error_element = await page.query_selector(".error, .empty-state")
            content = await page.content()

            if "error" in content.lower() or "failed" in content.lower():
                test_results["broken_features"].append({
                    "feature": tab_id,
                    "description": description,
                    "issue": "Error displayed on page"
                })
                return f"❌ ERROR: {tab_id}"
            elif "No data" in content or "empty" in content.lower():
                test_results["empty_data"].append({
                    "feature": tab_id,
                    "description": description
                })
                return f"⚠️ EMPTY: {tab_id}"
            else:
                test_results["working_features"].append({
                    "feature": tab_id,
                    "description": description
                })
                return f"✅ OK: {tab_id}"
        else:
            return f"⚠️ NOT FOUND: {tab_id}"

    except Exception as e:
        test_results["errors"].append({
            "feature": tab_id,
            "error": str(e)
        })
        return f"❌ ERROR: {tab_id} - {str(e)[:50]}"

async def run_comprehensive_tests():
    """Run all tests"""
    print("="*70)
    print("EPSTEIN ARCHIVE INVESTIGATOR - COMPREHENSIVE TEST SUITE")
    print("="*70)
    print()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        page.set_default_timeout(10000)

        # ===== TEST API ENDPOINTS =====
        print("TESTING API ENDPOINTS")
        print("-"*50)

        api_endpoints = [
            ("/api/stats", "Main statistics"),
            ("/api/documents", "Document list"),
            ("/api/entities", "Entity list"),
            ("/api/search?q=epstein", "Basic search"),
            ("/api/semantic-search?q=trafficking", "Semantic search"),
            ("/api/timeline", "Timeline data"),
            ("/api/leads", "Investigation leads"),
            ("/api/flight-logs", "Flight logs"),
            ("/api/flight-stats", "Flight statistics"),
            ("/api/email-threads", "Email threads"),
            ("/api/email-network", "Email network"),
            ("/api/financial-transactions", "Financial data"),
            ("/api/contradictions", "Contradictions"),
            ("/api/anomalies", "Anomalies"),
            ("/api/network", "Network graph"),
            ("/api/cooccurrence", "Co-occurrence matrix"),
            ("/api/geolocations", "Geolocations"),
            ("/api/contacts", "Contact book"),
            ("/api/contacts/stats", "Contact stats"),
            # VOL00008 endpoints
            ("/api/vol00008/stats", "VOL00008 statistics"),
            ("/api/vol00008/documents?limit=10", "VOL00008 documents"),
            ("/api/vol00008/high-priority?min_severity=5", "VOL00008 high priority"),
            ("/api/vol00008/persons", "VOL00008 persons"),
            ("/api/vol00008/network", "VOL00008 network"),
        ]

        for endpoint, desc in api_endpoints:
            result = await test_api_endpoint(page, endpoint, desc)
            print(f"  {result}")
            test_results["api_endpoints_tested"].append(endpoint)

        print()

        # ===== TEST MAIN PAGE =====
        print("TESTING MAIN PAGE")
        print("-"*50)

        try:
            await page.goto(BASE_URL)
            await page.wait_for_load_state("networkidle")
            await page.screenshot(path=f"{SCREENSHOTS_DIR}/main_page.png")

            # Check stats display
            stat_docs = await page.inner_text("#stat-documents")
            stat_images = await page.inner_text("#stat-images")
            stat_entities = await page.inner_text("#stat-entities")

            print(f"  Stats displayed: Documents={stat_docs}, Images={stat_images}, Entities={stat_entities}")

            if stat_docs == "0" and stat_entities == "0":
                test_results["empty_data"].append({
                    "feature": "Main statistics",
                    "issue": "All stats showing 0"
                })
                print("  ⚠️ WARNING: Stats show zeros - may need data refresh")

        except Exception as e:
            print(f"  ❌ Error loading main page: {e}")

        print()

        # ===== TEST TABS/FEATURES =====
        print("TESTING TAB FEATURES")
        print("-"*50)

        tabs_to_test = [
            ("Upload", "File upload functionality"),
            ("Search", "Search functionality"),
            ("Documents", "Document browser"),
            ("Entities", "Entity browser"),
            ("Network", "Network visualization"),
            ("Timeline", "Timeline view"),
            ("Advanced", "Advanced search"),
            ("KWIC", "Keyword in context"),
            ("Matrix", "Co-occurrence matrix"),
            ("Anomalies", "Anomaly detection"),
            ("Map", "Geolocation map"),
            ("LEADS", "Investigation leads"),
            ("IMAGES", "Image gallery"),
            ("Flight Logs", "Flight log analysis"),
            ("Email Intelligence", "Email analysis"),
            ("Financial Tracker", "Financial tracking"),
            ("AI Investigation", "AI investigation"),
            ("AI JOURNALIST", "AI journalist feature"),
        ]

        for tab_name, desc in tabs_to_test:
            result = await test_page_feature(page, tab_name, desc)
            print(f"  {result}")
            test_results["pages_tested"].append(tab_name)

        print()

        # ===== TEST EXTERNAL PAGES =====
        print("TESTING EXTERNAL PAGES")
        print("-"*50)

        external_pages = [
            ("/contradictions", "Contradiction detection"),
            ("/investigate", "Investigation page"),
            ("/mcp", "MCP dashboard"),
            ("/graph", "Knowledge graph"),
        ]

        for url, desc in external_pages:
            try:
                response = await page.goto(f"{BASE_URL}{url}")
                await asyncio.sleep(1)
                await page.screenshot(path=f"{SCREENSHOTS_DIR}/{url.replace('/', '_')}.png")

                if response.status == 200:
                    content = await page.content()
                    if "error" in content.lower() and "server error" in content.lower():
                        print(f"  ❌ ERROR: {url} - Server error on page")
                        test_results["broken_features"].append({"page": url, "desc": desc})
                    else:
                        print(f"  ✅ OK: {url}")
                        test_results["working_features"].append({"page": url, "desc": desc})
                else:
                    print(f"  ❌ BROKEN ({response.status}): {url}")
                    test_results["broken_features"].append({"page": url, "status": response.status})
            except Exception as e:
                print(f"  ❌ ERROR: {url} - {str(e)[:50]}")
                test_results["errors"].append({"page": url, "error": str(e)})

        await browser.close()

    # ===== SUMMARY =====
    print()
    print("="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"  Working features: {len(test_results['working_features'])}")
    print(f"  Broken features: {len(test_results['broken_features'])}")
    print(f"  Empty data issues: {len(test_results['empty_data'])}")
    print(f"  Errors: {len(test_results['errors'])}")

    if test_results["broken_features"]:
        print()
        print("BROKEN FEATURES:")
        for item in test_results["broken_features"]:
            print(f"  ❌ {item}")

    if test_results["empty_data"]:
        print()
        print("EMPTY DATA ISSUES:")
        for item in test_results["empty_data"]:
            print(f"  ⚠️ {item}")

    if test_results["errors"]:
        print()
        print("ERRORS:")
        for item in test_results["errors"]:
            print(f"  ❌ {item}")

    # Save results to JSON
    with open(f"{SCREENSHOTS_DIR}/test_results.json", "w") as f:
        json.dump(test_results, f, indent=2)

    print()
    print(f"Screenshots saved to: {SCREENSHOTS_DIR}/")
    print(f"Results saved to: {SCREENSHOTS_DIR}/test_results.json")

    return test_results

if __name__ == "__main__":
    asyncio.run(run_comprehensive_tests())
