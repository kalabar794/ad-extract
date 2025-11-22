#!/usr/bin/env python3
"""
OCR Processing System for Image Documents
Extract text from 3,173 DOJ-OGR images using Tesseract OCR
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime
from PIL import Image
import pytesseract

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def ocr_image(filepath):
    """Extract text from image using Tesseract OCR"""
    try:
        image = Image.open(filepath)
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        raise Exception(f"OCR failed: {str(e)}")

def process_images():
    """Process all images in database and extract OCR text"""
    conn = get_db()
    c = conn.cursor()

    # Get all image documents
    c.execute('''
        SELECT id, filename, filepath, content
        FROM documents
        WHERE file_type LIKE 'image/%'
        ORDER BY id
    ''')

    images = c.fetchall()
    total = len(images)

    print(f"Found {total} images to process")
    print("="*70)

    processed = 0
    skipped = 0
    errors = 0

    for idx, row in enumerate(images, 1):
        doc_id = row['id']
        filename = row['filename']
        filepath = row['filepath']
        current_content = row['content']

        try:
            # Skip if already OCR'd (doesn't contain placeholder text)
            if '[OCR text extraction will be performed in analysis phase]' not in current_content:
                skipped += 1
                if idx % 50 == 0:
                    print(f"Progress: {idx}/{total} ({processed} processed, {skipped} skipped, {errors} errors)")
                continue

            # Check if file exists
            if not os.path.exists(filepath):
                raise Exception(f"File not found: {filepath}")

            # Extract text using OCR
            ocr_text = ocr_image(filepath)

            # Create new content with OCR text
            new_content = f"[IMAGE DOCUMENT: {filename}]\n"
            new_content += f"Source: DOJ Office of Government Relations\n"
            new_content += f"OCR Extraction Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            new_content += f"File path: {filepath}\n"
            new_content += "\n" + "="*70 + "\n"
            new_content += "EXTRACTED TEXT:\n"
            new_content += "="*70 + "\n\n"

            if ocr_text:
                new_content += ocr_text
            else:
                new_content += "[No text extracted - image may be blank or unreadable]"

            # Update database
            c.execute('''
                UPDATE documents
                SET content = ?
                WHERE id = ?
            ''', (new_content, doc_id))

            processed += 1

            # Commit every 10 documents
            if processed % 10 == 0:
                conn.commit()
                print(f"Progress: {idx}/{total} ({processed} processed, {skipped} skipped, {errors} errors)")

        except Exception as e:
            errors += 1
            print(f"❌ Error processing {filename}: {str(e)}")
            if errors > 100:
                print("Too many errors, stopping...")
                break

    conn.commit()

    print("\n" + "="*70)
    print("OCR PROCESSING COMPLETE")
    print("="*70)
    print(f"✅ Processed: {processed} images")
    print(f"⏭️  Skipped: {skipped} (already OCR'd)")
    print(f"❌ Errors: {errors}")

    conn.close()

    return processed, skipped, errors

if __name__ == '__main__':
    print("="*70)
    print("EPSTEIN DOCUMENT INVESTIGATOR - OCR PROCESSING")
    print("="*70)
    print("\nExtracting text from 3,173 DOJ-OGR images using Tesseract OCR")
    print("This will take approximately 2-4 hours...")
    print()

    start_time = datetime.now()

    process_images()

    end_time = datetime.now()
    duration = end_time - start_time

    print(f"\n⏱️  Total time: {duration}")
    print("\n✅ OCR processing complete!")
    print("📝 Next steps:")
    print("   1. Entity extraction from OCR'd text")
    print("   2. Integration with AI Journalist Assistant")
    print("   3. Full-text search across all documents")
