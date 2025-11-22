#!/usr/bin/env python3
"""
Bulk upload ALL Epstein documents to the investigation system
Upload via Flask API - NO MANUAL CLICKING
"""

import requests
import os
from pathlib import Path
import time

FLASK_URL = "http://localhost:5001"
UPLOAD_ENDPOINT = f"{FLASK_URL}/upload"

# Find ALL Epstein PDFs
SEARCH_PATHS = [
    "/Users/jonathon/Downloads",
    "/Users/jonathon/Downloads/EpsteinDocs"
]

print("="*70)
print("BULK UPLOAD - ALL EPSTEIN DOCUMENTS")
print("="*70)

def find_all_pdfs():
    """Find all Epstein-related PDFs"""
    pdfs = []

    for search_path in SEARCH_PATHS:
        if not os.path.exists(search_path):
            continue

        for pdf in Path(search_path).rglob("*.pdf"):
            # Skip if tiny (likely error page)
            if pdf.stat().st_size < 1000:
                continue

            pdfs.append(pdf)

    return pdfs

def upload_file(filepath):
    """Upload file to Flask app"""
    filename = filepath.name
    filesize = filepath.stat().st_size

    print(f"\n📤 Uploading: {filename}")
    print(f"   Size: {filesize/1024/1024:.1f} MB")

    try:
        with open(filepath, 'rb') as f:
            files = {'files': (filename, f, 'application/pdf')}
            response = requests.post(UPLOAD_ENDPOINT, files=files, timeout=300)

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Uploaded successfully")
            if 'doc_id' in data:
                print(f"   Document ID: {data['doc_id']}")
            return True
        else:
            print(f"   ❌ Upload failed: {response.status_code}")
            print(f"   {response.text[:200]}")
            return False

    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    # Check if Flask is running
    try:
        response = requests.get(FLASK_URL, timeout=5)
        print(f"✓ Flask app is running at {FLASK_URL}\n")
    except:
        print(f"❌ Flask app is NOT running at {FLASK_URL}")
        print(f"   Start it with: python3 app.py")
        return

    # Find all PDFs
    pdfs = find_all_pdfs()
    print(f"Found {len(pdfs)} PDF files\n")
    print("="*70)

    if not pdfs:
        print("No PDFs found!")
        return

    # Upload each one
    uploaded = 0
    failed = 0

    for pdf in pdfs:
        result = upload_file(pdf)
        if result:
            uploaded += 1
        else:
            failed += 1

        # Brief pause between uploads
        time.sleep(1)

    # Summary
    print("\n" + "="*70)
    print("UPLOAD COMPLETE")
    print("="*70)
    print(f"✅ Uploaded: {uploaded}")
    print(f"❌ Failed: {failed}")
    print()
    print("Next: Go to http://localhost:5001 and:")
    print("  1. Click 'Financial Tracker' → 'View Suspicious Transactions'")
    print("  2. Click 'Flight Logs' → 'View Minor Alerts'")
    print("  3. Click 'Email Intelligence' → 'View Suspicious Emails'")
    print("="*70)

if __name__ == '__main__':
    main()
