#!/usr/bin/env python3
"""
Playwright test for AI Investigation Report UI
"""

from playwright.sync_api import sync_playwright
import time
import json

def test_ai_investigation_report():
    """Test the AI Investigation Report tab"""

    with sync_playwright() as p:
        print("=" * 70)
        print("PLAYWRIGHT UI TEST - AI INVESTIGATION REPORT")
        print("=" * 70)

        # Launch browser
        print("\n1. Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Navigate to app
        print("2. Navigating to http://localhost:5001...")
        try:
            page.goto("http://localhost:5001", wait_until="networkidle", timeout=10000)
            print("   ✓ Page loaded")
        except Exception as e:
            print(f"   ✗ Failed to load page: {e}")
            browser.close()
            return False

        # Wait for page to be ready
        time.sleep(2)

        # Check if AI Investigation tab exists
        print("\n3. Looking for AI Investigation tab...")
        ai_tab = page.locator('button:has-text("AI Investigation")')
        if ai_tab.count() == 0:
            print("   ✗ AI Investigation tab not found!")
            browser.close()
            return False
        print("   ✓ AI Investigation tab found")

        # Click AI Investigation tab
        print("\n4. Clicking AI Investigation tab...")
        ai_tab.click()
        time.sleep(1)
        print("   ✓ Tab clicked")

        # Wait for report to load
        print("\n5. Waiting for report to load...")
        try:
            # Wait for the executive summary to appear
            page.wait_for_selector("text=Executive Summary", timeout=15000)
            print("   ✓ Report loaded")
        except Exception as e:
            print(f"   ✗ Report failed to load: {e}")
            # Take screenshot for debugging
            page.screenshot(path="ai_report_error.png")
            print("   Screenshot saved to ai_report_error.png")
            browser.close()
            return False

        # Check for actual suspect names (not "Unknown")
        print("\n6. Checking for actual suspect names...")
        page_content = page.content()

        # Look for key suspects
        suspects_found = []
        expected_suspects = ["JEE", "jeffrey E.", "Jeffrey Epstein", "Trump", "Bill Clinton"]

        for suspect in expected_suspects:
            if suspect in page_content:
                suspects_found.append(suspect)
                print(f"   ✓ Found: {suspect}")

        if len(suspects_found) == 0:
            print("   ✗ No suspects found in report!")
            page.screenshot(path="ai_report_no_suspects.png")
            browser.close()
            return False

        print(f"\n   ✓ Found {len(suspects_found)}/{len(expected_suspects)} expected suspects")

        # Check that we DON'T have "Unknown" placeholders in suspect names
        print("\n7. Checking for 'Unknown' placeholders in suspects...")
        unknown_count = page_content.count("Unknown")
        role_na_count = page_content.count("Role: N/A")
        unknown_suspect_count = page_content.count("<strong style=\"color: #fff;\">Unknown</strong>")

        if unknown_suspect_count > 0 or role_na_count > 0:
            print(f"   ✗ Found {unknown_suspect_count} 'Unknown' suspects and {role_na_count} 'Role: N/A'")
            print("   Report still showing placeholder suspects!")
            browser.close()
            return False

        print(f"   ✓ No placeholder suspects detected (total 'Unknown' in page: {unknown_count}, which is acceptable)")

        # Check for evidence types
        print("\n8. Checking for evidence types...")
        evidence_types = ["Communications", "Financial", "Flight", "Victim"]
        evidence_found = []

        for evidence_type in evidence_types:
            if evidence_type in page_content:
                evidence_found.append(evidence_type)
                print(f"   ✓ Found evidence type: {evidence_type}")

        if len(evidence_found) == 0:
            print("   ✗ No evidence types found!")
            browser.close()
            return False

        # Check for investigative leads section
        print("\n9. Checking for investigative leads...")
        if "Priority 1" in page_content or "investigative_leads" in page_content:
            print("   ✓ Investigative leads section found")
        else:
            print("   ⚠ No investigative leads section detected")

        # Get the JSON data from the page
        print("\n10. Extracting report JSON data...")
        try:
            # Try to get the data from the pre element that shows JSON
            pre_element = page.locator("pre").first
            if pre_element.count() > 0:
                json_text = pre_element.inner_text()
                report_data = json.loads(json_text)

                suspect_count = len(report_data.get("key_suspects", []))
                print(f"   ✓ Report contains {suspect_count} suspects")

                if suspect_count > 0:
                    print(f"\n   Top 3 suspects:")
                    for i, suspect in enumerate(report_data["key_suspects"][:3], 1):
                        print(f"     {i}. {suspect['name']} - {suspect['role']}")
                        print(f"        Evidence: {suspect['evidence'][:100]}...")
            else:
                print("   ⚠ Could not extract JSON data")
        except Exception as e:
            print(f"   ⚠ Error parsing JSON: {e}")

        # Take a screenshot of the report
        print("\n11. Taking screenshot...")
        page.screenshot(path="ai_report_success.png", full_page=True)
        print("   ✓ Screenshot saved to ai_report_success.png")

        # Close browser
        print("\n12. Closing browser...")
        browser.close()
        print("   ✓ Browser closed")

        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED!")
        print("=" * 70)
        print("\nSummary:")
        print(f"  - Suspects found: {len(suspects_found)}/{len(expected_suspects)}")
        print(f"  - Evidence types: {len(evidence_found)}/{len(evidence_types)}")
        print(f"  - No placeholder data: ✓")
        print(f"  - Screenshots saved: ✓")

        return True

if __name__ == "__main__":
    success = test_ai_investigation_report()
    exit(0 if success else 1)
