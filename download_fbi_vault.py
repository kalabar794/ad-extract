#!/usr/bin/env python3
"""
FBI Vault Epstein Document Downloader
Downloads all FBI Epstein investigation files from vault.fbi.gov
"""

import requests
import os
import time
from datetime import datetime
import sqlite3
from pathlib import Path

class FBIVaultDownloader:
    def __init__(self):
        self.base_url = "https://vault.fbi.gov"
        self.download_dir = "fbi_vault_epstein"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

        # Create download directory
        os.makedirs(self.download_dir, exist_ok=True)

    def download_file(self, url, filename):
        """Download a file from URL"""
        filepath = os.path.join(self.download_dir, filename)

        # Skip if already downloaded
        if os.path.exists(filepath):
            file_size = os.path.getsize(filepath)
            if file_size > 1000:  # Skip if file is larger than 1KB (likely complete)
                print(f"✓ Already downloaded: {filename} ({file_size:,} bytes)")
                return filepath

        try:
            print(f"⬇️  Downloading: {filename}")
            response = self.session.get(url, timeout=30, stream=True)
            response.raise_for_status()

            # Write file in chunks
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

            file_size = os.path.getsize(filepath)
            print(f"✅ Downloaded: {filename} ({file_size:,} bytes)")
            time.sleep(1)  # Be polite to FBI servers
            return filepath

        except Exception as e:
            print(f"❌ Error downloading {filename}: {e}")
            return None

    def download_epstein_files(self):
        """Download all Epstein FBI vault files"""

        # FBI Vault Epstein files - these are the known parts
        # Format: (part_number, direct_pdf_url)
        files = [
            # Part 1 of 22 (Main investigation file)
            (1, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2001%20of%2022/view"),
            (2, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2002%20of%2022/view"),
            (3, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2003%20of%2022/view"),
            (4, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2004%20of%2022/view"),
            (5, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2005%20of%2022/view"),
            (6, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2006%20of%2022/view"),
            (7, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2007%20of%2022/view"),
            (8, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2008%20of%2022/view"),
            (9, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2009%20of%2022/view"),
            (10, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2010%20of%2022/view"),
            (11, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2011%20of%2022/view"),
            (12, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2012%20of%2022/view"),
            (13, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2013%20of%2022/view"),
            (14, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2014%20of%2022/view"),
            (15, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2015%20of%2022/view"),
            (16, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2016%20of%2022/view"),
            (17, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2017%20of%2022/view"),
            (18, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2018%20of%2022/view"),
            (19, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2019%20of%2022/view"),
            (20, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2020%20of%2022/view"),
            (21, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2021%20of%2022/view"),
            (22, f"{self.base_url}/Jeffrey%20Epstein/Jeffrey%20Epstein%20Part%2022%20of%2022/view"),
        ]

        print("=" * 70)
        print("FBI VAULT EPSTEIN FILES DOWNLOADER")
        print("=" * 70)
        print(f"Target: {len(files)} files")
        print(f"Destination: {self.download_dir}/")
        print("=" * 70)

        downloaded = []

        for part_num, url in files:
            filename = f"FBI_Epstein_Part_{part_num:02d}_of_22.pdf"

            # Try to get the actual PDF download link
            pdf_url = url.replace('/view', '/@@download/file')

            filepath = self.download_file(pdf_url, filename)
            if filepath:
                downloaded.append(filepath)

        print("\n" + "=" * 70)
        print(f"✅ Download Complete: {len(downloaded)}/{len(files)} files")
        print("=" * 70)

        return downloaded

def import_to_database(files):
    """Import downloaded FBI files into the investigation database"""
    print("\n" + "=" * 70)
    print("IMPORTING TO DATABASE")
    print("=" * 70)

    # Import using existing import script
    import sys
    sys.path.insert(0, os.path.dirname(__file__))

    try:
        from bulk_import import import_documents_to_db

        # Import all downloaded files
        stats = import_documents_to_db('fbi_vault_epstein')

        print("\n" + "=" * 70)
        print("✅ DATABASE IMPORT COMPLETE")
        print("=" * 70)
        print(f"Imported: {stats.get('imported', 0)} documents")
        print(f"Skipped: {stats.get('skipped', 0)} (already in database)")
        print(f"Errors: {stats.get('errors', 0)}")
        print("=" * 70)

    except ImportError:
        print("⚠️  bulk_import.py not found - files downloaded but not imported")
        print(f"Run: python3 bulk_import.py fbi_vault_epstein")

def main():
    downloader = FBIVaultDownloader()

    print("\n📥 Downloading FBI Vault Epstein Files...")
    print("=" * 70)

    # Download files
    files = downloader.download_epstein_files()

    if files:
        print(f"\n✅ Successfully downloaded {len(files)} FBI vault files")

        # Ask to import
        import_now = input("\n📦 Import files to database now? (y/n): ").lower().strip()

        if import_now == 'y':
            import_to_database(files)
        else:
            print("\n📝 Files downloaded to: fbi_vault_epstein/")
            print("To import later, run: python3 bulk_import.py fbi_vault_epstein")
    else:
        print("\n❌ No files were downloaded")

if __name__ == '__main__':
    main()
