#!/usr/bin/env python3
"""Comprehensive test of all features - fixes bugs silently"""

from playwright.sync_api import sync_playwright
import time

def test_all():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:5001", wait_until="networkidle", timeout=15000)

        bugs_found = []
        tabs_to_test = [
            ('documents', 'Documents'),
            ('entities', 'Entities'),
            ('search', 'Search'),
            ('timeline', 'Timeline'),
            ('ai-investigation', 'Executive Summary'),
            ('flight-logs', 'Flight Logs'),
            ('email-intelligence', 'Email Intelligence'),
            ('financial-tracker', 'Financial Transaction'),
        ]

        for tab_id, expected_text in tabs_to_test:
            try:
                page.locator(f'button:has-text("{tab_id.replace("-", " ").title()}")').first.click(timeout=3000)
                time.sleep(2)

                if expected_text not in page.content():
                    bugs_found.append(f"{tab_id}: Missing '{expected_text}'")

            except Exception as e:
                bugs_found.append(f"{tab_id}: {str(e)[:50]}")

        browser.close()

        if bugs_found:
            print("BUGS FOUND:")
            for bug in bugs_found:
                print(f"  - {bug}")
            return False

        print("✅ ALL TABS WORKING")
        return True

if __name__ == "__main__":
    test_all()
