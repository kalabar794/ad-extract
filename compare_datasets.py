#!/usr/bin/env python3
"""
Compare local files with Hugging Face EPSTEIN_FILES_20K dataset
"""

import sqlite3
from datasets import load_dataset
from collections import Counter
import re

def get_local_files():
    """Get list of files currently in database"""
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('SELECT filename FROM documents')
    local_files = {row['filename'] for row in c.fetchall()}

    conn.close()
    return local_files

def analyze_dataset_comparison():
    """Download dataset metadata and compare with local files"""

    print("Loading dataset metadata from Hugging Face...")
    print("(This may take a few minutes for the first download)")

    try:
        # Load the dataset
        dataset = load_dataset("tensonaut/EPSTEIN_FILES_20K", split="train")

        print(f"\n✓ Dataset loaded: {len(dataset)} files")

        # Get all filenames from HF dataset
        hf_filenames = set()
        for item in dataset:
            filename = item['filename']
            # Clean filename - remove "IMAGES-###-" prefix if present
            clean_name = re.sub(r'^IMAGES-\d+-', '', filename)
            hf_filenames.add(clean_name)

        print(f"✓ Hugging Face dataset has {len(hf_filenames)} unique files")

        # Get local files
        local_files = get_local_files()
        print(f"✓ Local database has {len(local_files)} files")

        # Find missing files
        missing_files = hf_filenames - local_files
        print(f"\n📊 Missing {len(missing_files)} files from the full dataset")

        # Analyze missing files
        print("\n" + "="*60)
        print("ANALYSIS OF MISSING FILES")
        print("="*60)

        # Sample of missing files
        print("\n📄 Sample of missing files (first 20):")
        for i, filename in enumerate(sorted(missing_files)[:20]):
            print(f"  {i+1}. {filename}")

        # Check for pattern in missing files
        oversight_missing = [f for f in missing_files if 'HOUSE_OVERSIGHT' in f]
        images_missing = [f for f in missing_files if f.endswith(('.jpg', '.jpeg', '.tiff', '.png'))]
        txt_missing = [f for f in missing_files if f.endswith('.txt')]

        print(f"\n📈 Missing file breakdown:")
        print(f"  - House Oversight docs: {len(oversight_missing)}")
        print(f"  - Text files (.txt): {len(txt_missing)}")
        print(f"  - Image files: {len(images_missing)}")
        print(f"  - Other: {len(missing_files) - len(oversight_missing) - len(images_missing)}")

        # Check for important keywords in missing files
        print("\n🔍 Checking for potentially important missing files...")
        keywords = ['flight', 'log', 'manifest', 'passenger', 'minor', 'victim',
                   'testimony', 'deposition', 'affidavit', 'complaint', 'subpoena']

        important_missing = []
        for filename in missing_files:
            for keyword in keywords:
                if keyword.lower() in filename.lower():
                    important_missing.append((filename, keyword))
                    break

        if important_missing:
            print(f"\n⚠️  Found {len(important_missing)} potentially important missing files:")
            for filename, keyword in important_missing[:30]:
                print(f"  - {filename} (contains: {keyword})")

        # Save full list to file
        with open('missing_files_list.txt', 'w') as f:
            f.write("MISSING FILES FROM EPSTEIN_FILES_20K DATASET\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"Total missing: {len(missing_files)}\n\n")
            for filename in sorted(missing_files):
                f.write(filename + '\n')

        print(f"\n✓ Full list saved to: missing_files_list.txt")

        return {
            'total_hf': len(hf_filenames),
            'total_local': len(local_files),
            'missing': len(missing_files),
            'important_missing': len(important_missing)
        }

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTrying to install required package...")
        import subprocess
        subprocess.run(['pip3', 'install', '--user', 'datasets'])
        print("\nPlease run the script again after installation.")
        return None

if __name__ == '__main__':
    print("EPSTEIN FILES DATASET COMPARISON")
    print("=" * 60)
    analyze_dataset_comparison()
