#!/usr/bin/env python3
"""
FBI Vault Browser Automation Downloader
Uses Playwright to bypass Cloudflare protection and download FBI vault files
"""

import asyncio
import os
import time
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed!")
    print("\nInstall with:")
    print("  pip3 install playwright")
    print("  python3 -m playwright install chromium")
    exit(1)

class FBIVaultBrowserDownloader:
    def __init__(self):
        self.base_url = "https://vault.fbi.gov"
        self.download_dir = os.path.abspath("fbi_vault_epstein")
        os.makedirs(self.download_dir, exist_ok=True)

    async def download_all_parts(self):
        """Download all 22 parts using browser automation"""

        print("=" * 70)
        print("FBI VAULT BROWSER DOWNLOADER")
        print("=" * 70)
        print(f"Download directory: {self.download_dir}")
        print("=" * 70)

        async with async_playwright() as p:
            # Launch browser (headless=False to see what's happening)
            print("🌐 Launching browser...")
            browser = await p.chromium.launch(
                headless=False,  # Set to True to hide browser window
                downloads_path=self.download_dir
            )

            context = await browser.new_context(
                accept_downloads=True,
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )

            page = await context.new_page()

            # Track downloads
            downloaded_count = 0
            total_parts = 22

            for part_num in range(1, total_parts + 1):
                filename = f"FBI_Epstein_Part_{part_num:02d}_of_22.pdf"
                filepath = os.path.join(self.download_dir, filename)

                # Skip if already downloaded
                if os.path.exists(filepath) and os.path.getsize(filepath) > 100000:
                    print(f"✓ Already exists: {filename} ({os.path.getsize(filepath):,} bytes)")
                    downloaded_count += 1
                    continue

                # Construct URL for this part
                url = f"{self.base_url}/jeffrey-epstein/Jeffrey%20Epstein%20Part%20{part_num:02d}%20of%2022"

                try:
                    print(f"\n📥 [{part_num}/{total_parts}] Downloading: {filename}")
                    print(f"    URL: {url}")

                    # Navigate to the page
                    await page.goto(url, wait_until='networkidle', timeout=60000)

                    # Wait for Cloudflare challenge to complete (if present)
                    print("    ⏳ Waiting for page to load (Cloudflare check)...")
                    await page.wait_for_load_state('networkidle')
                    await asyncio.sleep(3)  # Extra wait for Cloudflare

                    # Find and click the download link
                    download_link = None

                    # Try multiple selectors for download link
                    selectors = [
                        'a[href*="@@download/file"]',
                        'a[href*="at_download/file"]',
                        'a:has-text("Download")',
                        '.documentFirstHeading + div a',
                    ]

                    for selector in selectors:
                        try:
                            download_link = await page.query_selector(selector)
                            if download_link:
                                break
                        except:
                            continue

                    if not download_link:
                        # If no link found, try direct download URL
                        download_url = f"{url}/@@download/file"
                        print(f"    ⬇️  Trying direct download: {download_url}")

                        # Start waiting for download before navigation
                        async with page.expect_download(timeout=120000) as download_info:
                            await page.goto(download_url, wait_until='commit')
                            download = await download_info.value

                            # Save the download
                            await download.save_as(filepath)
                            file_size = os.path.getsize(filepath)
                            print(f"    ✅ Downloaded: {filename} ({file_size:,} bytes)")
                            downloaded_count += 1
                    else:
                        # Click the download link
                        print("    🖱️  Clicking download link...")
                        async with page.expect_download(timeout=120000) as download_info:
                            await download_link.click()
                            download = await download_info.value

                            # Save the download
                            await download.save_as(filepath)
                            file_size = os.path.getsize(filepath)
                            print(f"    ✅ Downloaded: {filename} ({file_size:,} bytes)")
                            downloaded_count += 1

                    # Be nice to FBI servers
                    await asyncio.sleep(2)

                except Exception as e:
                    print(f"    ❌ Error: {str(e)[:100]}")
                    # Take screenshot for debugging
                    screenshot_path = os.path.join(self.download_dir, f"error_part_{part_num:02d}.png")
                    try:
                        await page.screenshot(path=screenshot_path)
                        print(f"    📸 Screenshot saved: {screenshot_path}")
                    except:
                        pass
                    continue

            await browser.close()

            print("\n" + "=" * 70)
            print(f"✅ DOWNLOAD COMPLETE: {downloaded_count}/{total_parts} files")
            print("=" * 70)

            return downloaded_count

async def main():
    downloader = FBIVaultBrowserDownloader()

    print("\n🚀 Starting FBI Vault Browser Downloader")
    print("=" * 70)
    print("This will open a browser window to download files.")
    print("Cloudflare challenges will be handled automatically.")
    print("=" * 70)

    count = await downloader.download_all_parts()

    if count > 0:
        print(f"\n✅ Successfully downloaded {count} FBI vault files!")
        print(f"📁 Location: {downloader.download_dir}")

        # Ask to import
        import_now = input("\n📦 Import files to database now? (y/n): ").strip().lower()

        if import_now == 'y':
            print("\n🔄 Starting import process...")
            import subprocess
            result = subprocess.run(
                ['python3', 'bulk_import.py', 'fbi_vault_epstein'],
                cwd=os.path.dirname(__file__)
            )
            if result.returncode == 0:
                print("\n✅ Files imported successfully!")
            else:
                print("\n⚠️  Import had some issues. Check output above.")
        else:
            print("\n📝 To import later, run:")
            print("   python3 bulk_import.py fbi_vault_epstein")
    else:
        print("\n❌ No files were downloaded")

if __name__ == '__main__':
    asyncio.run(main())
