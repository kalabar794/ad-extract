#!/usr/bin/env python3
"""
Quick OCR for new FBI vault files (Parts 12-21)
Handles filename mismatch between database and filesystem
"""

import sqlite3
import os
from pdf2image import convert_from_path
import pytesseract
from datetime import datetime

# Mapping of database filename to actual filesystem filename
FILE_MAP = {
    "Jeffrey Epstein Part 12 of 12_1.pdf": "Jeffrey Epstein Part 12 of 12.pdf",
    "Jeffrey Epstein Part 13 of 13_1.pdf": "Jeffrey Epstein Part 13 of 13.pdf",
    "Jeffrey Epstein Part 14 of 14_1.PDF": "Jeffrey Epstein Part 14 of 14.PDF",
    "Jeffrey Epstein Part 15 of 15_1.PDF": "Jeffrey Epstein Part 15 of 15.PDF",
    "Jeffrey Epstein Part 16 of 16_1.PDF": "Jeffrey Epstein Part 16 of 16.PDF",
    "Jeffrey Epstein Part 17 of 17_1.PDF": "Jeffrey Epstein Part 17 of 17.PDF",
    "Jeffrey Epstein Part 18 of 18_1.PDF": "Jeffrey Epstein Part 18 of 18.PDF",
    "Jeffrey Epstein Part 19 of 19_1.pdf": "Jeffrey Epstein Part 19 of 19.pdf",
    "Jeffrey Epstein Part 20 of 20_1.PDF": "Jeffrey Epstein Part 20 of 20.PDF",
    "Jeffrey Epstein Part 21 of 21_1.pdf": "Jeffrey Epstein Part 21 of 21.pdf",
}

def ocr_pdf(pdf_path):
    """Extract text from PDF using OCR"""
    print(f"  Converting to images...")
    images = convert_from_path(pdf_path, dpi=300)

    print(f"  OCR'ing {len(images)} pages...")
    all_text = []

    for page_num, image in enumerate(images, 1):
        if page_num % 5 == 0:
            print(f"    Page {page_num}/{len(images)}...")
        text = pytesseract.image_to_string(image)
        all_text.append(f"\n{'='*70}\nPAGE {page_num}\n{'='*70}\n\n{text}")

    return '\n'.join(all_text)

def main():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()

    print("="*70)
    print("OCR NEW FBI VAULT FILES (Parts 12-21)")
    print("="*70)

    processed = 0

    for db_filename, fs_filename in FILE_MAP.items():
        pdf_path = os.path.join('fbi_vault_epstein', fs_filename)

        if not os.path.exists(pdf_path):
            print(f"\n❌ File not found: {fs_filename}")
            continue

        print(f"\n📄 Processing: {fs_filename}")
        start = datetime.now()

        # OCR the PDF
        ocr_text = ocr_pdf(pdf_path)
        elapsed = (datetime.now() - start).total_seconds()

        # Create updated content
        new_content = f"[FBI VAULT DOCUMENT: {fs_filename}]\n"
        new_content += f"Source: FBI Records Vault - Jeffrey Epstein Investigation\n"
        new_content += f"OCR Extraction Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        new_content += f"File path: {pdf_path}\n"
        new_content += "\n" + "="*70 + "\n"
        new_content += "EXTRACTED TEXT (OCR):\n"
        new_content += "="*70 + "\n"
        new_content += ocr_text

        # Update database
        c.execute('UPDATE documents SET content = ? WHERE filename = ?', (new_content, db_filename))
        conn.commit()

        print(f"  ✅ Complete: {len(ocr_text)} bytes in {elapsed:.1f}s")
        processed += 1

    conn.close()

    print("\n" + "="*70)
    print(f"✅ OCR COMPLETE: {processed} files processed")
    print("="*70)

if __name__ == '__main__':
    main()
