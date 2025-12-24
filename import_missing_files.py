#!/usr/bin/env python3
"""
Import Missing Files from Hugging Face EPSTEIN_FILES_20K Dataset
Downloads and imports files we're currently missing
"""

import sqlite3
from datasets import load_dataset
import re
from datetime import datetime
import time

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def get_local_files():
    """Get set of files already in database"""
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT filename FROM documents')
    local_files = {row['filename'] for row in c.fetchall()}
    conn.close()
    return local_files

def import_missing_documents():
    """Download dataset and import missing files"""

    print("Loading Hugging Face dataset...")
    dataset = load_dataset("tensonaut/EPSTEIN_FILES_20K", split="train")
    print(f"✓ Dataset loaded: {len(dataset)} files")

    # Get local files
    local_files = get_local_files()
    print(f"✓ Local database has {len(local_files)} files")

    # Import missing files
    conn = get_db()
    c = conn.cursor()

    imported = 0
    skipped = 0
    errors = []

    print(f"\n🔄 Starting import...\n")

    for i, item in enumerate(dataset):
        filename = item['filename']
        # Clean filename - remove "IMAGES-###-" prefix if present
        clean_name = re.sub(r'^IMAGES-\d+-', '', filename)

        # Skip if we already have it
        if clean_name in local_files:
            skipped += 1
            continue

        try:
            # Determine file type
            if clean_name.endswith('.txt'):
                file_type = 'txt'
            elif clean_name.endswith(('.jpg', '.jpeg')):
                file_type = 'image/jpeg'
            elif clean_name.endswith('.tiff'):
                file_type = 'image/tiff'
            elif clean_name.endswith('.png'):
                file_type = 'image/png'
            else:
                file_type = 'unknown'

            # Get content
            content = item.get('text', '')

            # Insert into database
            # Use a virtual filepath since these come from HF dataset
            filepath = f'/hf_dataset/{clean_name}'

            c.execute('''
                INSERT INTO documents (filename, filepath, file_type, content, uploaded_date)
                VALUES (?, ?, ?, ?, ?)
            ''', (clean_name, filepath, file_type, content, datetime.now()))

            imported += 1

            # Progress update every 100 files
            if imported % 100 == 0:
                print(f"  Imported {imported} files... (Skipped {skipped} existing)")
                conn.commit()

        except Exception as e:
            errors.append({
                'filename': clean_name,
                'error': str(e)
            })
            if len(errors) <= 10:
                print(f"  ⚠️  Error with {clean_name}: {e}")

    conn.commit()
    conn.close()

    print(f"\n{'='*60}")
    print(f"✅ IMPORT COMPLETE")
    print(f"{'='*60}")
    print(f"Imported: {imported} new files")
    print(f"Skipped: {skipped} existing files")
    print(f"Errors: {len(errors)} files")

    if errors:
        print(f"\n⚠️  First 10 errors:")
        for err in errors[:10]:
            print(f"  - {err['filename']}: {err['error']}")

    return {
        'imported': imported,
        'skipped': skipped,
        'errors': len(errors)
    }

if __name__ == '__main__':
    print("EPSTEIN FILES - MISSING FILES IMPORT")
    print("="*60)
    print("This will download and import all missing files from the")
    print("Hugging Face EPSTEIN_FILES_20K dataset.")
    print("="*60)
    print()

    response = input("Continue? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        start_time = time.time()
        import_missing_documents()
        elapsed = time.time() - start_time
        print(f"\n⏱️  Total time: {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")
    else:
        print("Import cancelled.")
