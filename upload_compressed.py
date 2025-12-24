#!/usr/bin/env python3
"""Upload compressed database to Cloudinary"""

import cloudinary
import cloudinary.uploader
import os

# Configure Cloudinary
cloudinary.config(
    cloud_name="dqltlwqi2",
    api_key="632585139671478",
    api_secret="1eHsKiFO0yq08uhsy5W4hcBtI8s",
    secure=True
)

print("="*70)
print("UPLOADING COMPRESSED DATABASE TO CLOUDINARY")
print("="*70)

db_path = "database.db.gz"

if not os.path.exists(db_path):
    print(f"❌ File not found: {db_path}")
    exit(1)

file_size_mb = os.path.getsize(db_path) / (1024 * 1024)

print(f"\n📤 Uploading: {db_path}")
print(f"   Size: {file_size_mb:.2f} MB (compressed)")
print(f"   Original size: 223.59 MB")
print(f"   Compression: 65% reduction")
print(f"   Destination: Cloudinary (dqltlwqi2)")
print("\nUploading...")

try:
    result = cloudinary.uploader.upload(
        db_path,
        resource_type="raw",
        folder="epstein_backup",
        public_id="database.db",
        use_filename=False,
        unique_filename=False,
        chunk_size=6000000,  # 6MB chunks
        timeout=300  # 5 minutes
    )

    print("\n" + "="*70)
    print("✅ UPLOAD SUCCESSFUL!")
    print("="*70)
    print(f"\nURL: {result['secure_url']}")
    print(f"Public ID: {result['public_id']}")
    print(f"Format: {result['format']}")
    print(f"Size: {result['bytes'] / (1024*1024):.2f} MB")
    print("\n✅ Your database is now backed up on Cloudinary!")
    print("   To restore: Download the .gz file and run: gunzip database.db.gz")
    print("\nAccess it at: https://console.cloudinary.com/")

except Exception as e:
    print("\n" + "="*70)
    print("❌ UPLOAD FAILED")
    print("="*70)
    print(f"\nError: {str(e)}")
