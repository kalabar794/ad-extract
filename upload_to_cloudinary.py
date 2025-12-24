#!/usr/bin/env python3
"""
Upload database and FBI PDFs to Cloudinary
Supports large file uploads (up to 100MB per file)
"""

import cloudinary
import cloudinary.uploader
import os
import sys

def configure_cloudinary(cloud_name, api_key, api_secret):
    """Configure Cloudinary credentials"""
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True
    )

def upload_file(file_path, folder="epstein_backup"):
    """Upload a file to Cloudinary as raw resource"""
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return None

    file_size = os.path.getsize(file_path)
    file_size_mb = file_size / (1024 * 1024)

    print(f"\n📤 Uploading: {file_path}")
    print(f"   Size: {file_size_mb:.2f} MB")

    try:
        # Upload as raw file (not image)
        result = cloudinary.uploader.upload(
            file_path,
            resource_type="raw",
            folder=folder,
            use_filename=True,
            unique_filename=False,
            chunk_size=6000000  # 6MB chunks for large files
        )

        print(f"✅ Uploaded successfully!")
        print(f"   URL: {result['secure_url']}")
        print(f"   Public ID: {result['public_id']}")

        return result

    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return None

def upload_directory(dir_path, folder="epstein_backup/pdfs"):
    """Upload all files in a directory"""
    if not os.path.exists(dir_path):
        print(f"❌ Directory not found: {dir_path}")
        return

    files = [f for f in os.listdir(dir_path) if os.path.isfile(os.path.join(dir_path, f))]
    total_files = len(files)

    print(f"\n📁 Uploading {total_files} files from: {dir_path}")

    success_count = 0
    for idx, filename in enumerate(files, 1):
        file_path = os.path.join(dir_path, filename)
        print(f"\n[{idx}/{total_files}]", end=" ")

        result = upload_file(file_path, folder)
        if result:
            success_count += 1

    print(f"\n\n✅ Uploaded {success_count}/{total_files} files")

def main():
    print("="*70)
    print("CLOUDINARY UPLOADER - Epstein Investigation Database")
    print("="*70)

    # Get credentials
    print("\nEnter your Cloudinary credentials:")
    print("(Find these at: https://console.cloudinary.com/settings/api-keys)")
    print()

    cloud_name = input("Cloud Name: ").strip()
    api_key = input("API Key: ").strip()
    api_secret = input("API Secret: ").strip()

    if not cloud_name or not api_key or not api_secret:
        print("❌ All credentials are required!")
        sys.exit(1)

    # Configure Cloudinary
    configure_cloudinary(cloud_name, api_key, api_secret)

    print("\n" + "="*70)
    print("What would you like to upload?")
    print("="*70)
    print("1. Database only (225 MB)")
    print("2. FBI PDFs only (38 MB)")
    print("3. Both database and PDFs (263 MB)")
    print()

    choice = input("Enter choice (1-3): ").strip()

    if choice == "1" or choice == "3":
        upload_file("database.db", "epstein_backup")

    if choice == "2" or choice == "3":
        upload_directory("fbi_vault_epstein", "epstein_backup/fbi_pdfs")

    print("\n" + "="*70)
    print("✅ Upload complete!")
    print("="*70)
    print("\nYour files are now backed up on Cloudinary.")
    print("Access them at: https://console.cloudinary.com/")

if __name__ == "__main__":
    main()
