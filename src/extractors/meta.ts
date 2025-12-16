import { Page } from 'playwright';
import { BaseExtractor, ExtractorEvents } from './base';
import { Ad, ExtractionOptions } from '../types/ad';
import { AppConfig } from '../types/config';

const META_AD_LIBRARY_URL = 'https://www.facebook.com/ads/library/';

interface MetaAdData {
  libraryId: string;
  advertiserName: string;
  primaryText: string;
  headline?: string;
  cta?: string;
  startDate?: string;
  platforms: string[];
  status: string;
  destinationUrl?: string;
  mediaType?: 'image' | 'video' | 'carousel';
}

export class MetaExtractor extends BaseExtractor {
  constructor(config: Partial<AppConfig> = {}, events: ExtractorEvents = {}) {
    super('meta', config, events);
  }

  async extractAds(options: ExtractionOptions): Promise<Ad[]> {
    const page = await this.initBrowser();
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      this.emitProgress('Navigating to Meta Ad Library...', 5);

      // Navigate to Meta Ad Library with search query
      const searchUrl = this.buildSearchUrl(options);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      this.emitProgress('Waiting for ads to load...', 15);
      await page.waitForTimeout(5000);

      // Wait for ad cards to appear
      await this.waitForAdsToLoad(page);

      this.emitProgress('Loading more ads...', 25);

      // Scroll to load more ads
      await this.loadAdsUntilLimit(page, maxAds);

      this.emitProgress('Extracting ad data...', 50);

      // Extract ads from page using improved logic
      const rawAds = await this.extractAdsFromPage(page);
      this.logger.info(`Found ${rawAds.length} ads`);

      // Process ads
      for (let i = 0; i < Math.min(rawAds.length, maxAds); i++) {
        const raw = rawAds[i];
        const ad = this.processAd(raw, options.competitor);

        if (this.config.extraction.screenshots) {
          // Take screenshot of full page for now
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

  private buildSearchUrl(options: ExtractionOptions): string {
    const params = new URLSearchParams({
      active_status: options.includeInactive ? 'all' : 'active',
      ad_type: 'all',
      country: options.country || 'US',
      media_type: 'all',
      search_type: options.searchType === 'page' ? 'page' : 'keyword_unordered'
    });

    if (options.searchType === 'advertiser_id') {
      params.set('view_all_page_id', options.competitor);
    } else {
      params.set('q', options.competitor);
    }

    return `${META_AD_LIBRARY_URL}?${params.toString()}`;
  }

  private async waitForAdsToLoad(page: Page): Promise<void> {
    try {
      // Wait for "See ad details" buttons which indicate ads are loaded
      await page.waitForSelector('text=See ad details', { timeout: 15000 });
      await page.waitForTimeout(2000);
    } catch {
      this.logger.warn('Timeout waiting for ads - page may have no results');
    }
  }

  private async loadAdsUntilLimit(page: Page, limit: number): Promise<void> {
    let previousCount = 0;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      // Count ads by looking for "See ad details" buttons
      const currentCount = await page.evaluate(() => {
        return document.querySelectorAll('div[role="button"], a').length;
      });

      // Also count by looking for Library ID patterns
      const adCount = await page.evaluate(() => {
        const text = document.body.innerText;
        const matches = text.match(/Library ID:/g);
        return matches ? matches.length : 0;
      });

      if (adCount >= limit) {
        this.logger.debug(`Reached ad limit: ${adCount}`);
        break;
      }

      if (adCount === previousCount) {
        attempts++;
        if (attempts >= 3) {
          this.logger.debug('No new ads loading, stopping scroll');
          break;
        }
      } else {
        attempts = 0;
      }

      previousCount = adCount;

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }
  }

  private async extractAdsFromPage(page: Page): Promise<MetaAdData[]> {
    return await page.evaluate(() => {
      const ads: MetaAdData[] = [];
      const seenIds = new Set<string>();

      // Find all containers that have "See ad details" - these are individual ad cards
      const allElements = document.querySelectorAll('*');

      allElements.forEach((element) => {
        const text = element.textContent || '';

        // Look for ad containers by finding Library ID pattern
        const libraryIdMatch = text.match(/Library ID:\s*(\d+)/);
        if (!libraryIdMatch) return;

        const libraryId = libraryIdMatch[1];

        // Skip if we've already processed this ad
        if (seenIds.has(libraryId)) return;

        // Make sure this element contains the full ad (has "See ad details")
        if (!text.includes('See ad details')) return;

        // Make sure it's not too large (avoid getting parent containers)
        if (text.length > 5000) return;

        seenIds.add(libraryId);

        // Parse the ad content
        const adData = parseAdContent(text, libraryId);
        if (adData.primaryText && adData.primaryText.length > 10) {
          ads.push(adData);
        }
      });

      function parseAdContent(text: string, libraryId: string): MetaAdData {
        // Extract status (Active/Inactive)
        const status = text.includes('Active') ? 'Active' : 'Inactive';

        // Extract start date
        let startDate: string | undefined;
        const dateMatch = text.match(/Started running on ([A-Za-z]+ \d+, \d{4})/);
        if (dateMatch) {
          startDate = dateMatch[1];
        }

        // Extract platforms
        const platforms: string[] = [];
        if (text.includes('Facebook') || text.includes('facebook.com')) platforms.push('Facebook');
        if (text.includes('Instagram') || text.includes('instagram.com')) platforms.push('Instagram');
        if (text.includes('Messenger')) platforms.push('Messenger');
        if (text.includes('Audience Network')) platforms.push('Audience Network');

        // Extract advertiser name - it's usually after "See ad details" and before "Sponsored"
        let advertiserName = '';
        const afterDetails = text.split('See ad details')[1] || '';
        const sponsoredIndex = afterDetails.indexOf('Sponsored');
        if (sponsoredIndex > 0) {
          advertiserName = afterDetails.substring(0, sponsoredIndex).trim();
          // Clean up advertiser name
          advertiserName = advertiserName.replace(/[\n\r]+/g, ' ').trim();
          // Get first meaningful part
          const parts = advertiserName.split(/\s+/);
          if (parts.length > 3) {
            advertiserName = parts.slice(0, 3).join(' ');
          }
        }

        // Extract primary text - the main ad copy
        // It's after "Sponsored" and before things like timestamps (0:00) or domain names
        let primaryText = '';
        const sponsoredSplit = afterDetails.split('Sponsored');
        if (sponsoredSplit.length > 1) {
          let adCopy = sponsoredSplit[1];

          // Remove common endings
          adCopy = adCopy.split(/\d+:\d+/)[0]; // Remove video timestamps
          adCopy = adCopy.split(/[A-Z]+\.[A-Z]+/)[0]; // Remove domains like INSTAGRAM.COM

          // Clean up
          adCopy = adCopy.replace(/[\n\r]+/g, ' ').trim();

          // Remove trailing UI elements
          const stopPhrases = ['Learn More', 'Shop Now', 'Sign Up', 'Download', 'Book Now', 'Get Quote', 'Visit'];
          for (const phrase of stopPhrases) {
            const idx = adCopy.lastIndexOf(phrase);
            if (idx > 50) { // Only if there's enough content before it
              adCopy = adCopy.substring(0, idx + phrase.length);
              break;
            }
          }

          primaryText = adCopy.trim();
        }

        // Extract CTA
        let cta: string | undefined;
        const ctaPatterns = ['Learn More', 'Shop Now', 'Sign Up', 'Download', 'Book Now', 'Get Quote', 'Apply Now', 'Subscribe', 'Watch More', 'Get Offer', 'See More'];
        for (const pattern of ctaPatterns) {
          if (text.includes(pattern)) {
            cta = pattern;
            break;
          }
        }

        // Detect media type
        let mediaType: 'image' | 'video' | 'carousel' | undefined;
        if (text.includes('0:00') || text.includes('0:') || text.includes(':00')) {
          mediaType = 'video';
        } else if (text.includes('multiple versions')) {
          mediaType = 'carousel';
        } else {
          mediaType = 'image';
        }

        // Extract destination URL
        let destinationUrl: string | undefined;
        const urlMatch = text.match(/([A-Z]+\.[A-Z]+(?:\.[A-Z]+)?)/i);
        if (urlMatch && !['INSTAGRAM.COM', 'FACEBOOK.COM'].includes(urlMatch[1].toUpperCase())) {
          destinationUrl = urlMatch[1].toLowerCase();
        }

        return {
          libraryId,
          advertiserName,
          primaryText,
          cta,
          startDate,
          platforms: platforms.length > 0 ? platforms : ['Facebook'],
          status,
          destinationUrl,
          mediaType
        };
      }

      return ads;
    });
  }

  private processAd(raw: MetaAdData, competitor: string): Ad {
    return this.createBaseAd(competitor, {
      primaryText: raw.primaryText,
      headline: raw.advertiserName,
      cta: raw.cta,
      startDate: raw.startDate,
      platforms: raw.platforms,
      mediaType: raw.mediaType,
      destinationUrl: raw.destinationUrl,
      hashtags: this.extractHashtags(raw.primaryText),
      rawData: {
        libraryId: raw.libraryId,
        status: raw.status,
        advertiserName: raw.advertiserName
      }
    });
  }

  async extractViaApi(options: ExtractionOptions): Promise<Ad[] | null> {
    const apiConfig = this.config.api?.meta;

    if (!apiConfig?.accessToken) {
      this.logger.debug('No Meta API credentials configured');
      return null;
    }

    this.logger.warn('Meta API fallback not yet implemented');
    return null;
  }
}
