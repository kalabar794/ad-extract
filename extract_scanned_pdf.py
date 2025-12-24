#!/usr/bin/env python3
"""
Extract text from scanned PDFs using OCR
Handles 21CV6702_JAN_11_2022_0900.pdf - image-based PDF
"""

import sqlite3
import pdfplumber
import pytesseract
from PIL import Image
import io
import sys

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def extract_text_from_scanned_pdf(pdf_path, max_pages=None):
    """Extract text from scanned PDF using OCR"""

    print(f"📄 Processing scanned PDF: {pdf_path}")

    full_text = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            pages_to_process = min(total_pages, max_pages) if max_pages else total_pages

            print(f"📊 Total pages: {total_pages}")
            print(f"🔄 Processing {pages_to_process} pages with OCR...")

            for page_num, page in enumerate(pdf.pages[:pages_to_process], 1):
                print(f"  Page {page_num}/{pages_to_process}...", end='', flush=True)

                try:
                    # Convert page to image
                    img = page.to_image(resolution=300)

                    # Perform OCR on the image
                    text = pytesseract.image_to_string(img.original)

                    if text.strip():
                        full_text.append(f"\n--- Page {page_num} ---\n{text}")
                        print(f" ✓ ({len(text)} chars)")
                    else:
                        print(f" (no text)")

                except Exception as e:
                    print(f" ✗ Error: {e}")
                    continue

            combined_text = '\n'.join(full_text)
            print(f"\n✅ Extracted {len(combined_text)} total characters")

            return combined_text

    except Exception as e:
        print(f"❌ Error processing PDF: {e}")
        return ""

def update_database(filename, content):
    """Update the document in the database with OCR'd content"""

    conn = get_db()
    c = conn.cursor()

    # Find the document
    c.execute("SELECT id FROM documents WHERE filename = ?", (filename,))
    doc = c.fetchone()

    if doc:
        doc_id = doc['id']
        c.execute("UPDATE documents SET content = ? WHERE id = ?", (content, doc_id))
        conn.commit()
        print(f"✅ Updated document ID {doc_id} in database")
    else:
        # Insert new document
        c.execute('''
            INSERT INTO documents (filename, content)
            VALUES (?, ?)
        ''', (filename, content))
        conn.commit()
        doc_id = c.lastrowid
        print(f"✅ Inserted new document ID {doc_id} in database")

    conn.close()
    return doc_id

if __name__ == '__main__':
    pdf_path = './uploads/txt/21CV6702_JAN_11_2022_0900.pdf'
    filename = '21CV6702_JAN_11_2022_0900.pdf'

    print("="*70)
    print("SCANNED PDF OCR EXTRACTION")
    print("="*70)

    # Extract first 10 pages to test
    print("\n🧪 Testing with first 10 pages...")
    text = extract_text_from_scanned_pdf(pdf_path, max_pages=10)

    if len(text) > 100:
        print("\n" + "="*70)
        print("SAMPLE OUTPUT (first 1000 chars):")
        print("="*70)
        print(text[:1000])
        print("\n" + "="*70)

        # Ask if we should process all pages
        response = input("\nOCR successful! Process all 46 pages? (yes/no): ").strip().lower()

        if response == 'yes':
            print("\n🔄 Processing all 46 pages (this may take a few minutes)...")
            text = extract_text_from_scanned_pdf(pdf_path, max_pages=None)
            update_database(filename, text)
        else:
            print("Updating with first 10 pages only...")
            update_database(filename, text)
    else:
        print("❌ OCR extraction failed or produced minimal text")
