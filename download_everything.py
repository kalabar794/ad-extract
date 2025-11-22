#!/usr/bin/env python3
"""
Download EVERYTHING from every source in the JSON
NO EXCUSES - GET IT ALL
"""

import requests
import os
import time
from pathlib import Path
import zipfile

DOWNLOAD_DIR = "/Users/jonathon/Downloads/EpsteinDocs"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

print("="*70)
print("DOWNLOADING ALL EPSTEIN DOCUMENTS - EVERY SOURCE")
print("="*70)

# ALL SOURCES - NO HOLDING BACK
DOWNLOADS = [
    # Internet Archive - Multiple collections
    {
        "name": "Internet Archive - Final Epstein Documents PDF",
        "url": "https://archive.org/download/final-epstein-documents/final-epstein-documents.pdf",
        "file": "InternetArchive_Final_Documents.pdf"
    },
    {
        "name": "Internet Archive - Alternative Collection",
        "url": "https://archive.org/download/j-epstein-files/j-epstein-files.zip",
        "file": "InternetArchive_Alternative.zip"
    },
    {
        "name": "Internet Archive - 943 Pages Collection",
        "url": "https://archive.org/download/1324-epstein-documents-943-pages_202401/1324-epstein-documents-943-pages.pdf",
        "file": "InternetArchive_943_Pages.pdf"
    },
    # Guardian source
    {
        "name": "Guardian Original PDF",
        "url": "https://uploads.guim.co.uk/2024/01/04/Final_Epstein_documents.pdf",
        "file": "Guardian_Final_Epstein_Documents.pdf"
    },
    # DocumentCloud
    {
        "name": "DocumentCloud Epstein Docs",
        "url": "https://www.documentcloud.org/documents/6250471-Epstein-Docs.pdf",
        "file": "DocumentCloud_Epstein_Docs.pdf"
    },
    # Try DOJ again with different paths
    {
        "name": "DOJ AG Letter",
        "url": "https://www.justice.gov/ag/media/1391331/dl?inline",
        "file": "DOJ_AG_Letter.pdf"
    },
]

def download_with_progress(url, filepath, name):
    """Download file with aggressive retry"""

    if os.path.exists(filepath):
        size = os.path.getsize(filepath)
        print(f"✓ Already have: {name} ({size:,} bytes)")
        return True

    print(f"\n📥 {name}")
    print(f"   {url}")

    max_retries = 3
    for attempt in range(max_retries):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }

            response = requests.get(url, stream=True, timeout=120, headers=headers, allow_redirects=True)

            if response.status_code == 404:
                print(f"   ❌ 404 Not Found")
                return False

            response.raise_for_status()

            total = int(response.headers.get('content-length', 0))

            with open(filepath, 'wb') as f:
                downloaded = 0
                start = time.time()

                for chunk in response.iter_content(chunk_size=1024*1024):  # 1MB chunks
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)

                        if downloaded % (10*1024*1024) == 0:  # Every 10MB
                            elapsed = time.time() - start
                            speed = downloaded / elapsed / 1024 / 1024 if elapsed > 0 else 0
                            if total > 0:
                                pct = downloaded / total * 100
                                print(f"   {downloaded:,} / {total:,} bytes ({pct:.1f}%) @ {speed:.1f} MB/s", end='\r')
                            else:
                                print(f"   {downloaded:,} bytes @ {speed:.1f} MB/s", end='\r')

            final_size = os.path.getsize(filepath)
            elapsed = time.time() - start
            print(f"\n   ✅ {final_size:,} bytes in {elapsed:.1f}s")
            return True

        except Exception as e:
            print(f"   ⚠️  Attempt {attempt+1}/{max_retries} failed: {e}")
            if attempt < max_retries - 1:
                print(f"   Retrying in 2 seconds...")
                time.sleep(2)
            else:
                if os.path.exists(filepath):
                    os.remove(filepath)
                return False

    return False

def extract_zips():
    """Extract any ZIP files"""
    print("\n" + "="*70)
    print("EXTRACTING ZIP FILES")
    print("="*70)

    for file in Path(DOWNLOAD_DIR).glob("*.zip"):
        print(f"\n📦 Extracting: {file.name}")
        try:
            extract_dir = DOWNLOAD_DIR / file.stem
            extract_dir.mkdir(exist_ok=True)

            with zipfile.ZipFile(file, 'r') as zf:
                zf.extractall(extract_dir)

            print(f"   ✅ Extracted to: {extract_dir}")
        except Exception as e:
            print(f"   ❌ Failed: {e}")

def main():
    successful = 0
    failed = 0
    skipped = 0

    for item in DOWNLOADS:
        filepath = os.path.join(DOWNLOAD_DIR, item['file'])
        result = download_with_progress(item['url'], filepath, item['name'])

        if result:
            successful += 1
        elif os.path.exists(filepath):
            skipped += 1
        else:
            failed += 1

        time.sleep(0.5)

    # Extract ZIPs
    extract_zips()

    # Final summary
    print("\n" + "="*70)
    print("DOWNLOAD COMPLETE")
    print("="*70)
    print(f"✅ Downloaded: {successful}")
    print(f"⏭️  Already had: {skipped}")
    print(f"❌ Failed: {failed}")
    print()

    # List all files
    print("📁 All files in download directory:")
    all_files = sorted(Path(DOWNLOAD_DIR).rglob("*.pdf"))
    total_size = 0

    for f in all_files:
        size = f.stat().st_size
        total_size += size
        print(f"   {f.name:50} {size/1024/1024:>8.1f} MB")

    print(f"\n   TOTAL: {len(all_files)} PDFs = {total_size/1024/1024/1024:.2f} GB")
    print("="*70)

if __name__ == '__main__':
    main()
