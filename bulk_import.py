#!/usr/bin/env python3
"""
Bulk import script for uploading directories of files to the Epstein Archive Investigator
Usage: python3 bulk_import.py /path/to/directory
"""

import sys
import os
import sqlite3
from datetime import datetime
from pathlib import Path
import re
from pypdf import PdfReader

# Import functions from main app
from app import extract_entities, get_db, init_db, ALLOWED_EXTENSIONS

def bulk_import_directory(directory_path, recursive=True):
    """Import all allowed files from a directory"""

    if not os.path.isdir(directory_path):
        print(f"Error: '{directory_path}' is not a valid directory")
        return

    # Initialize database
    init_db()

    # Find all files
    directory = Path(directory_path)
    if recursive:
        pattern = '**/*'
    else:
        pattern = '*'

    files_to_import = []
    for file_path in directory.glob(pattern):
        if file_path.is_file():
            ext = file_path.suffix[1:].lower()  # Remove the dot
            if ext in ALLOWED_EXTENSIONS:
                files_to_import.append(file_path)

    if not files_to_import:
        print(f"No files with allowed extensions ({', '.join(ALLOWED_EXTENSIONS)}) found in {directory_path}")
        return

    print(f"Found {len(files_to_import)} file(s) to import")
    print("-" * 50)

    conn = get_db()
    c = conn.cursor()

    imported_count = 0
    skipped_count = 0
    error_count = 0

    for file_path in files_to_import:
        try:
            filename = file_path.name
            ext = file_path.suffix[1:].lower()

            # Check if already imported
            c.execute('SELECT id FROM documents WHERE filename = ?', (filename,))
            if c.fetchone():
                print(f"⊘ Skipping (already exists): {filename}")
                skipped_count += 1
                continue

            # Determine file type and destination
            if ext in ('txt', 'pdf'):
                file_type = 'txt'
                dest_dir = Path('uploads/txt')
            else:
                file_type = 'image'
                dest_dir = Path('uploads/images')

            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_path = dest_dir / filename

            # Handle filename conflicts
            counter = 1
            original_dest = dest_path
            while dest_path.exists():
                stem = original_dest.stem
                suffix = original_dest.suffix
                dest_path = dest_dir / f"{stem}_{counter}{suffix}"
                counter += 1

            # Copy file
            with open(file_path, 'rb') as src:
                with open(dest_path, 'wb') as dst:
                    dst.write(src.read())

            # Read content for text files and PDFs
            content = ''
            if ext == 'txt':
                with open(dest_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            elif ext == 'pdf':
                try:
                    reader = PdfReader(dest_path)
                    content = ''
                    for page in reader.pages:
                        content += page.extract_text() + '\n'
                except Exception as e:
                    content = f'[PDF extraction failed: {e}]'

            # Insert into database
            uploaded_date = datetime.now().isoformat()
            c.execute('''INSERT INTO documents (filename, filepath, file_type, content, uploaded_date)
                        VALUES (?, ?, ?, ?, ?)''',
                     (dest_path.name, str(dest_path), file_type, content, uploaded_date))
            doc_id = c.lastrowid

            # Add to full-text search and extract entities
            if file_type == 'txt':
                c.execute('INSERT INTO documents_fts (doc_id, filename, content) VALUES (?, ?, ?)',
                         (doc_id, dest_path.name, content))

                # Extract entities
                entities = extract_entities(content)

                # Store entities
                for entity_type, entity_names in entities.items():
                    for name in entity_names:
                        # Insert or update entity
                        entity_type_singular = entity_type[:-1]  # Remove 's' from type
                        c.execute('''INSERT INTO entities (name, entity_type, mention_count)
                                    VALUES (?, ?, 1)
                                    ON CONFLICT(name, entity_type) DO UPDATE SET
                                    mention_count = mention_count + 1''',
                                 (name, entity_type_singular))
                        entity_id = c.lastrowid

                        # Get entity_id if it already existed
                        if entity_id == 0:
                            c.execute('SELECT id FROM entities WHERE name = ? AND entity_type = ?',
                                    (name, entity_type_singular))
                            entity_id = c.fetchone()[0]

                        # Create mention
                        context = content[:200] if len(content) > 200 else content
                        c.execute('''INSERT INTO entity_mentions (doc_id, entity_id, context)
                                    VALUES (?, ?, ?)''',
                                 (doc_id, entity_id, context))

            print(f"✓ Imported: {filename} ({file_type})")
            imported_count += 1

        except Exception as e:
            print(f"✗ Error importing {file_path.name}: {str(e)}")
            error_count += 1
            continue

    conn.commit()
    conn.close()

    print("-" * 50)
    print(f"Import complete!")
    print(f"  Imported: {imported_count}")
    print(f"  Skipped:  {skipped_count}")
    print(f"  Errors:   {error_count}")
    print(f"  Total:    {len(files_to_import)}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 bulk_import.py /path/to/directory [--no-recursive]")
        print("\nImports all .txt, .jpg, and .jpeg files from the specified directory")
        print("Use --no-recursive to only import files from the top level (not subdirectories)")
        sys.exit(1)

    directory = sys.argv[1]
    recursive = '--no-recursive' not in sys.argv

    bulk_import_directory(directory, recursive)
