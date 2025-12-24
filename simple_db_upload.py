#!/usr/bin/env python3
"""
Simple Database Upload to File.io (anonymous, temporary hosting)
No authentication required - get instant shareable link
"""

import requests
import os
import sys

def upload_to_fileio(file_path):
    """Upload file to file.io (free, anonymous, 14-day retention)"""

    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return None

    file_size = os.path.getsize(file_path)
    file_size_mb = file_size / (1024 * 1024)

    print(f"\n📤 Uploading: {file_path}")
    print(f"   Size: {file_size_mb:.2f} MB")
    print(f"   This may take a few minutes...")

    try:
        with open(file_path, 'rb') as f:
            response = requests.post(
                'https://file.io',
                files={'file': f},
                data={'expires': '14d'}  # Keep for 14 days
            )

        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"\n✅ Upload successful!")
                print(f"\n{'='*70}")
                print(f"DOWNLOAD LINK (valid for 14 days):")
                print(f"{'='*70}")
                print(f"\n{result['link']}\n")
                print(f"⚠️  IMPORTANT: This link works only ONCE!")
                print(f"   After downloading, the file will be deleted.")
                print(f"   Save this link somewhere safe.\n")
                return result['link']
            else:
                print(f"❌ Upload failed: {result.get('message', 'Unknown error')}")
                return None
        else:
            print(f"❌ Upload failed with status code: {response.status_code}")
            return None

    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return None

def upload_to_tmpfiles(file_path):
    """Alternative: Upload to tmpfiles.org (free, no account, 1 hour retention)"""

    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return None

    file_size = os.path.getsize(file_path)
    file_size_mb = file_size / (1024 * 1024)

    print(f"\n📤 Uploading: {file_path}")
    print(f"   Size: {file_size_mb:.2f} MB")

    try:
        with open(file_path, 'rb') as f:
            response = requests.post(
                'https://tmpfiles.org/api/v1/upload',
                files={'file': f}
            )

        if response.status_code == 200:
            result = response.json()
            if result.get('status') == 'success':
                # Fix the URL (tmpfiles returns /dl/ format, need to convert)
                url = result['data']['url']
                download_url = url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')

                print(f"\n✅ Upload successful!")
                print(f"\n{'='*70}")
                print(f"DOWNLOAD LINK (valid for 1 hour):")
                print(f"{'='*70}")
                print(f"\n{download_url}\n")
                print(f"⚠️  File will be deleted after 1 hour or first download.\n")
                return download_url
            else:
                print(f"❌ Upload failed: {result}")
                return None
        else:
            print(f"❌ Upload failed with status code: {response.status_code}")
            return None

    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return None

def main():
    print("="*70)
    print("DATABASE BACKUP UPLOADER")
    print("="*70)
    print("\nThis will upload your compressed database to a free file host.")
    print("You'll get a shareable download link.\n")

    file_path = "database.db.gz"

    if not os.path.exists(file_path):
        print(f"❌ {file_path} not found!")
        print("   Run this first: gzip -c database.db > database.db.gz")
        sys.exit(1)

    print("Choose upload service:")
    print("1. file.io (14 days retention, link works ONCE)")
    print("2. tmpfiles.org (1 hour retention)")
    print()

    choice = input("Enter choice (1-2) [1]: ").strip() or "1"

    if choice == "1":
        link = upload_to_fileio(file_path)
    elif choice == "2":
        link = upload_to_tmpfiles(file_path)
    else:
        print("Invalid choice")
        sys.exit(1)

    if link:
        # Save link to file
        with open('database_download_link.txt', 'w') as f:
            f.write(f"Database Download Link\n")
            f.write(f"Created: {os.popen('date').read().strip()}\n")
            f.write(f"File: {file_path}\n")
            f.write(f"Size: {os.path.getsize(file_path) / (1024*1024):.2f} MB\n")
            f.write(f"\nLink:\n{link}\n")

        print(f"✓ Link also saved to: database_download_link.txt\n")

if __name__ == "__main__":
    main()
