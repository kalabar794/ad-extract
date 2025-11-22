#!/usr/bin/env python3
"""
Bulk Downloader for Epstein Documents
Downloads and imports documents from epstein_sources.json
"""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime
import time

# Import our database functions
from app import init_db, get_db, extract_entities
from pypdf import PdfReader
import sqlite3

class DocumentDownloader:
    def __init__(self, json_file='epstein_sources.json', download_dir='downloads'):
        self.json_file = json_file
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(exist_ok=True)

        # Load sources
        with open(json_file, 'r') as f:
            self.data = json.load(f)

        # Stats
        self.downloaded = 0
        self.failed = 0
        self.imported = 0
        self.skipped = 0

    def download_file(self, url, filename):
        """Download a file with progress indication"""
        try:
            print(f"  Downloading from: {url}")

            # Set user agent to avoid blocks
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }

            req = urllib.request.Request(url, headers=headers)

            with urllib.request.urlopen(req, timeout=300) as response:
                file_size = int(response.headers.get('Content-Length', 0))

                filepath = self.download_dir / filename

                # Download with progress
                downloaded = 0
                block_size = 8192

                with open(filepath, 'wb') as f:
                    while True:
                        chunk = response.read(block_size)
                        if not chunk:
                            break

                        f.write(chunk)
                        downloaded += len(chunk)

                        if file_size > 0:
                            percent = (downloaded / file_size) * 100
                            mb_downloaded = downloaded / (1024 * 1024)
                            mb_total = file_size / (1024 * 1024)
                            print(f"    Progress: {percent:.1f}% ({mb_downloaded:.1f}MB / {mb_total:.1f}MB)", end='\r')

                print(f"\n  ✓ Downloaded: {filename} ({downloaded / (1024*1024):.1f}MB)")
                return filepath

        except urllib.error.URLError as e:
            print(f"  ✗ Download failed: {e}")
            return None
        except Exception as e:
            print(f"  ✗ Error: {e}")
            return None

    def import_pdf_to_db(self, filepath):
        """Import a PDF file into the database"""
        try:
            filename = filepath.name

            # Check if already exists
            conn = get_db()
            c = conn.cursor()

            c.execute('SELECT id FROM documents WHERE filename = ?', (filename,))
            if c.fetchone():
                print(f"  ⊘ Already in database: {filename}")
                self.skipped += 1
                conn.close()
                return False

            # Extract text from PDF
            print(f"  Extracting text from: {filename}")
            try:
                reader = PdfReader(filepath)
                content = ''
                for page in reader.pages:
                    content += page.extract_text() + '\n'

                if not content.strip():
                    content = '[PDF extraction returned no text]'

            except Exception as e:
                content = f'[PDF extraction failed: {e}]'

            # Insert into database
            uploaded_date = datetime.now().isoformat()
            dest_path = Path('uploads/txt') / filename
            dest_path.parent.mkdir(parents=True, exist_ok=True)

            # Copy to uploads directory
            import shutil
            shutil.copy2(filepath, dest_path)

            c.execute('''INSERT INTO documents (filename, filepath, file_type, content, uploaded_date)
                        VALUES (?, ?, ?, ?, ?)''',
                     (filename, str(dest_path), 'txt', content, uploaded_date))
            doc_id = c.lastrowid

            # Add to full-text search
            c.execute('INSERT INTO documents_fts (doc_id, filename, content) VALUES (?, ?, ?)',
                     (doc_id, filename, content))

            # Extract entities
            print(f"  Extracting entities...")
            entities = extract_entities(content)

            entity_count = 0
            for entity_type, entity_names in entities.items():
                for name in entity_names:
                    # Insert or update entity
                    c.execute('''INSERT INTO entities (name, entity_type, mention_count)
                                VALUES (?, ?, 1)
                                ON CONFLICT(name, entity_type) DO UPDATE SET
                                mention_count = mention_count + 1''',
                             (name, entity_type[:-1]))  # Remove 's' from type

                    # Get entity_id
                    c.execute('SELECT id FROM entities WHERE name = ? AND entity_type = ?',
                             (name, entity_type[:-1]))
                    result = c.fetchone()
                    if result:
                        entity_id = result[0]

                        # Create mention
                        c.execute('''INSERT OR IGNORE INTO entity_mentions (doc_id, entity_id)
                                    VALUES (?, ?)''',
                                 (doc_id, entity_id))
                        entity_count += 1

            conn.commit()
            conn.close()

            print(f"  ✓ Imported: {filename} (ID: {doc_id}, {entity_count} entities)")
            self.imported += 1
            return True

        except Exception as e:
            print(f"  ✗ Import failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    def download_source(self, source):
        """Download a specific source"""
        source_id = source['id']
        source_name = source['name']

        print(f"\n{'='*70}")
        print(f"Source: {source_name}")
        print(f"ID: {source_id}")
        print(f"Pages: {source.get('page_count', 'Unknown')}")
        print(f"{'='*70}")

        download_urls = source.get('download_urls', {})

        # Try direct PDF first
        pdf_url = None
        if 'direct_pdf' in download_urls:
            pdf_url = download_urls['direct_pdf']
        elif 'guardian_source' in download_urls:
            pdf_url = download_urls['guardian_source']

        if pdf_url:
            # Generate filename
            filename = f"{source_id}.pdf"

            # Download
            filepath = self.download_file(pdf_url, filename)

            if filepath:
                self.downloaded += 1

                # Import to database
                self.import_pdf_to_db(filepath)
            else:
                self.failed += 1
        else:
            print(f"  ⚠ No direct PDF URL found - manual download required")
            print(f"  URL: {source.get('url', 'N/A')}")
            self.failed += 1

    def download_priority(self, priority_level='high_priority'):
        """Download sources by priority level"""
        priority_ids = self.data['download_priority'].get(priority_level, [])

        print(f"\n{'#'*70}")
        print(f"DOWNLOADING: {priority_level.upper().replace('_', ' ')}")
        print(f"Sources: {len(priority_ids)}")
        print(f"{'#'*70}")

        for source_id in priority_ids:
            # Find source by ID
            source = next((s for s in self.data['sources'] if s['id'] == source_id), None)

            if source:
                self.download_source(source)
                # Pause between downloads to be respectful
                time.sleep(2)
            else:
                print(f"\n✗ Source not found: {source_id}")

    def download_all_priorities(self):
        """Download all priority levels"""
        init_db()  # Initialize database

        print("\n" + "="*70)
        print("EPSTEIN DOCUMENT BULK DOWNLOADER")
        print("="*70)

        start_time = time.time()

        # Download in priority order
        for priority in ['high_priority', 'medium_priority', 'supplementary']:
            self.download_priority(priority)

        # Print summary
        elapsed = time.time() - start_time

        print("\n" + "="*70)
        print("DOWNLOAD SUMMARY")
        print("="*70)
        print(f"Downloaded:  {self.downloaded}")
        print(f"Imported:    {self.imported}")
        print(f"Skipped:     {self.skipped}")
        print(f"Failed:      {self.failed}")
        print(f"Time:        {elapsed/60:.1f} minutes")
        print("="*70)

def main():
    """Main entry point"""

    # Parse arguments
    if '--high-only' in sys.argv:
        downloader = DocumentDownloader()
        downloader.download_priority('high_priority')
    elif '--medium-only' in sys.argv:
        downloader = DocumentDownloader()
        downloader.download_priority('medium_priority')
    else:
        # Download all
        downloader = DocumentDownloader()
        downloader.download_all_priorities()

if __name__ == '__main__':
    print("\n" + "!"*70)
    print("EPSTEIN DOCUMENT BULK DOWNLOADER")
    print("!"*70)
    print("\nThis will download 50,000+ pages of court documents.")
    print("Estimated download size: 10-15 GB")
    print("Estimated time: 1-3 hours (depending on connection)")
    print("\nOptions:")
    print("  python3 bulk_downloader.py              - Download all sources")
    print("  python3 bulk_downloader.py --high-only  - High priority only (5GB)")
    print("  python3 bulk_downloader.py --medium-only - Medium priority only")
    print("\nPress Ctrl+C to cancel")
    print("!"*70 + "\n")

    try:
        input("Press ENTER to start download...")
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled by user")
        sys.exit(0)
