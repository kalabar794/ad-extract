import { Page } from 'playwright';
import { BaseExtractor, ExtractorEvents } from './base';
import { Ad, ExtractionOptions } from '../types/ad';
import { AppConfig } from '../types/config';

const TIKTOK_AD_LIBRARY_URL = 'https://library.tiktok.com/ads';

interface TikTokAdData {
  adId: string;
  advertiserName: string;
  primaryText: string;
  startDate?: string;
  endDate?: string;
  regions: string[];
  status: string;
  format?: string;
  destinationUrl?: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

export class TikTokExtractor extends BaseExtractor {
  constructor(config: Partial<AppConfig> = {}, events: ExtractorEvents = {}) {
    super('tiktok', config, events);
  }

  async extractAds(options: ExtractionOptions): Promise<Ad[]> {
    const page = await this.initBrowser();
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      this.emitProgress('Navigating to TikTok Ad Library...', 5);

      // Navigate to TikTok Ad Library
      await page.goto(TIKTOK_AD_LIBRARY_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      this.emitProgress('Waiting for page to load...', 10);
      await page.waitForTimeout(3000);

      // Search for the competitor
      await this.performSearch(page, options.competitor);

      this.emitProgress('Waiting for ads to load...', 20);
      await page.waitForTimeout(5000);

      // Wait for ad cards to appear
      await this.waitForAdsToLoad(page);

      this.emitProgress('Loading more ads...', 30);

      // Scroll to load more ads
      await this.loadAdsUntilLimit(page, maxAds);

      this.emitProgress('Extracting ad data...', 50);

      // Extract ads from page
      const rawAds = await this.extractAdsFromPage(page);
      this.logger.info(`Found ${rawAds.length} ads`);

      // Process ads
      for (let i = 0; i < Math.min(rawAds.length, maxAds); i++) {
        const raw = rawAds[i];
        const ad = this.processAd(raw, options.competitor);

        if (this.config.extraction.screenshots) {
          ad.screenshotPath = await this.captureAdScreenshot(page, ad.id);
        }

        ads.push(ad);
        this.emitAdFound(ad);

        const progress = 50 + (50 * (i + 1) / Math.min(rawAds.length, maxAds));
        this.emitProgress(`Processed ${i + 1}/${Math.min(rawAds.length, maxAds)} ads`, progress);
      }

      this.logger.info(`Extracted ${ads.length} ads`);
    } catch (error) {
      this.logger.error(`Extraction failed: ${(error as Error).message}`);
      throw error;
    }

    return ads;
  }

  private async performSearch(page: Page, query: string): Promise<void> {
    try {
      // Look for search input - TikTok Ad Library has various search options
      const searchSelectors = [
        'input[placeholder*="Search"]',
        'input[placeholder*="search"]',
        'input[type="search"]',
        'input[name="keyword"]',
        '[data-testid="search-input"]',
        '.search-input',
        'input.ant-input'
      ];

      let searchInput: Awaited<ReturnType<Page['$']>> = null;
      for (const selector of searchSelectors) {
        searchInput = await page.$(selector);
        if (searchInput) break;
      }

      if (searchInput) {
        await searchInput.click();
        await searchInput.fill(query);
        await page.keyboard.press('Enter');
        this.logger.info(`Searched for: ${query}`);
      } else {
        // Try using the URL directly with search parameter
        const searchUrl = `${TIKTOK_AD_LIBRARY_URL}?keyword=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        this.logger.info(`Navigated to search URL: ${searchUrl}`);
      }

      await page.waitForTimeout(3000);
    } catch (error) {
      this.logger.warn(`Search interaction failed: ${(error as Error).message}`);
    }
  }

  private async waitForAdsToLoad(page: Page): Promise<void> {
    try {
      // Wait for ad cards or content indicating ads have loaded
      const waitSelectors = [
        '[data-testid="ad-card"]',
        '.ad-card',
        '.ad-item',
        '[class*="AdCard"]',
        '[class*="ad-card"]',
        'div[class*="creative"]'
      ];

      for (const selector of waitSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          this.logger.debug(`Found ads using selector: ${selector}`);
          return;
        } catch {
          continue;
        }
      }

      // Fallback: wait for any content to load
      await page.waitForTimeout(5000);
    } catch {
      this.logger.warn('Timeout waiting for ads - page may have no results');
    }
  }

  private async loadAdsUntilLimit(page: Page, limit: number): Promise<void> {
    let previousCount = 0;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      // Count visible ad elements
      const currentCount = await page.evaluate(() => {
        const adSelectors = [
          '[data-testid="ad-card"]',
          '.ad-card',
          '.ad-item',
          '[class*="AdCard"]',
          '[class*="ad-card"]'
        ];

        let count = 0;
        for (const selector of adSelectors) {
          count += document.querySelectorAll(selector).length;
        }
        return count;
      });

      if (currentCount >= limit) {
        this.logger.debug(`Reached ad limit: ${currentCount}`);
        break;
      }

      if (currentCount === previousCount) {
        attempts++;
        if (attempts >= 3) {
          this.logger.debug('No new ads loading, stopping scroll');
          break;
        }
      } else {
        attempts = 0;
      }

      previousCount = currentCount;

      // Scroll down to load more
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      // Try clicking "Load More" button if it exists
      try {
        const loadMoreButton = await page.$('button:has-text("Load More"), button:has-text("Show More"), [class*="load-more"]');
        if (loadMoreButton) {
          await loadMoreButton.click();
          await page.waitForTimeout(2000);
        }
      } catch {
        // Load more button not found, continue scrolling
      }
    }
  }

  private async extractAdsFromPage(page: Page): Promise<TikTokAdData[]> {
    return await page.evaluate(() => {
      const ads: TikTokAdData[] = [];
      const seenIds = new Set<string>();

      // Strategy 1: Look for structured ad cards
      const adCardSelectors = [
        '[data-testid="ad-card"]',
        '.ad-card',
        '.ad-item',
        '[class*="AdCard"]',
        '[class*="ad-card"]',
        'div[class*="creative"]'
      ];

      for (const selector of adCardSelectors) {
        const cards = document.querySelectorAll(selector);
        cards.forEach((card) => {
          const text = card.textContent || '';

          // Extract ad ID if available
          let adId = '';
          const idMatch = text.match(/ID[:\s]+(\d+)/i) ||
                          card.getAttribute('data-ad-id') ||
                          card.getAttribute('data-id');
          if (idMatch) {
            adId = typeof idMatch === 'string' ? idMatch : idMatch[1];
          } else {
            adId = `tiktok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }

          if (seenIds.has(adId)) return;
          seenIds.add(adId);

          const adData = parseAdCard(card, text, adId);
          if (adData.primaryText && adData.primaryText.length > 5) {
            ads.push(adData);
          }
        });
      }

      // Strategy 2: Parse page content if no structured cards found
      if (ads.length === 0) {
        const pageText = document.body.innerText;
        const sections = pageText.split(/(?=Advertiser|Ad\s+ID|Created)/gi);

        sections.forEach((section, index) => {
          if (section.length < 50 || section.length > 3000) return;

          const adId = `tiktok_parse_${index}`;
          if (seenIds.has(adId)) return;
          seenIds.add(adId);

          const adData = parseTextSection(section, adId);
          if (adData.primaryText && adData.primaryText.length > 10) {
            ads.push(adData);
          }
        });
      }

      function parseAdCard(card: Element, text: string, adId: string): TikTokAdData {
        // Extract advertiser name
        let advertiserName = '';
        const advertiserEl = card.querySelector('[class*="advertiser"], [class*="name"], .username');
        if (advertiserEl) {
          advertiserName = advertiserEl.textContent?.trim() || '';
        }
        if (!advertiserName) {
          const nameMatch = text.match(/(?:Advertiser|By|From)[:\s]+([^\n]+)/i);
          if (nameMatch) advertiserName = nameMatch[1].trim();
        }

        // Extract primary text/caption
        let primaryText = '';
        const captionEl = card.querySelector('[class*="caption"], [class*="text"], [class*="description"], p');
        if (captionEl) {
          primaryText = captionEl.textContent?.trim() || '';
        }
        if (!primaryText || primaryText.length < 10) {
          // Try to find the main ad copy
          const lines = text.split('\n').filter(l => l.trim().length > 20);
          if (lines.length > 0) {
            primaryText = lines[0].trim();
          }
        }

        // Extract dates
        let startDate: string | undefined;
        let endDate: string | undefined;
        const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);
        if (dateMatch && dateMatch.length > 0) {
          startDate = dateMatch[0];
          if (dateMatch.length > 1) endDate = dateMatch[1];
        }

        // Extract regions
        const regions: string[] = [];
        const regionPatterns = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'MX', 'IN'];
        regionPatterns.forEach(r => {
          if (text.includes(r)) regions.push(r);
        });

        // Extract status
        const status = text.toLowerCase().includes('active') ? 'Active' :
                      text.toLowerCase().includes('inactive') ? 'Inactive' : 'Unknown';

        // Detect format
        let format: string | undefined;
        if (text.includes('video') || card.querySelector('video')) {
          format = 'video';
        } else if (text.includes('carousel') || card.querySelectorAll('img').length > 1) {
          format = 'carousel';
        } else if (card.querySelector('img')) {
          format = 'image';
        }

        return {
          adId,
          advertiserName,
          primaryText: primaryText.substring(0, 500),
          startDate,
          endDate,
          regions: regions.length > 0 ? regions : ['US'],
          status,
          format
        };
      }

      function parseTextSection(text: string, adId: string): TikTokAdData {
        const advertiserMatch = text.match(/(?:Advertiser|By|From)[:\s]+([^\n]+)/i);
        const advertiserName = advertiserMatch ? advertiserMatch[1].trim() : '';

        // Try to find the main copy
        let primaryText = '';
        const lines = text.split('\n').filter(l => l.trim().length > 15);
        for (const line of lines) {
          if (!line.match(/^(Advertiser|Status|Date|Region|ID)/i)) {
            primaryText = line.trim();
            break;
          }
        }

        const status = text.toLowerCase().includes('active') ? 'Active' : 'Unknown';

        return {
          adId,
          advertiserName,
          primaryText,
          regions: ['US'],
          status
        };
      }

      return ads;
    });
  }

  private processAd(raw: TikTokAdData, competitor: string): Ad {
    return this.createBaseAd(competitor, {
      primaryText: raw.primaryText,
      headline: raw.advertiserName,
      startDate: raw.startDate,
      endDate: raw.endDate,
      platforms: ['TikTok'],
      mediaType: raw.format as 'image' | 'video' | 'carousel' | undefined,
      destinationUrl: raw.destinationUrl,
      hashtags: this.extractHashtags(raw.primaryText),
      rawData: {
        adId: raw.adId,
        status: raw.status,
        advertiserName: raw.advertiserName,
        regions: raw.regions
      }
    });
  }

  async extractViaApi(options: ExtractionOptions): Promise<Ad[] | null> {
    // TikTok doesn't have a public API for ad library access
    this.logger.debug('No TikTok API available');
    return null;
  }
}
