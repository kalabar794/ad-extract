#!/usr/bin/env python3
"""
Enhanced Epstein Document Downloader
Downloads from FBI, DOJ, court archives, and other legitimate sources
"""

import requests
import os
import time
from pathlib import Path

DOWNLOAD_SOURCES = [
    {
        "name": "Epstein Flight Logs (Unredacted) - Archive.org",
        "url": "https://ia801606.us.archive.org/30/items/epstein-flight-logs-unredacted_202304/EPSTEIN%20FLIGHT%20LOGS%20UNREDACTED.pdf",
        "filename": "Epstein_Flight_Logs_Unredacted.pdf"
    },
    {
        "name": "Newsweek Epstein Documents (Full)",
        "url": "https://d.newsweek.com/en/file/468909/jeffrey-epstein-documents-full.pdf",
        "filename": "Newsweek_Epstein_Documents_Full.pdf"
    },
    {
        "name": "SEC Epstein Deposition & Exhibits",
        "url": "https://www.sec.gov/files/epstein-deposition-and-exhibits.pdf",
        "filename": "SEC_Epstein_Deposition_Exhibits.pdf"
    },
    {
        "name": "Ghislaine Maxwell 2016 Deposition",
        "url": "https://www.courthousenews.com/wp-content/uploads/2020/10/Maxwell-deposition-2016.pdf",
        "filename": "Maxwell_Deposition_2016.pdf"
    },
    {
        "name": "Maxwell Trial Transcript (Dec 6, 2021)",
        "url": "https://www.justfacts.com/document/ghislaine_maxwell_trial_transcript_12.6.21.pdf",
        "filename": "Maxwell_Trial_Transcript_2021-12-06.pdf"
    },
    {
        "name": "DOJ Epstein Indictment",
        "url": "https://www.justice.gov/usao-sdny/press-release/file/1180481/download",
        "filename": "DOJ_Epstein_Indictment.pdf"
    },
    {
        "name": "DOJ Maxwell Indictment",
        "url": "https://www.justice.gov/usao-sdny/press-release/file/1291491/download",
        "filename": "DOJ_Maxwell_Indictment.pdf"
    },
    {
        "name": "US Virgin Islands v JPMorgan Lawsuit",
        "url": "https://static.foxbusiness.com/foxbusiness.com/content/uploads/2022/12/U.S.-Virgin-Islands-v-JP-Morgan.pdf",
        "filename": "USVI_v_JPMorgan_Complaint.pdf"
    }
]

def download_file(url, filename, download_dir):
    """Download a file with progress indication"""
    filepath = download_dir / filename

    if filepath.exists():
        size_mb = filepath.stat().st_size / 1024 / 1024
        print(f"  ✓ Already exists: {filename} ({size_mb:.1f} MB)")
        return filepath

    print(f"  Downloading: {filename}")
    print(f"  URL: {url}")

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, stream=True, timeout=60, headers=headers, allow_redirects=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))

        with open(filepath, 'wb') as f:
            if total_size == 0:
                f.write(response.content)
                print(f"  ✓ Downloaded: {filename}")
            else:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        percent = (downloaded / total_size) * 100
                        print(f"    Progress: {percent:.1f}%", end='\r')

                print(f"\n  ✓ Downloaded: {filename} ({total_size / 1024 / 1024:.1f} MB)")

        return filepath

    except Exception as e:
        print(f"  ✗ Error downloading {filename}: {e}")
        if filepath.exists():
            filepath.unlink()  # Delete partial file
        return None

def main():
    """Main download orchestration"""
    print("=" * 70)
    print("ENHANCED EPSTEIN DOCUMENT DOWNLOADER")
    print("=" * 70)
    print(f"\nDownloading {len(DOWNLOAD_SOURCES)} documents from legitimate sources")
    print("Estimated total size: 500 MB - 2 GB")

    # Create download directory
    download_dir = Path("epstein_downloads")
    download_dir.mkdir(exist_ok=True)
    print(f"\n✓ Download directory: {download_dir.absolute()}")

    # Download all files
    downloaded_files = []
    failed_downloads = []

    for i, source in enumerate(DOWNLOAD_SOURCES, 1):
        print(f"\n[{i}/{len(DOWNLOAD_SOURCES)}] " + "=" * 60)
        print(f"SOURCE: {source['name']}")
        print("=" * 70)

        result = download_file(source['url'], source['filename'], download_dir)

        if result:
            downloaded_files.append(result)
        else:
            failed_downloads.append(source['name'])

        # Be respectful with requests
        time.sleep(2)

    # Summary
    print("\n" + "=" * 70)
    print("DOWNLOAD SUMMARY")
    print("=" * 70)
    print(f"\nSuccessfully available: {len(downloaded_files)} files")

    total_size = 0
    for f in downloaded_files:
        size_mb = f.stat().st_size / 1024 / 1024
        total_size += size_mb
        print(f"  ✓ {f.name} ({size_mb:.1f} MB)")

    print(f"\nTotal size: {total_size:.1f} MB")

    if failed_downloads:
        print(f"\nFailed downloads: {len(failed_downloads)}")
        for name in failed_downloads:
            print(f"  ✗ {name}")

    print("\n" + "=" * 70)
    print("NEXT STEP: Import to database")
    print("=" * 70)
    print("\nRun: python3 bulk_import.py epstein_downloads/")
    print("\nThe import script will:")
    print("  - Skip files already in database (no duplicates)")
    print("  - Extract text from PDFs")
    print("  - Identify entities (people, places, dates)")
    print("  - Build searchable index")

if __name__ == '__main__':
    main()
