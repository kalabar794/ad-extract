#!/usr/bin/env python3
"""
1. Import Wikipedia Epstein client list
2. Import 21CV6702 (Prince Andrew case) with OCR
"""

import sqlite3
import pdfplumber
import pytesseract
import requests
from bs4 import BeautifulSoup
from datetime import datetime

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def import_prince_andrew_case():
    """Import 21CV6702 - Giuffre v Prince Andrew with OCR"""

    print("\n" + "="*70)
    print("1. IMPORTING PRINCE ANDREW CASE (21CV6702) - OCR")
    print("="*70)

    pdf_path = './uploads/txt/21CV6702_JAN_11_2022_0900.pdf'
    full_text = []

    print('🔄 Extracting text via OCR from 46 pages...')
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            try:
                img = page.to_image(resolution=300)
                text = pytesseract.image_to_string(img.original)
                if text.strip():
                    full_text.append(f'\n--- Page {page_num} ---\n{text}')
                if page_num % 10 == 0:
                    print(f'  Processed {page_num}/46 pages...')
            except:
                continue

    combined_text = '\n'.join(full_text)
    print(f'✅ Extracted {len(combined_text)} characters')

    # Insert into database
    conn = get_db()
    c = conn.cursor()

    c.execute('''
        INSERT INTO documents (filename, filepath, file_type, content, uploaded_date)
        VALUES (?, ?, ?, ?, ?)
    ''', ('21CV6702_JAN_11_2022_0900.pdf (Giuffre v Prince Andrew)',
          pdf_path, 'pdf', combined_text, datetime.now().isoformat()))

    conn.commit()
    doc_id = c.lastrowid
    conn.close()

    print(f'✅ Inserted as document ID {doc_id}')
    print(f'\nCase: Virginia Giuffre v. Prince Andrew')
    print(f'Preview: {combined_text[:300]}...')

    return doc_id

def import_wikipedia_client_list():
    """Import Wikipedia Epstein client list page"""

    print("\n" + "="*70)
    print("2. IMPORTING WIKIPEDIA EPSTEIN CLIENT LIST")
    print("="*70)

    url = "https://en.wikipedia.org/wiki/Jeffrey_Epstein_client_list"

    print(f'🔄 Fetching {url}...')

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Get main content
        content_div = soup.find('div', {'id': 'mw-content-text'})

        if not content_div:
            print("❌ Could not find content div")
            return None

        # Extract text
        text = content_div.get_text()

        # Clean up
        lines = text.split('\n')
        cleaned_lines = [line.strip() for line in lines if line.strip()]
        combined_text = '\n'.join(cleaned_lines)

        print(f'✅ Extracted {len(combined_text)} characters')

        # Insert into database
        conn = get_db()
        c = conn.cursor()

        c.execute('''
            INSERT INTO documents (filename, filepath, file_type, content, uploaded_date)
            VALUES (?, ?, ?, ?, ?)
        ''', ('Wikipedia_Jeffrey_Epstein_Client_List.txt',
              url, 'webpage', combined_text, datetime.now().isoformat()))

        conn.commit()
        doc_id = c.lastrowid
        conn.close()

        print(f'✅ Inserted as document ID {doc_id}')
        print(f'Preview: {combined_text[:300]}...')

        return doc_id

    except Exception as e:
        print(f"❌ Error fetching Wikipedia: {e}")
        return None

if __name__ == '__main__':
    print("="*70)
    print("IMPORT PRINCE ANDREW CASE + WIKIPEDIA CLIENT LIST")
    print("="*70)

    # Import both
    doc1 = import_prince_andrew_case()
    doc2 = import_wikipedia_client_list()

    print("\n" + "="*70)
    print("✅ IMPORT COMPLETE")
    print("="*70)
    if doc1:
        print(f"  Prince Andrew case: Document ID {doc1}")
    if doc2:
        print(f"  Wikipedia client list: Document ID {doc2}")
