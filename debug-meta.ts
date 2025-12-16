import { chromium } from 'playwright';

async function debugMetaAdLibrary() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  console.log('Navigating to Meta Ad Library...');
  await page.goto('https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&media_type=all&search_type=keyword_unordered&q=Nike', {
    waitUntil: 'domcontentloaded'
  });

  console.log('Waiting for page to load...');
  await page.waitForTimeout(5000);

  // Take a screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: false });
  console.log('Screenshot saved: debug-screenshot.png');

  // Get page structure
  const structure = await page.evaluate(() => {
    const results: any[] = [];

    // Look for ad cards - they typically have "See ad details" or similar
    const allDivs = document.querySelectorAll('div');

    allDivs.forEach((div, index) => {
      const text = div.innerText || '';
      // Look for divs that contain actual ad content
      if (text.includes('See ad details') && text.length < 5000) {
        results.push({
          index,
          className: div.className,
          textPreview: text.substring(0, 500),
          childCount: div.children.length
        });
      }
    });

    return results.slice(0, 5); // Just first 5
  });

  console.log('\n=== Found ad-like containers ===');
  structure.forEach((item, i) => {
    console.log(`\n--- Container ${i + 1} ---`);
    console.log('Class:', item.className);
    console.log('Text preview:', item.textPreview);
  });

  // Look for specific elements
  const adDetails = await page.evaluate(() => {
    const ads: any[] = [];

    // Find all "See ad details" links/buttons
    const detailButtons = document.querySelectorAll('a, div[role="button"]');

    detailButtons.forEach((btn) => {
      const text = btn.textContent || '';
      if (text.includes('See ad details')) {
        // Get the parent container
        let parent = btn.parentElement;
        for (let i = 0; i < 10 && parent; i++) {
          const parentText = parent.innerText || '';
          if (parentText.length > 200 && parentText.length < 3000) {
            ads.push({
              buttonText: text,
              parentLevel: i,
              parentClass: parent.className,
              content: parentText
            });
            break;
          }
          parent = parent.parentElement;
        }
      }
    });

    return ads.slice(0, 3);
  });

  console.log('\n=== Ad Details Analysis ===');
  adDetails.forEach((ad, i) => {
    console.log(`\n--- Ad ${i + 1} ---`);
    console.log('Parent class:', ad.parentClass);
    console.log('Parent level:', ad.parentLevel);
    console.log('Content:', ad.content);
  });

  // Keep browser open for manual inspection
  console.log('\n\nBrowser will stay open for 60 seconds for manual inspection...');
  console.log('Check the page structure and CSS classes.');
  await page.waitForTimeout(60000);

  await browser.close();
}

debugMetaAdLibrary().catch(console.error);
