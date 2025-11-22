#!/usr/bin/env python3
"""Comprehensive proof that all features work"""

from playwright.sync_api import sync_playwright
import time
import json

def prove_it():
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:5001", wait_until="networkidle", timeout=15000)
        time.sleep(2)

        # TEST 1: AI Investigation Report
        print("\n" + "="*70)
        print("TEST 1: AI INVESTIGATION REPORT")
        print("="*70)
        page.locator('button:has-text("AI Investigation")').first.click()
        time.sleep(5)
        content = page.content()

        suspects = ["JEE", "Jeffrey Epstein", "Trump", "Bill Clinton", "Obama"]
        found = [s for s in suspects if s in content]

        if len(found) >= 4 and "Executive Summary" in content:
            print(f"✅ PASS - Found {len(found)}/5 suspects")
            print(f"   Suspects: {', '.join(found)}")
            results.append(("AI Investigation", "PASS", f"{len(found)}/5 suspects"))
            page.screenshot(path="proof_ai_investigation.png")
        else:
            print(f"❌ FAIL - Only found {len(found)}/5 suspects")
            results.append(("AI Investigation", "FAIL", f"{len(found)}/5"))

        # TEST 2: Relationship Network
        print("\n" + "="*70)
        print("TEST 2: RELATIONSHIP NETWORK")
        print("="*70)
        page.locator('button:has-text("Analyze Network")').first.click()
        time.sleep(5)
        content = page.content()

        if "Error: null" in content:
            print("❌ FAIL - JavaScript error")
            results.append(("Relationship Network", "FAIL", "JS error"))
        elif "Network contains" in content and "individuals" in content:
            print("✅ PASS - Network analysis loaded")
            print("   No JavaScript errors")
            results.append(("Relationship Network", "PASS", "No errors"))
            page.screenshot(path="proof_network.png")
        else:
            print("⚠ UNKNOWN STATE")
            results.append(("Relationship Network", "UNKNOWN", "Unexpected content"))

        # TEST 3: Suspicious Patterns
        print("\n" + "="*70)
        print("TEST 3: SUSPICIOUS PATTERNS")
        print("="*70)
        page.locator('button:has-text("Scan Documents")').first.click()
        time.sleep(5)
        content = page.content()

        if "Error: null is not an object" in content:
            print("❌ FAIL - JavaScript error")
            results.append(("Suspicious Patterns", "FAIL", "JS Error"))
        elif "doc_id" in content or "FEDERAL BUREAU" in content or "keywords" in content:
            print("✅ PASS - Documents scanned")
            results.append(("Suspicious Patterns", "PASS", "Documents found"))
            page.screenshot(path="proof_patterns.png")
        else:
            print("⚠ UNKNOWN STATE")
            results.append(("Suspicious Patterns", "UNKNOWN", "No docs"))

        # TEST 4: Financial Tracker
        print("\n" + "="*70)
        print("TEST 4: FINANCIAL TRACKER")
        print("="*70)
        page.locator('button:has-text("Financial Tracker")').first.click()
        time.sleep(3)
        content = page.content()

        if "Total Transactions" in content and "Suspicious Transactions" in content:
            print("✅ PASS - Financial tracker loaded")
            results.append(("Financial Tracker", "PASS", "Stats loaded"))
            page.screenshot(path="proof_financial.png")
        else:
            print("❌ FAIL - Tab didn't load")
            results.append(("Financial Tracker", "FAIL", "Not loaded"))

        browser.close()

    # Print summary
    print("\n" + "="*70)
    print("FINAL RESULTS")
    print("="*70)

    for feature, status, details in results:
        icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠"
        print(f"{icon} {feature:.<40} {status:>10} ({details})")

    passed = sum(1 for _, s, _ in results if s == "PASS")
    total = len(results)

    print(f"\n{passed}/{total} tests passed")
    print(f"\nScreenshots saved:")
    print("  - proof_ai_investigation.png")
    print("  - proof_network.png")
    print("  - proof_patterns.png")
    print("  - proof_financial.png")

    return passed == total

if __name__ == "__main__":
    success = prove_it()
    exit(0 if success else 1)
