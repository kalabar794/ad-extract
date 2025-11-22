#!/usr/bin/env python3
"""
FBI Vault PDF OCR Processor
Extracts text from scanned FBI vault PDFs using OCR
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime
from PIL import Image
import pytesseract
from pdf2image import convert_from_path
import PyPDF2

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def ocr_pdf(pdf_path):
    """Extract text from scanned PDF using OCR"""
    try:
        print(f"  Converting PDF to images...")
        # Convert PDF to images (one per page)
        images = convert_from_path(pdf_path, dpi=300)

        print(f"  Processing {len(images)} pages with OCR...")
        all_text = []

        for page_num, image in enumerate(images, 1):
            if page_num % 10 == 0:
                print(f"    Page {page_num}/{len(images)}...")

            # Extract text from image using Tesseract
            text = pytesseract.image_to_string(image)
            all_text.append(f"\n{'='*70}\nPAGE {page_num}\n{'='*70}\n\n{text}")

        return '\n'.join(all_text)

    except Exception as e:
        raise Exception(f"OCR failed: {str(e)}")

def process_fbi_vault_pdfs():
    """Process all FBI vault PDFs and extract OCR text"""
    conn = get_db()
    c = conn.cursor()

    # Get FBI vault PDF documents
    c.execute('''
        SELECT id, filename, content
        FROM documents
        WHERE filename LIKE '%Epstein Part%'
        ORDER BY id
    ''')

    docs = c.fetchall()
    total = len(docs)

    print("="*70)
    print("FBI VAULT PDF OCR PROCESSOR")
    print("="*70)
    print(f"Found {total} FBI vault PDFs to process")
    print("="*70)

    processed = 0
    skipped = 0
    errors = 0

    for idx, row in enumerate(docs, 1):
        doc_id = row['id']
        filename = row['filename']
        current_content = row['content']

        # PDF path in fbi_vault_epstein folder
        pdf_path = os.path.join('fbi_vault_epstein', filename)

        try:
            # Skip if already OCR'd (has substantial content)
            if len(current_content) > 1000:
                print(f"\n[{idx}/{total}] ✓ SKIP: {filename}")
                print(f"  Already processed ({len(current_content)} bytes)")
                skipped += 1
                continue

            print(f"\n[{idx}/{total}] 📄 PROCESSING: {filename}")

            # Check if PDF exists
            if not os.path.exists(pdf_path):
                raise Exception(f"PDF not found: {pdf_path}")

            # Extract text using OCR
            print(f"  Starting OCR extraction...")
            start_time = datetime.now()
            ocr_text = ocr_pdf(pdf_path)
            elapsed = (datetime.now() - start_time).total_seconds()

            # Create new content with OCR text
            new_content = f"[FBI VAULT DOCUMENT: {filename}]\n"
            new_content += f"Source: FBI Records Vault - Jeffrey Epstein Investigation\n"
            new_content += f"OCR Extraction Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            new_content += f"File path: {pdf_path}\n"
            new_content += f"Processing time: {elapsed:.1f} seconds\n"
            new_content += "\n" + "="*70 + "\n"
            new_content += "EXTRACTED TEXT (OCR):\n"
            new_content += "="*70 + "\n"

            if ocr_text and ocr_text.strip():
                new_content += ocr_text
            else:
                new_content += "[No text extracted - PDF may be blank or unreadable]"

            # Update database
            c.execute('''
                UPDATE documents
                SET content = ?
                WHERE id = ?
            ''', (new_content, doc_id))

            conn.commit()
            processed += 1

            print(f"  ✅ COMPLETE: Extracted {len(ocr_text)} bytes in {elapsed:.1f}s")

        except Exception as e:
            errors += 1
            print(f"  ❌ ERROR: {str(e)[:200]}")
            continue

    conn.close()

    print("\n" + "="*70)
    print("OCR PROCESSING COMPLETE")
    print("="*70)
    print(f"Processed: {processed}")
    print(f"Skipped:   {skipped}")
    print(f"Errors:    {errors}")
    print(f"Total:     {total}")
    print("="*70)

    if processed > 0:
        print("\n✅ FBI vault PDFs have been OCR'd and updated in database")
        print("\nNext steps:")
        print("1. Run entity extraction: python3 extract_entities.py")
        print("2. View documents in web interface at http://localhost:5001")

    return processed

if __name__ == '__main__':
    print("FBI Vault PDF OCR Processor")
    print("This will extract text from scanned FBI vault PDFs using OCR")
    print("="*70)

    # Check for required tools
    try:
        import pytesseract
        from pdf2image import convert_from_path
        print("✓ Required OCR tools installed")
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("\nInstall required packages:")
        print("  brew install tesseract poppler")
        print("  pip3 install pytesseract pdf2image pillow")
        exit(1)

    print("\n⚠️  WARNING: This process is CPU-intensive and may take 30-60 minutes")
    print("⚠️  It will process ~440 pages across 10 FBI vault PDF files")
    print("\nStarting OCR processing...")

    process_fbi_vault_pdfs()
