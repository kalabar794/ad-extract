import { Page } from 'playwright';
import axios from 'axios';
import { BaseExtractor, ExtractorEvents } from './base';
import { Ad, ExtractionOptions } from '../types/ad';
import { AppConfig } from '../types/config';

const GOOGLE_AD_TRANSPARENCY_URL = 'https://adstransparency.google.com';

interface GoogleAdData {
  adId: string;
  advertiserName: string;
  primaryText: string;
  headline?: string;
  description?: string;
  startDate?: string;
  lastSeenDate?: string;
  formats: string[];
  regions: string[];
  destinationUrl?: string;
  adType?: string;
}

export class GoogleExtractor extends BaseExtractor {
  constructor(config: Partial<AppConfig> = {}, events: ExtractorEvents = {}) {
    super('google', config, events);
  }

  async extractAds(options: ExtractionOptions): Promise<Ad[]> {
    const page = await this.initBrowser();
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      this.emitProgress('Navigating to Google Ads Transparency Center...', 5);

      // Navigate to Google Ads Transparency Center
      await page.goto(GOOGLE_AD_TRANSPARENCY_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      this.emitProgress('Waiting for page to load...', 10);
      await page.waitForTimeout(3000);

      // Perform search for the competitor/advertiser
      await this.performSearch(page, options.competitor);

      this.emitProgress('Waiting for ads to load...', 20);
      await page.waitForTimeout(5000);

      // Wait for ad results
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
      // Google Ads Transparency has a search by advertiser feature
      // First, look for the search input
      const searchSelectors = [
        'input[aria-label*="Search"]',
        'input[placeholder*="Search"]',
        'input[type="search"]',
        '[data-search-input]',
        '.search-input',
        'input[class*="search"]'
      ];

      let searchInput: Awaited<ReturnType<Page['$']>> = null;
      for (const selector of searchSelectors) {
        searchInput = await page.$(selector);
        if (searchInput) break;
      }

      if (searchInput) {
        await searchInput.click();
        await page.waitForTimeout(500);
        await searchInput.fill(query);
        await page.waitForTimeout(1000);

        // Press Enter or click search button
        await page.keyboard.press('Enter');
        this.logger.info(`Searched for: ${query}`);
      } else {
        // Try navigating directly with search param
        const searchUrl = `${GOOGLE_AD_TRANSPARENCY_URL}/?text=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        this.logger.info(`Navigated to search URL: ${searchUrl}`);
      }

      await page.waitForTimeout(3000);

      // Check if we need to click on an advertiser from search results
      const advertiserLinks = await page.$$('a[href*="advertiser"], [class*="advertiser"]');
      if (advertiserLinks.length > 0) {
        // Click the first advertiser that matches
        for (const link of advertiserLinks) {
          const text = await link.textContent();
          if (text && text.toLowerCase().includes(query.toLowerCase())) {
            await link.click();
            await page.waitForTimeout(3000);
            break;
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Search interaction failed: ${(error as Error).message}`);
    }
  }

  private async waitForAdsToLoad(page: Page): Promise<void> {
    try {
      // Wait for ad cards to appear
      const waitSelectors = [
        '[data-ad-preview]',
        '.creative-preview',
        '[class*="ad-card"]',
        '[class*="AdCard"]',
        '[class*="creative"]',
        '.ad-preview',
        'creative-preview'
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

      // Fallback: just wait
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
        // Count elements that look like ad cards
        const selectors = [
          '[data-ad-preview]',
          '.creative-preview',
          '[class*="ad-card"]',
          '[class*="AdCard"]',
          '[class*="creative"]'
        ];

        let count = 0;
        for (const selector of selectors) {
          count += document.querySelectorAll(selector).length;
        }

        // Also try counting by visible ad-like content
        if (count === 0) {
          const elements = document.querySelectorAll('div');
          elements.forEach(el => {
            const text = el.innerText || '';
            if (text.includes('Ad format') || text.includes('Last shown') ||
                text.includes('First shown') || text.includes('Advertiser')) {
              if (text.length < 2000) count++;
            }
          });
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

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      // Try clicking "Show more" if available
      try {
        const showMoreButton = await page.$('button:has-text("Show more"), button:has-text("Load more"), [class*="show-more"]');
        if (showMoreButton) {
          await showMoreButton.click();
          await page.waitForTimeout(2000);
        }
      } catch {
        // Continue scrolling
      }
    }
  }

  private async extractAdsFromPage(page: Page): Promise<GoogleAdData[]> {
    return await page.evaluate(() => {
      const ads: GoogleAdData[] = [];
      const seenIds = new Set<string>();

      // Strategy 1: Look for structured ad cards
      const allElements = document.querySelectorAll('*');

      allElements.forEach((element) => {
        const text = element.textContent || '';

        // Skip if too small or too large
        if (text.length < 50 || text.length > 5000) return;

        // Look for indicators of an ad card
        const hasAdIndicators = text.includes('Ad format') ||
                                text.includes('Last shown') ||
                                text.includes('First shown') ||
                                text.includes('creative');

        if (!hasAdIndicators) return;

        // Generate unique ID
        const adId = `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Skip duplicates by content hash
        const contentHash = text.substring(0, 200);
        if (seenIds.has(contentHash)) return;
        seenIds.add(contentHash);

        const adData = parseAdContent(element, text, adId);
        if (adData.primaryText && adData.primaryText.length > 5) {
          ads.push(adData);
        }
      });

      // Strategy 2: Parse entire page if structured extraction fails
      if (ads.length === 0) {
        const pageText = document.body.innerText;
        const sections = pageText.split(/(?=Ad format|First shown|Advertiser)/gi);

        sections.forEach((section, index) => {
          if (section.length < 30 || section.length > 3000) return;

          const adId = `google_text_${index}`;
          const contentKey = section.substring(0, 100);
          if (seenIds.has(contentKey)) return;
          seenIds.add(contentKey);

          const adData = parseTextSection(section, adId);
          if (adData.primaryText && adData.primaryText.length > 10) {
            ads.push(adData);
          }
        });
      }

      function parseAdContent(element: Element, text: string, adId: string): GoogleAdData {
        // Extract advertiser name
        let advertiserName = '';
        const advertiserMatch = text.match(/(?:Advertiser|By)[:\s]+([^\n]+)/i);
        if (advertiserMatch) {
          advertiserName = advertiserMatch[1].trim().substring(0, 100);
        }

        // Extract headline
        let headline = '';
        const headlineEl = element.querySelector('h1, h2, h3, [class*="headline"], [class*="title"]');
        if (headlineEl) {
          headline = headlineEl.textContent?.trim() || '';
        }

        // Extract primary text/description
        let primaryText = '';
        let description = '';

        // Look for description elements
        const descEl = element.querySelector('[class*="description"], [class*="body"], p');
        if (descEl) {
          primaryText = descEl.textContent?.trim() || '';
        }

        // If no specific element, extract from text
        if (!primaryText) {
          const lines = text.split('\n').filter(l => l.trim().length > 15);
          for (const line of lines) {
            // Skip meta information lines
            if (line.match(/^(Ad format|First shown|Last shown|Advertiser|Region)/i)) continue;
            if (!primaryText) {
              primaryText = line.trim();
            } else if (!description) {
              description = line.trim();
            }
            if (primaryText && description) break;
          }
        }

        // Extract dates
        let startDate: string | undefined;
        let lastSeenDate: string | undefined;

        const firstShownMatch = text.match(/First shown[:\s]+([^\n]+)/i);
        if (firstShownMatch) startDate = firstShownMatch[1].trim();

        const lastShownMatch = text.match(/Last shown[:\s]+([^\n]+)/i);
        if (lastShownMatch) lastSeenDate = lastShownMatch[1].trim();

        // Extract ad format
        const formats: string[] = [];
        const formatMatch = text.match(/Ad format[:\s]+([^\n]+)/i);
        if (formatMatch) {
          const format = formatMatch[1].toLowerCase();
          if (format.includes('text')) formats.push('text');
          if (format.includes('image')) formats.push('image');
          if (format.includes('video')) formats.push('video');
        }

        // Extract regions
        const regions: string[] = [];
        const regionPatterns = ['United States', 'US', 'UK', 'Canada', 'Australia', 'Germany', 'France'];
        regionPatterns.forEach(r => {
          if (text.includes(r)) regions.push(r);
        });

        // Detect ad type
        let adType: string | undefined;
        if (text.toLowerCase().includes('search')) adType = 'search';
        else if (text.toLowerCase().includes('display')) adType = 'display';
        else if (text.toLowerCase().includes('video')) adType = 'video';
        else if (text.toLowerCase().includes('shopping')) adType = 'shopping';

        return {
          adId,
          advertiserName,
          primaryText: primaryText.substring(0, 500),
          headline,
          description,
          startDate,
          lastSeenDate,
          formats: formats.length > 0 ? formats : ['unknown'],
          regions: regions.length > 0 ? regions : ['US'],
          adType
        };
      }

      function parseTextSection(text: string, adId: string): GoogleAdData {
        const lines = text.split('\n').filter(l => l.trim().length > 5);

        let advertiserName = '';
        let primaryText = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.match(/^Advertiser/i)) {
            advertiserName = trimmed.replace(/^Advertiser[:\s]*/i, '');
          } else if (!primaryText && trimmed.length > 15 && !trimmed.match(/^(Ad format|First shown|Last shown|Region)/i)) {
            primaryText = trimmed;
          }
        }

        return {
          adId,
          advertiserName,
          primaryText,
          formats: ['unknown'],
          regions: ['US']
        };
      }

      return ads;
    });
  }

  private processAd(raw: GoogleAdData, competitor: string): Ad {
    // Determine media type from formats
    let mediaType: 'image' | 'video' | 'carousel' | undefined;
    if (raw.formats.includes('video')) mediaType = 'video';
    else if (raw.formats.includes('image')) mediaType = 'image';

    return this.createBaseAd(competitor, {
      primaryText: raw.primaryText,
      headline: raw.headline || raw.advertiserName,
      description: raw.description,
      startDate: raw.startDate,
      endDate: raw.lastSeenDate,
      platforms: ['Google'],
      mediaType,
      destinationUrl: raw.destinationUrl,
      hashtags: this.extractHashtags(raw.primaryText),
      rawData: {
        adId: raw.adId,
        advertiserName: raw.advertiserName,
        formats: raw.formats,
        regions: raw.regions,
        adType: raw.adType
      }
    });
  }

  /**
   * Extract ads via third-party API services
   * Since Google doesn't have a public Transparency Center API,
   * we use SerpApi or SearchAPI.io as alternatives
   */
  async extractViaApi(options: ExtractionOptions): Promise<Ad[] | null> {
    const apiConfig = this.config.api?.google;

    // Try SerpApi first
    if (apiConfig?.serpApiKey) {
      const result = await this.extractViaSerpApi(apiConfig.serpApiKey, options);
      if (result && result.length > 0) return result;
    }

    // Fall back to SearchAPI.io
    if (apiConfig?.searchApiKey) {
      const result = await this.extractViaSearchApi(apiConfig.searchApiKey, options);
      if (result && result.length > 0) return result;
    }

    if (!apiConfig?.serpApiKey && !apiConfig?.searchApiKey) {
      this.logger.debug('No Google third-party API credentials configured');
    }

    return null;
  }

  /**
   * Extract ads using SerpApi Google Ads Transparency endpoint
   * Docs: https://serpapi.com/google-ads-transparency-center
   */
  private async extractViaSerpApi(apiKey: string, options: ExtractionOptions): Promise<Ad[] | null> {
    this.logger.info('Extracting via SerpApi Google Ads Transparency...');
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      const baseUrl = 'https://serpapi.com/search.json';

      const params: Record<string, string> = {
        engine: 'google_ads_transparency_center',
        api_key: apiKey,
        advertiser_id: options.competitor,
        region: options.country || 'US'
      };

      // Handle search by advertiser name vs ID
      if (options.searchType === 'keyword') {
        params.q = options.competitor;
        delete params.advertiser_id;
      }

      let start = 0;
      let totalFetched = 0;

      while (totalFetched < maxAds) {
        this.emitProgress(`Fetching ads from SerpApi (${totalFetched}/${maxAds})...`,
          Math.round((totalFetched / maxAds) * 100));

        params.start = start.toString();

        const response = await axios.get(baseUrl, {
          params,
          timeout: 30000
        });

        const data = response.data;

        if (data.error) {
          this.logger.error(`SerpApi Error: ${data.error}`);
          break;
        }

        const adResults = data.ads || data.ad_results || [];
        if (adResults.length === 0) {
          this.logger.debug('No more ads from SerpApi');
          break;
        }

        for (const apiAd of adResults) {
          if (totalFetched >= maxAds) break;

          const ad = this.processSerpApiAd(apiAd, options.competitor);
          ads.push(ad);
          this.emitAdFound(ad);
          totalFetched++;
        }

        // Check for pagination
        if (!data.serpapi_pagination?.next || adResults.length < 10) {
          break;
        }

        start += adResults.length;
      }

      this.logger.info(`Extracted ${ads.length} ads via SerpApi`);
      return ads.length > 0 ? ads : null;

    } catch (error) {
      const err = error as any;
      if (err.response?.status === 401) {
        this.logger.error('SerpApi: Invalid API key');
      } else if (err.response?.status === 429) {
        this.logger.error('SerpApi: Rate limit exceeded');
      } else {
        this.logger.error(`SerpApi request failed: ${err.message}`);
      }
      return null;
    }
  }

  /**
   * Extract ads using SearchAPI.io Google Ads endpoint
   * Docs: https://www.searchapi.io/docs/google-ads
   */
  private async extractViaSearchApi(apiKey: string, options: ExtractionOptions): Promise<Ad[] | null> {
    this.logger.info('Extracting via SearchAPI.io Google Ads...');
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      const baseUrl = 'https://www.searchapi.io/api/v1/search';

      const params: Record<string, string> = {
        engine: 'google_ads_transparency',
        api_key: apiKey,
        q: options.competitor,
        region: options.country || 'US'
      };

      let page = 1;
      let totalFetched = 0;

      while (totalFetched < maxAds) {
        this.emitProgress(`Fetching ads from SearchAPI.io (${totalFetched}/${maxAds})...`,
          Math.round((totalFetched / maxAds) * 100));

        params.page = page.toString();

        const response = await axios.get(baseUrl, {
          params,
          timeout: 30000
        });

        const data = response.data;

        if (data.error) {
          this.logger.error(`SearchAPI.io Error: ${data.error}`);
          break;
        }

        const adResults = data.ads || data.results || [];
        if (adResults.length === 0) {
          this.logger.debug('No more ads from SearchAPI.io');
          break;
        }

        for (const apiAd of adResults) {
          if (totalFetched >= maxAds) break;

          const ad = this.processSearchApiAd(apiAd, options.competitor);
          ads.push(ad);
          this.emitAdFound(ad);
          totalFetched++;
        }

        // Check for more pages
        if (!data.pagination?.next_page || adResults.length < 10) {
          break;
        }

        page++;
      }

      this.logger.info(`Extracted ${ads.length} ads via SearchAPI.io`);
      return ads.length > 0 ? ads : null;

    } catch (error) {
      const err = error as any;
      if (err.response?.status === 401) {
        this.logger.error('SearchAPI.io: Invalid API key');
      } else if (err.response?.status === 429) {
        this.logger.error('SearchAPI.io: Rate limit exceeded');
      } else {
        this.logger.error(`SearchAPI.io request failed: ${err.message}`);
      }
      return null;
    }
  }

  /**
   * Process SerpApi response into Ad object
   */
  private processSerpApiAd(apiAd: any, competitor: string): Ad {
    // Extract primary text
    const primaryText = apiAd.text || apiAd.description || apiAd.body || '';

    // Extract headline
    const headline = apiAd.title || apiAd.headline || '';

    // Determine media type
    let mediaType: 'image' | 'video' | 'carousel' | undefined;
    const format = (apiAd.format || apiAd.ad_type || '').toLowerCase();
    if (format.includes('video')) mediaType = 'video';
    else if (format.includes('image') || format.includes('display')) mediaType = 'image';

    // Parse dates
    const startDate = apiAd.first_shown || apiAd.start_date;
    const endDate = apiAd.last_shown || apiAd.end_date;

    // Extract regions
    const regions = apiAd.regions || apiAd.countries || [];

    return this.createBaseAd(competitor, {
      primaryText,
      headline,
      description: apiAd.description,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      platforms: ['Google'],
      mediaType,
      destinationUrl: apiAd.destination_url || apiAd.link || apiAd.url,
      hashtags: this.extractHashtags(primaryText),
      rawData: {
        adId: apiAd.ad_id || apiAd.id,
        advertiserName: apiAd.advertiser_name || apiAd.advertiser,
        advertiserId: apiAd.advertiser_id,
        format: apiAd.format || apiAd.ad_type,
        regions: regions,
        thumbnail: apiAd.thumbnail || apiAd.image_url,
        impressions: apiAd.impressions,
        source: 'serpapi'
      }
    });
  }

  /**
   * Process SearchAPI.io response into Ad object
   */
  private processSearchApiAd(apiAd: any, competitor: string): Ad {
    // Extract primary text
    const primaryText = apiAd.text || apiAd.body || apiAd.snippet || '';

    // Extract headline
    const headline = apiAd.title || apiAd.headline || '';

    // Determine media type
    let mediaType: 'image' | 'video' | 'carousel' | undefined;
    const format = (apiAd.format || apiAd.type || '').toLowerCase();
    if (format.includes('video')) mediaType = 'video';
    else if (format.includes('image') || format.includes('display')) mediaType = 'image';

    // Parse dates
    const startDate = apiAd.first_shown || apiAd.date_first_shown;
    const endDate = apiAd.last_shown || apiAd.date_last_shown;

    return this.createBaseAd(competitor, {
      primaryText,
      headline,
      description: apiAd.description,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      platforms: ['Google'],
      mediaType,
      destinationUrl: apiAd.destination_url || apiAd.link,
      hashtags: this.extractHashtags(primaryText),
      rawData: {
        adId: apiAd.id,
        advertiserName: apiAd.advertiser,
        format: apiAd.format || apiAd.type,
        regions: apiAd.regions || apiAd.countries,
        thumbnail: apiAd.thumbnail || apiAd.image,
        source: 'searchapi'
      }
    });
  }
}
