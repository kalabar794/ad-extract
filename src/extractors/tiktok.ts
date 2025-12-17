import { Page } from 'playwright';
import axios from 'axios';
import { BaseExtractor, ExtractorEvents } from './base';
import { Ad, ExtractionOptions } from '../types/ad';
import { AppConfig } from '../types/config';
import { TikTokApiAd } from '../types/api-responses';

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
  videoUrl?: string;
  videoThumbnailUrl?: string;
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

      // Extract ads from page (includes video URLs since TikTok is video-first)
      const rawAds = await this.extractAdsFromPage(page);
      this.logger.info(`Found ${rawAds.length} ads`);

      // Extract video URLs separately for better accuracy
      this.emitProgress('Extracting video URLs...', 55);
      const videoUrls = await this.extractVideoUrls(page);

      // Process ads
      for (let i = 0; i < Math.min(rawAds.length, maxAds); i++) {
        const raw = rawAds[i];

        // Match video URL if available
        if (videoUrls[i]) {
          raw.videoUrl = videoUrls[i].videoUrl;
          raw.videoThumbnailUrl = videoUrls[i].thumbnailUrl;
        }

        const ad = this.processAd(raw, options.competitor);

        if (this.config.extraction.screenshots) {
          ad.screenshotPath = await this.captureAdScreenshot(page, ad.id);
        }

        ads.push(ad);
        this.emitAdFound(ad);

        const progress = 60 + (40 * (i + 1) / Math.min(rawAds.length, maxAds));
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

  /**
   * Extract video URLs from ad cards on the page
   * TikTok is video-first, so most ads will have video content
   */
  private async extractVideoUrls(page: Page): Promise<Array<{
    videoUrl?: string;
    thumbnailUrl?: string;
  }>> {
    return await page.evaluate(() => {
      const results: Array<{ videoUrl?: string; thumbnailUrl?: string }> = [];

      // Find ad card containers
      const adCardSelectors = [
        '[data-testid="ad-card"]',
        '.ad-card',
        '.ad-item',
        '[class*="AdCard"]',
        '[class*="ad-card"]',
        'div[class*="creative"]'
      ];

      let adCards: Element[] = [];
      for (const selector of adCardSelectors) {
        const cards = document.querySelectorAll(selector);
        if (cards.length > 0) {
          adCards = Array.from(cards);
          break;
        }
      }

      // If no structured cards found, try to find video containers
      if (adCards.length === 0) {
        // Look for any container with video elements
        const videoContainers = document.querySelectorAll('div:has(video), div:has([class*="video"])');
        adCards = Array.from(videoContainers);
      }

      for (const card of adCards) {
        const result: { videoUrl?: string; thumbnailUrl?: string } = {};

        // Strategy 1: Direct video element
        const videoEl = card.querySelector('video');
        if (videoEl) {
          // Check src attribute
          if (videoEl.src && !videoEl.src.startsWith('blob:')) {
            result.videoUrl = videoEl.src;
          }
          // Check source elements inside video
          const sourceEl = videoEl.querySelector('source');
          if (sourceEl?.src && !sourceEl.src.startsWith('blob:')) {
            result.videoUrl = sourceEl.src;
          }
          // Get poster as thumbnail
          if (videoEl.poster) {
            result.thumbnailUrl = videoEl.poster;
          }
        }

        // Strategy 2: Data attributes on elements
        const elementsWithData = Array.from(card.querySelectorAll('[data-video-url], [data-src], [data-video]'));
        for (const el of elementsWithData) {
          const videoUrl = el.getAttribute('data-video-url') ||
                          el.getAttribute('data-video') ||
                          el.getAttribute('data-src');
          if (videoUrl && !videoUrl.startsWith('blob:') && videoUrl.includes('.mp4')) {
            result.videoUrl = videoUrl;
            break;
          }
        }

        // Strategy 3: Look for video URLs in onclick or other attributes
        const allElements = Array.from(card.querySelectorAll('*'));
        for (const el of allElements) {
          // Check for video URL patterns in attributes
          for (const attr of Array.from(el.attributes)) {
            const value = attr.value;
            if (value && !result.videoUrl) {
              // Match TikTok video URL patterns
              const videoMatch = value.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/i) ||
                                value.match(/(https?:\/\/[^\s"']*tiktok[^\s"']*video[^\s"']*)/i) ||
                                value.match(/(https?:\/\/v[^\s"']*tiktok[^\s"']*)/i);
              if (videoMatch) {
                result.videoUrl = videoMatch[1];
              }
            }
          }
        }

        // Strategy 4: Get thumbnail from img elements if not found
        if (!result.thumbnailUrl) {
          const imgs = Array.from(card.querySelectorAll('img'));
          for (const img of imgs) {
            const src = img.src || img.getAttribute('data-src');
            if (src && img.width > 100 && img.height > 100) {
              result.thumbnailUrl = src;
              break;
            }
          }
        }

        // Strategy 5: Check background images for thumbnails
        if (!result.thumbnailUrl) {
          const bgElements = Array.from(card.querySelectorAll('[style*="background"]'));
          for (const el of bgElements) {
            const style = (el as HTMLElement).style.backgroundImage;
            const urlMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (urlMatch && urlMatch[1]) {
              result.thumbnailUrl = urlMatch[1];
              break;
            }
          }
        }

        results.push(result);
      }

      return results;
    });
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
    // If we have a video URL, ensure mediaType is 'video'
    const mediaType = raw.videoUrl
      ? 'video' as const
      : raw.format as 'image' | 'video' | 'carousel' | undefined;

    return this.createBaseAd(competitor, {
      primaryText: raw.primaryText,
      headline: raw.advertiserName,
      startDate: raw.startDate,
      endDate: raw.endDate,
      platforms: ['TikTok'],
      mediaType,
      destinationUrl: raw.destinationUrl,
      videoUrl: raw.videoUrl,
      videoThumbnailUrl: raw.videoThumbnailUrl,
      hashtags: this.extractHashtags(raw.primaryText),
      rawData: {
        adId: raw.adId,
        status: raw.status,
        advertiserName: raw.advertiserName,
        regions: raw.regions,
        videoUrl: raw.videoUrl
      }
    });
  }

  /**
   * Extract ads via TikTok Commercial Content API
   * Docs: https://developers.tiktok.com/doc/commercial-content-api-overview/
   * Requires: TikTok developer app with commercial content API access
   */
  async extractViaApi(options: ExtractionOptions): Promise<Ad[] | null> {
    const apiConfig = this.config.api?.tiktok;

    if (!apiConfig?.clientKey || !apiConfig?.clientSecret) {
      this.logger.debug('No TikTok API credentials configured');
      return null;
    }

    this.logger.info('Extracting via TikTok Commercial Content API...');
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      // Step 1: Get access token via client credentials flow
      const accessToken = await this.getAccessToken(apiConfig.clientKey, apiConfig.clientSecret);
      if (!accessToken) {
        this.logger.error('Failed to obtain TikTok access token');
        return null;
      }

      // Step 2: Query the Commercial Content API
      const baseUrl = 'https://open.tiktokapis.com/v2/research/adlib/ad/query/';

      // Build request body
      const requestBody: Record<string, any> = {
        filters: {
          search_term: options.competitor
        },
        max_count: Math.min(maxAds, 100), // API max per request
        fields: [
          'ad_id',
          'advertiser_business_name',
          'ad_text',
          'ad_start_date',
          'ad_end_date',
          'ad_reach',
          'ad_targeting',
          'ad_format',
          'video_url',
          'image_urls',
          'landing_page_url',
          'call_to_action',
          'impression_count',
          'click_count',
          'engagement_count'
        ]
      };

      // Add country filter if specified
      if (options.country) {
        requestBody.filters.country_code = options.country;
      }

      // Add date filters if specified
      if (options.dateRange) {
        requestBody.filters.ad_published_date_range = {
          min_date: options.dateRange.start,
          max_date: options.dateRange.end
        };
      }

      let cursor: string | null = null;
      let totalFetched = 0;

      while (totalFetched < maxAds) {
        this.emitProgress(`Fetching ads from TikTok API (${totalFetched}/${maxAds})...`,
          Math.round((totalFetched / maxAds) * 100));

        if (cursor) {
          requestBody.cursor = cursor;
        }

        const response = await axios.post(baseUrl, requestBody, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        const data = response.data;

        if (data.error?.code !== 'ok') {
          this.logger.error(`TikTok API Error: ${data.error?.message || 'Unknown error'}`);
          break;
        }

        if (!data.data?.ads || data.data.ads.length === 0) {
          this.logger.debug('No more ads from TikTok API');
          break;
        }

        for (const apiAd of data.data.ads) {
          if (totalFetched >= maxAds) break;

          const ad = this.processApiAd(apiAd, options.competitor);
          ads.push(ad);
          this.emitAdFound(ad);
          totalFetched++;
        }

        // Handle pagination
        cursor = data.data.cursor || null;
        if (!cursor || !data.data.has_more) {
          break;
        }
      }

      this.logger.info(`Extracted ${ads.length} ads via TikTok API`);
      return ads;

    } catch (error) {
      const err = error as any;

      if (err.response?.data?.error) {
        const apiError = err.response.data.error;
        this.logger.error(`TikTok API Error: ${apiError.message} (code: ${apiError.code})`);

        if (apiError.code === 'access_token_invalid') {
          this.logger.error('Access token invalid or expired. Please refresh credentials.');
        } else if (apiError.code === 'rate_limit_exceeded') {
          this.logger.error('Rate limit exceeded. Wait before retrying.');
        } else if (apiError.code === 'permission_denied') {
          this.logger.error('Permission denied. Ensure app has Commercial Content API access.');
        }
      } else {
        this.logger.error(`TikTok API request failed: ${err.message}`);
      }

      return null;
    }
  }

  /**
   * Get OAuth2 access token using client credentials flow
   */
  private async getAccessToken(clientKey: string, clientSecret: string): Promise<string | null> {
    try {
      const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      if (response.data.access_token) {
        this.logger.debug('Successfully obtained TikTok access token');
        return response.data.access_token;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get TikTok access token: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Process TikTok API response into Ad object
   */
  private processApiAd(apiAd: TikTokApiAd, competitor: string): Ad {
    // Extract primary text
    const primaryText = apiAd.ad_text || '';

    // Extract CTA
    const cta = apiAd.call_to_action || undefined;

    // Parse dates
    const startDate = apiAd.ad_start_date
      ? new Date(apiAd.ad_start_date).toISOString()
      : undefined;
    const endDate = apiAd.ad_end_date
      ? new Date(apiAd.ad_end_date).toISOString()
      : undefined;

    // Determine media type
    let mediaType: 'image' | 'video' | 'carousel' | undefined;
    if (apiAd.video_url) {
      mediaType = 'video';
    } else if (apiAd.image_urls && apiAd.image_urls.length > 1) {
      mediaType = 'carousel';
    } else if (apiAd.image_urls && apiAd.image_urls.length > 0) {
      mediaType = 'image';
    }

    // Extract targeting info
    const targetingInfo: Ad['targetingInfo'] = {};
    if (apiAd.ad_targeting) {
      const targeting = apiAd.ad_targeting;
      if (targeting.age_range) {
        targetingInfo.age = {
          min: targeting.age_range.min,
          max: targeting.age_range.max
        };
      }
      if (targeting.genders) {
        targetingInfo.gender = targeting.genders;
      }
      if (targeting.locations) {
        targetingInfo.locations = targeting.locations;
      }
      if (targeting.interests) {
        targetingInfo.interests = targeting.interests;
      }
    }

    return this.createBaseAd(competitor, {
      primaryText,
      headline: apiAd.advertiser_business_name || competitor,
      cta,
      startDate,
      endDate,
      platforms: ['TikTok'],
      mediaType,
      destinationUrl: apiAd.landing_page_url,
      videoUrl: apiAd.video_url,
      mediaUrls: apiAd.image_urls,
      targetingInfo: Object.keys(targetingInfo).length > 0 ? targetingInfo : undefined,
      hashtags: this.extractHashtags(primaryText),
      // Include API metrics in raw data and top-level fields
      impressions: apiAd.impression_count,
      reach: apiAd.ad_reach,
      rawData: {
        adId: apiAd.ad_id,
        advertiserName: apiAd.advertiser_business_name,
        adFormat: apiAd.ad_format,
        reach: apiAd.ad_reach,
        impressions: apiAd.impression_count,
        clicks: apiAd.click_count,
        engagement: apiAd.engagement_count,
        videoUrl: apiAd.video_url,
        imageUrls: apiAd.image_urls
      }
    });
  }
}
