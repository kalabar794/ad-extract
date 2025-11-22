#!/usr/bin/env python3
"""
Priority Document Downloader
Downloads the most critical Epstein documents for investigation
"""

import requests
import os
import time
from urllib.parse import urlparse
import json

# Create downloads directory
DOWNLOAD_DIR = "/Users/jonathon/Downloads/EpsteinDocs"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

print("="*70)
print("EPSTEIN ARCHIVE - PRIORITY DOCUMENT DOWNLOADER")
print("="*70)
print(f"Download directory: {DOWNLOAD_DIR}")
print()

# Define priority downloads
PRIORITY_DOWNLOADS = [
    {
        "name": "DOJ Flight Logs - Part 1",
        "url": "https://www.justice.gov/ag/media/1391336/dl?inline",
        "filename": "DOJ_Flight_Logs_Part1.pdf",
        "priority": "HIGH",
        "category": "flight_logs",
        "description": "Official flight logs from U.S. v. Maxwell"
    },
    {
        "name": "DOJ Flight Logs - Part 2",
        "url": "https://www.justice.gov/ag/media/1391341/dl?inline",
        "filename": "DOJ_Flight_Logs_Part2.pdf",
        "priority": "HIGH",
        "category": "flight_logs"
    },
    {
        "name": "DOJ Flight Logs - Part 3",
        "url": "https://www.justice.gov/ag/media/1391346/dl?inline",
        "filename": "DOJ_Flight_Logs_Part3.pdf",
        "priority": "HIGH",
        "category": "flight_logs"
    },
    {
        "name": "DOJ Flight Logs - Part 4",
        "url": "https://www.justice.gov/ag/media/1391351/dl?inline",
        "filename": "DOJ_Flight_Logs_Part4.pdf",
        "priority": "HIGH",
        "category": "flight_logs"
    },
    {
        "name": "DOJ Flight Logs - Part 5",
        "url": "https://www.justice.gov/ag/media/1391356/dl?inline",
        "filename": "DOJ_Flight_Logs_Part5.pdf",
        "priority": "HIGH",
        "category": "flight_logs"
    },
    {
        "name": "DOJ Flight Logs - Part 6",
        "url": "https://www.justice.gov/ag/media/1391361/dl?inline",
        "filename": "DOJ_Flight_Logs_Part6.pdf",
        "priority": "HIGH",
        "category": "flight_logs"
    },
    {
        "name": "DOJ Contact Book (Redacted)",
        "url": "https://www.justice.gov/ag/media/1391366/dl?inline",
        "filename": "DOJ_Contact_Book.pdf",
        "priority": "HIGH",
        "category": "contacts"
    },
    {
        "name": "DOJ Masseuse List (Redacted)",
        "url": "https://www.justice.gov/ag/media/1391371/dl?inline",
        "filename": "DOJ_Masseuse_List.pdf",
        "priority": "HIGH",
        "category": "contacts"
    },
    {
        "name": "DOJ Evidence List",
        "url": "https://www.justice.gov/ag/media/1391376/dl?inline",
        "filename": "DOJ_Evidence_List.pdf",
        "priority": "MEDIUM",
        "category": "evidence"
    },
    {
        "name": "Guardian - 943 Pages Complete",
        "url": "https://uploads.guim.co.uk/2024/01/04/Final_Epstein_documents.pdf",
        "filename": "Guardian_943_Pages_Complete.pdf",
        "priority": "HIGH",
        "category": "court_docs",
        "size_mb": 502.6,
        "description": "Complete January 2024 unsealing - 943 pages"
    }
]

def download_file(url, filename, category, description=""):
    """Download a file with progress tracking"""
    filepath = os.path.join(DOWNLOAD_DIR, filename)

    # Skip if already downloaded
    if os.path.exists(filepath):
        file_size = os.path.getsize(filepath)
        print(f"✓ Already downloaded: {filename} ({file_size:,} bytes)")
        return True

    print(f"\n📥 Downloading: {description or filename}")
    print(f"   URL: {url[:60]}...")

    try:
        # Stream download with progress
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))

        with open(filepath, 'wb') as f:
            downloaded = 0
            start_time = time.time()

            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)

                    # Progress indicator every 5MB
                    if downloaded % (5 * 1024 * 1024) == 0 or downloaded == total_size:
                        elapsed = time.time() - start_time
                        speed = downloaded / elapsed / 1024 / 1024 if elapsed > 0 else 0

                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f"   Progress: {downloaded:,} / {total_size:,} bytes ({percent:.1f}%) - {speed:.2f} MB/s", end='\r')
                        else:
                            print(f"   Downloaded: {downloaded:,} bytes - {speed:.2f} MB/s", end='\r')

        print()  # New line after progress
        final_size = os.path.getsize(filepath)
        elapsed = time.time() - start_time
        print(f"✅ Downloaded: {filename} ({final_size:,} bytes in {elapsed:.1f}s)")
        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to download {filename}: {e}")
        # Clean up partial download
        if os.path.exists(filepath):
            os.remove(filepath)
        return False
    except KeyboardInterrupt:
        print(f"\n⚠️  Download interrupted: {filename}")
        # Clean up partial download
        if os.path.exists(filepath):
            os.remove(filepath)
        raise

def main():
    print("\n🎯 PRIORITY DOWNLOADS")
    print("-" * 70)

    # Count by priority
    high_priority = [d for d in PRIORITY_DOWNLOADS if d.get('priority') == 'HIGH']
    medium_priority = [d for d in PRIORITY_DOWNLOADS if d.get('priority') == 'MEDIUM']

    print(f"High Priority: {len(high_priority)} documents")
    print(f"Medium Priority: {len(medium_priority)} documents")
    print()

    # Download statistics
    successful = 0
    failed = 0
    skipped = 0

    print("Starting downloads...")
    print("=" * 70)

    try:
        for doc in PRIORITY_DOWNLOADS:
            result = download_file(
                doc['url'],
                doc['filename'],
                doc['category'],
                doc.get('description', doc['name'])
            )

            if result:
                if os.path.exists(os.path.join(DOWNLOAD_DIR, doc['filename'])):
                    successful += 1
                else:
                    skipped += 1
            else:
                failed += 1

            # Brief pause between downloads
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\n⚠️  Download interrupted by user")

    # Summary
    print("\n" + "=" * 70)
    print("DOWNLOAD SUMMARY")
    print("=" * 70)
    print(f"✅ Successful: {successful}")
    print(f"⏭️  Skipped (already downloaded): {skipped}")
    print(f"❌ Failed: {failed}")
    print()

    # List downloaded files
    if successful > 0 or skipped > 0:
        print("📁 Downloaded files location:")
        print(f"   {DOWNLOAD_DIR}")
        print()
        print("📋 Files by category:")

        categories = {}
        for doc in PRIORITY_DOWNLOADS:
            filepath = os.path.join(DOWNLOAD_DIR, doc['filename'])
            if os.path.exists(filepath):
                cat = doc['category']
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(doc['filename'])

        for cat, files in sorted(categories.items()):
            print(f"\n   {cat.upper()}:")
            for f in files:
                print(f"   - {f}")

    print("\n" + "=" * 70)
    print("NEXT STEPS")
    print("=" * 70)
    print("1. Upload flight log PDFs to the web interface at http://localhost:5001")
    print("2. Click 'Flight Logs' tab → 'Import from Document'")
    print("3. Upload contact book PDF → 'Email Intelligence' tab → 'Import'")
    print("4. Upload Guardian 943 pages → 'Financial Tracker' → 'Import'")
    print()
    print("🔍 The system will automatically:")
    print("   - Extract flight manifests and passenger lists")
    print("   - Flag minors traveling with adults")
    print("   - Build co-travel networks")
    print("   - Extract financial transactions")
    print("   - Detect suspicious payments")
    print("=" * 70)

if __name__ == '__main__':
    main()
