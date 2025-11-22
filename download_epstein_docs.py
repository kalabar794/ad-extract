#!/usr/bin/env python3
"""
Epstein Document Downloader
Downloads and imports Epstein documents from legitimate public sources
"""

import requests
import os
import time
from pathlib import Path

# Document sources from epstein_sources.json
DOWNLOAD_SOURCES = {
    "phase_1_priority": [
        {
            "name": "House Oversight 20,000 Estate Documents (Nov 2025)",
            "url": "https://oversight.house.gov/release/oversight-committee-releases-additional-epstein-estate-documents/",
            "size": "Large",
            "priority": 1,
            "notes": "Most recent - includes Trump, Bannon, Chomsky, Summers emails"
        },
        {
            "name": "House Oversight 33,295 DOJ Records (Sept 2025)",
            "url": "https://oversight.house.gov/release/oversight-committee-releases-epstein-records-provided-by-the-department-of-justice/",
            "size": "Very Large",
            "priority": 2,
            "notes": "Comprehensive DOJ investigative records"
        },
        {
            "name": "Guardian - 943 Pages Unsealed (Jan 2024)",
            "url": "https://uploads.guim.co.uk/2024/01/04/Final_Epstein_documents.pdf",
            "size": "502 MB",
            "priority": 3,
            "direct_download": True,
            "notes": "Court depositions, 150+ associates named"
        }
    ],

    "phase_2_supplementary": [
        {
            "name": "DOJ Feb 2025 Release",
            "url": "https://www.justice.gov/opa/pr/attorney-general-pamela-bondi-releases-first-phase-declassified-epstein-files",
            "size": "200+ pages",
            "priority": 4,
            "notes": "FBI files, flight logs, contact book"
        },
        {
            "name": "Internet Archive - 943 Pages",
            "url": "https://archive.org/download/final-epstein-documents/final-epstein-documents.pdf",
            "size": "502 MB",
            "priority": 5,
            "direct_download": True,
            "notes": "Backup of Guardian release"
        }
    ]
}

# New people to look for based on research
PERSONS_OF_INTEREST = [
    "Larry Summers", "Lawrence Summers",
    "Noam Chomsky",
    "Steve Bannon", "Stephen Bannon",
    "Elon Musk",
    "Peter Thiel",
    "Michael Wolff",
    "Mort Zuckerman",
    "Jimmy Cayne",
    "Ace Greenberg",
    "Sergey Brin",
    "Larry Page",
    "Kevin Rudd",
    "Graydon Carter",
    "Reid Weingarten",
    "Steven Hoffenberg",
    "Robert Maxwell",
    "Jean Luc Brunel",
    "Les Wexner", "Leslie Wexner",
    "Ehud Barak",
    "George Mitchell",
    "Bill Richardson",
    "Stephen Hawking"
]

def create_download_directory():
    """Create directory for downloads"""
    download_dir = Path("epstein_downloads")
    download_dir.mkdir(exist_ok=True)
    return download_dir

def download_file(url, filename, download_dir):
    """Download a file with progress indication"""
    filepath = download_dir / filename

    if filepath.exists():
        print(f"  ✓ Already exists: {filename}")
        return filepath

    print(f"  Downloading: {filename}")
    print(f"  URL: {url}")

    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))

        with open(filepath, 'wb') as f:
            if total_size == 0:
                f.write(response.content)
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
        return None

def download_guardian_943_pages(download_dir):
    """Download the Guardian 943-page PDF"""
    print("\n" + "="*60)
    print("DOWNLOADING: Guardian 943-Page Unsealed Documents")
    print("="*60)

    url = "https://uploads.guim.co.uk/2024/01/04/Final_Epstein_documents.pdf"
    filename = "Final_Epstein_documents.pdf"

    return download_file(url, filename, download_dir)

def download_internet_archive_backup(download_dir):
    """Download Internet Archive backup"""
    print("\n" + "="*60)
    print("DOWNLOADING: Internet Archive Backup")
    print("="*60)

    url = "https://archive.org/download/final-epstein-documents/final-epstein-documents.pdf"
    filename = "IA_final-epstein-documents.pdf"

    return download_file(url, filename, download_dir)

def generate_download_instructions():
    """Generate instructions for manual downloads"""
    print("\n" + "="*60)
    print("MANUAL DOWNLOAD REQUIRED")
    print("="*60)

    print("\nSome sources require manual download from their websites:")
    print("\n1. House Oversight 20,000 Estate Documents (Nov 2025):")
    print("   URL: https://oversight.house.gov/release/oversight-committee-releases-additional-epstein-estate-documents/")
    print("   → Look for download links on the page")
    print("   → Save all PDFs to: epstein_downloads/")

    print("\n2. House Oversight 33,295 DOJ Records (Sept 2025):")
    print("   URL: https://oversight.house.gov/release/oversight-committee-releases-epstein-records-provided-by-the-department-of-justice/")
    print("   → Download all available documents")
    print("   → Save to: epstein_downloads/")

    print("\n3. DOJ February 2025 Release:")
    print("   URL: https://www.justice.gov/opa/pr/attorney-general-pamela-bondi-releases-first-phase-declassified-epstein-files")
    print("   → Download individual documents (flight logs, contact book, etc.)")
    print("   → Save to: epstein_downloads/")

def scan_for_persons_of_interest(text, filename):
    """Scan document text for persons of interest"""
    found_people = []
    text_lower = text.lower()

    for person in PERSONS_OF_INTEREST:
        if person.lower() in text_lower:
            found_people.append(person)

    if found_people:
        print(f"\n  🎯 Found in {filename}:")
        for person in found_people:
            print(f"    - {person}")

    return found_people

def main():
    """Main download orchestration"""
    print("="*60)
    print("EPSTEIN DOCUMENT DOWNLOADER")
    print("="*60)
    print("\nThis script will download publicly available Epstein documents")
    print("from legitimate government and news sources.")
    print("\nEstimated total size: 5-10 GB")
    print("Estimated time: 30-60 minutes depending on connection")

    # Auto-proceed when run non-interactively
    import sys
    if sys.stdin.isatty():
        proceed = input("\nProceed with download? (yes/no): ")
        if proceed.lower() not in ['yes', 'y']:
            print("Download cancelled.")
            return
    else:
        print("\nAuto-proceeding with download...")
        print("(Running in non-interactive mode)")

    # Create download directory
    download_dir = create_download_directory()
    print(f"\n✓ Download directory: {download_dir.absolute()}")

    # Download direct PDFs
    downloaded_files = []

    # Guardian 943 pages
    file1 = download_guardian_943_pages(download_dir)
    if file1:
        downloaded_files.append(file1)

    time.sleep(2)  # Be respectful with requests

    # Internet Archive backup
    file2 = download_internet_archive_backup(download_dir)
    if file2:
        downloaded_files.append(file2)

    # Generate manual download instructions
    generate_download_instructions()

    # Summary
    print("\n" + "="*60)
    print("DOWNLOAD SUMMARY")
    print("="*60)
    print(f"\nAutomatically downloaded: {len(downloaded_files)} files")
    for f in downloaded_files:
        size_mb = f.stat().st_size / 1024 / 1024
        print(f"  ✓ {f.name} ({size_mb:.1f} MB)")

    print("\nNext steps:")
    print("1. Complete manual downloads from the URLs above")
    print("2. Run: python3 bulk_import_documents.py")
    print("   → This will import all PDFs from epstein_downloads/")
    print("3. The system will automatically:")
    print("   - Extract text from PDFs")
    print("   - Identify entities (people, places, dates)")
    print("   - Build searchable index")
    print("   - Deduplicate content")

if __name__ == '__main__':
    main()
