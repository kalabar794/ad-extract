import { Page } from 'playwright';
import axios from 'axios';
import { BaseExtractor, ExtractorEvents } from './base';
import { Ad, ExtractionOptions } from '../types/ad';
import { AppConfig } from '../types/config';

// YouTube ads appear in Google Ads Transparency Center with video format
const GOOGLE_AD_TRANSPARENCY_URL = 'https://adstransparency.google.com';

interface YouTubeAdData {
  adId: string;
  advertiserName: string;
  primaryText: string;
  headline?: string;
  description?: string;
  startDate?: string;
  lastSeenDate?: string;
  videoUrl?: string;
  videoThumbnailUrl?: string;
  videoDuration?: number; // seconds
  channelName?: string;
  channelUrl?: string;
  regions: string[];
  adFormat?: 'skippable' | 'non_skippable' | 'bumper' | 'discovery' | 'masthead' | 'unknown';
  destinationUrl?: string;
}

export class YouTubeExtractor extends BaseExtractor {
  constructor(config: Partial<AppConfig> = {}, events: ExtractorEvents = {}) {
    super('youtube', config, events);
  }

  async extractAds(options: ExtractionOptions): Promise<Ad[]> {
    const page = await this.initBrowser();
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      this.emitProgress('Navigating to Google Ads Transparency Center for YouTube ads...', 5);

      // Navigate to Google Ads Transparency Center
      await page.goto(GOOGLE_AD_TRANSPARENCY_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      this.emitProgress('Waiting for page to load...', 10);
      await page.waitForTimeout(3000);

      // Search for the advertiser
      await this.performSearch(page, options.competitor);

      this.emitProgress('Filtering for video ads...', 15);
      await this.filterForVideoAds(page);

      this.emitProgress('Waiting for video ads to load...', 20);
      await page.waitForTimeout(5000);

      // Wait for ad results
      await this.waitForAdsToLoad(page);

      this.emitProgress('Loading more ads...', 30);

      // Scroll to load more ads
      await this.loadAdsUntilLimit(page, maxAds);

      this.emitProgress('Extracting YouTube ad data...', 50);

      // Extract ads from page
      const rawAds = await this.extractAdsFromPage(page);
      this.logger.info(`Found ${rawAds.length} YouTube video ads`);

      // Extract video URLs separately
      this.emitProgress('Extracting video URLs...', 55);
      const videoUrls = await this.extractVideoUrls(page);

      // Process ads
      for (let i = 0; i < Math.min(rawAds.length, maxAds); i++) {
        const raw = rawAds[i];

        // Match video URL if available
        if (videoUrls[i]) {
          raw.videoUrl = videoUrls[i].videoUrl;
          raw.videoThumbnailUrl = videoUrls[i].thumbnailUrl;
          raw.videoDuration = videoUrls[i].duration;
        }

        const ad = this.processAd(raw, options.competitor);

        if (this.config.extraction.screenshots) {
          ad.screenshotPath = await this.captureAdScreenshot(page, ad.id);
        }

        ads.push(ad);
        this.emitAdFound(ad);

        const progress = 60 + (40 * (i + 1) / Math.min(rawAds.length, maxAds));
        this.emitProgress(`Processed ${i + 1}/${Math.min(rawAds.length, maxAds)} YouTube ads`, progress);
      }

      this.logger.info(`Extracted ${ads.length} YouTube ads`);
    } catch (error) {
      this.logger.error(`Extraction failed: ${(error as Error).message}`);
      throw error;
    }

    return ads;
  }

  private async performSearch(page: Page, query: string): Promise<void> {
    try {
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
        await page.keyboard.press('Enter');
        this.logger.info(`Searched for: ${query}`);
      } else {
        // Try navigating directly with search param
        const searchUrl = `${GOOGLE_AD_TRANSPARENCY_URL}/?text=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        this.logger.info(`Navigated to search URL: ${searchUrl}`);
      }

      await page.waitForTimeout(3000);

      // Click on advertiser from results if found
      const advertiserLinks = await page.$$('a[href*="advertiser"], [class*="advertiser"]');
      if (advertiserLinks.length > 0) {
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

  /**
   * Apply video/YouTube ad filter in Google Ads Transparency
   */
  private async filterForVideoAds(page: Page): Promise<void> {
    try {
      // Look for filter/format dropdown
      const filterSelectors = [
        'button:has-text("Format")',
        'button:has-text("Ad format")',
        '[aria-label*="Format"]',
        '[data-filter="format"]',
        '.filter-button',
        'button[class*="filter"]'
      ];

      for (const selector of filterSelectors) {
        try {
          const filterButton = await page.$(selector);
          if (filterButton) {
            await filterButton.click();
            await page.waitForTimeout(1000);

            // Look for video option
            const videoOption = await page.$('text=/video/i, [data-value="video"], label:has-text("Video")');
            if (videoOption) {
              await videoOption.click();
              this.logger.info('Applied video ad format filter');
              await page.waitForTimeout(2000);
              return;
            }
          }
        } catch {
          continue;
        }
      }

      // Alternative: Try URL-based filtering
      const currentUrl = page.url();
      if (!currentUrl.includes('format=video')) {
        const separator = currentUrl.includes('?') ? '&' : '?';
        const videoFilterUrl = `${currentUrl}${separator}format=video`;
        await page.goto(videoFilterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        this.logger.info('Applied video filter via URL');
      }
    } catch (error) {
      this.logger.warn(`Could not apply video filter: ${(error as Error).message}`);
    }
  }

  private async waitForAdsToLoad(page: Page): Promise<void> {
    try {
      const waitSelectors = [
        '[data-ad-preview]',
        '.creative-preview',
        '[class*="ad-card"]',
        '[class*="video-preview"]',
        'video',
        '[class*="creative"]'
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
      const currentCount = await page.evaluate(() => {
        const selectors = [
          '[data-ad-preview]',
          '.creative-preview',
          '[class*="ad-card"]',
          '[class*="video"]',
          'video'
        ];

        let count = 0;
        for (const selector of selectors) {
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

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      try {
        const showMoreButton = await page.$('button:has-text("Show more"), button:has-text("Load more")');
        if (showMoreButton) {
          await showMoreButton.click();
          await page.waitForTimeout(2000);
        }
      } catch {
        // Continue scrolling
      }
    }
  }

  /**
   * Extract video URLs and metadata from ad cards
   */
  private async extractVideoUrls(page: Page): Promise<Array<{
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
  }>> {
    return await page.evaluate(() => {
      const results: Array<{ videoUrl?: string; thumbnailUrl?: string; duration?: number }> = [];

      // Find ad containers that likely contain videos
      const adContainers = Array.from(document.querySelectorAll(
        '[data-ad-preview], .creative-preview, [class*="ad-card"], [class*="video-preview"]'
      ));

      // If no structured containers, look for video elements
      if (adContainers.length === 0) {
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          const parent = video.closest('div');
          if (parent) {
            adContainers.push(parent);
          }
        });
      }

      for (const container of adContainers) {
        const result: { videoUrl?: string; thumbnailUrl?: string; duration?: number } = {};

        // Strategy 1: Direct video element
        const videoEl = container.querySelector('video');
        if (videoEl) {
          if (videoEl.src && !videoEl.src.startsWith('blob:')) {
            result.videoUrl = videoEl.src;
          }
          const sourceEl = videoEl.querySelector('source');
          if (sourceEl?.src && !sourceEl.src.startsWith('blob:')) {
            result.videoUrl = sourceEl.src;
          }
          if (videoEl.poster) {
            result.thumbnailUrl = videoEl.poster;
          }
          if (videoEl.duration && !isNaN(videoEl.duration)) {
            result.duration = Math.round(videoEl.duration);
          }
        }

        // Strategy 2: YouTube video URLs in data attributes or links
        const allElements = Array.from(container.querySelectorAll('*'));
        for (const el of allElements) {
          for (const attr of Array.from(el.attributes)) {
            const value = attr.value;
            if (!result.videoUrl && value) {
              // Match YouTube video URL patterns
              const ytMatch = value.match(/(https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+)/i) ||
                             value.match(/(https?:\/\/youtu\.be\/[\w-]+)/i) ||
                             value.match(/(https?:\/\/(?:www\.)?youtube\.com\/embed\/[\w-]+)/i);
              if (ytMatch) {
                result.videoUrl = ytMatch[1];
              }
              // Match generic video URLs
              const videoMatch = value.match(/(https?:\/\/[^\s"']+\.(?:mp4|webm|mov)[^\s"']*)/i);
              if (videoMatch && !result.videoUrl) {
                result.videoUrl = videoMatch[1];
              }
            }
          }
        }

        // Strategy 3: Get thumbnail from img elements
        if (!result.thumbnailUrl) {
          const imgs = Array.from(container.querySelectorAll('img'));
          for (const img of imgs) {
            const src = img.src || img.getAttribute('data-src');
            // Check for YouTube thumbnail patterns
            if (src && (src.includes('ytimg.com') || src.includes('youtube') ||
                       (img.width > 100 && img.height > 50))) {
              result.thumbnailUrl = src;
              break;
            }
          }
        }

        // Strategy 4: Parse duration from text
        if (!result.duration) {
          const text = container.textContent || '';
          const durationMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
          if (durationMatch) {
            const hours = durationMatch[3] ? parseInt(durationMatch[1]) : 0;
            const minutes = durationMatch[3] ? parseInt(durationMatch[2]) : parseInt(durationMatch[1]);
            const seconds = durationMatch[3] ? parseInt(durationMatch[3]) : parseInt(durationMatch[2]);
            result.duration = hours * 3600 + minutes * 60 + seconds;
          }
        }

        results.push(result);
      }

      return results;
    });
  }

  private async extractAdsFromPage(page: Page): Promise<YouTubeAdData[]> {
    return await page.evaluate(() => {
      const ads: YouTubeAdData[] = [];
      const seenIds = new Set<string>();

      // Look for ad containers
      const allElements = document.querySelectorAll('*');

      allElements.forEach((element) => {
        const text = element.textContent || '';

        // Skip if too small or too large
        if (text.length < 50 || text.length > 5000) return;

        // Look for video ad indicators
        const hasVideoIndicators = text.toLowerCase().includes('video') ||
                                   text.includes('Ad format') ||
                                   element.querySelector('video') !== null ||
                                   text.includes('YouTube') ||
                                   text.includes(':') && text.match(/\d{1,2}:\d{2}/);

        if (!hasVideoIndicators) return;

        // Generate unique ID
        const adId = `youtube_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Skip duplicates
        const contentHash = text.substring(0, 200);
        if (seenIds.has(contentHash)) return;
        seenIds.add(contentHash);

        const adData = parseAdContent(element, text, adId);
        if (adData.primaryText && adData.primaryText.length > 5) {
          ads.push(adData);
        }
      });

      function parseAdContent(element: Element, text: string, adId: string): YouTubeAdData {
        // Extract advertiser name
        let advertiserName = '';
        const advertiserMatch = text.match(/(?:Advertiser|By|Channel)[:\s]+([^\n]+)/i);
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

        const descEl = element.querySelector('[class*="description"], [class*="body"], p');
        if (descEl) {
          primaryText = descEl.textContent?.trim() || '';
        }

        if (!primaryText) {
          const lines = text.split('\n').filter(l => l.trim().length > 15);
          for (const line of lines) {
            if (line.match(/^(Ad format|First shown|Last shown|Advertiser|Region|Video)/i)) continue;
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

        // Extract regions
        const regions: string[] = [];
        const regionPatterns = ['United States', 'US', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Global'];
        regionPatterns.forEach(r => {
          if (text.includes(r)) regions.push(r);
        });

        // Detect YouTube ad format type
        let adFormat: YouTubeAdData['adFormat'] = 'unknown';
        const textLower = text.toLowerCase();
        if (textLower.includes('skippable')) adFormat = 'skippable';
        else if (textLower.includes('non-skippable') || textLower.includes('non_skippable')) adFormat = 'non_skippable';
        else if (textLower.includes('bumper')) adFormat = 'bumper';
        else if (textLower.includes('discovery') || textLower.includes('in-feed')) adFormat = 'discovery';
        else if (textLower.includes('masthead')) adFormat = 'masthead';

        // Extract channel info
        let channelName: string | undefined;
        let channelUrl: string | undefined;

        const channelMatch = text.match(/Channel[:\s]+([^\n]+)/i);
        if (channelMatch) {
          channelName = channelMatch[1].trim();
        }

        const channelUrlEl = element.querySelector('a[href*="youtube.com/channel"], a[href*="youtube.com/@"]');
        if (channelUrlEl) {
          channelUrl = channelUrlEl.getAttribute('href') || undefined;
          if (!channelName) {
            channelName = channelUrlEl.textContent?.trim();
          }
        }

        return {
          adId,
          advertiserName,
          primaryText: primaryText.substring(0, 500),
          headline,
          description,
          startDate,
          lastSeenDate,
          regions: regions.length > 0 ? regions : ['US'],
          adFormat,
          channelName,
          channelUrl
        };
      }

      return ads;
    });
  }

  private processAd(raw: YouTubeAdData, competitor: string): Ad {
    return this.createBaseAd(competitor, {
      primaryText: raw.primaryText,
      headline: raw.headline || raw.advertiserName,
      description: raw.description,
      startDate: raw.startDate,
      endDate: raw.lastSeenDate,
      platforms: ['YouTube'],
      mediaType: 'video',
      destinationUrl: raw.destinationUrl,
      videoUrl: raw.videoUrl,
      videoThumbnailUrl: raw.videoThumbnailUrl,
      hashtags: this.extractHashtags(raw.primaryText),
      rawData: {
        adId: raw.adId,
        advertiserName: raw.advertiserName,
        adFormat: raw.adFormat,
        videoDuration: raw.videoDuration,
        channelName: raw.channelName,
        channelUrl: raw.channelUrl,
        regions: raw.regions
      }
    });
  }

  /**
   * Extract ads via third-party API services
   * Uses SerpApi or SearchAPI.io for YouTube/video ads specifically
   */
  async extractViaApi(options: ExtractionOptions): Promise<Ad[] | null> {
    const apiConfig = this.config.api?.google;

    // Try SerpApi first with video filter
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
      this.logger.debug('No Google/YouTube API credentials configured');
    }

    return null;
  }

  /**
   * Extract YouTube ads using SerpApi
   */
  private async extractViaSerpApi(apiKey: string, options: ExtractionOptions): Promise<Ad[] | null> {
    this.logger.info('Extracting YouTube ads via SerpApi...');
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      const baseUrl = 'https://serpapi.com/search.json';

      const params: Record<string, string> = {
        engine: 'google_ads_transparency_center',
        api_key: apiKey,
        advertiser_id: options.competitor,
        region: options.country || 'US',
        format: 'video' // Filter for video ads
      };

      if (options.searchType === 'keyword') {
        params.q = options.competitor;
        delete params.advertiser_id;
      }

      let start = 0;
      let totalFetched = 0;

      while (totalFetched < maxAds) {
        this.emitProgress(`Fetching YouTube ads from SerpApi (${totalFetched}/${maxAds})...`,
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
          this.logger.debug('No more YouTube ads from SerpApi');
          break;
        }

        for (const apiAd of adResults) {
          if (totalFetched >= maxAds) break;

          // Only include video ads
          const format = (apiAd.format || apiAd.ad_type || '').toLowerCase();
          if (!format.includes('video')) continue;

          const ad = this.processApiAd(apiAd, options.competitor);
          ads.push(ad);
          this.emitAdFound(ad);
          totalFetched++;
        }

        if (!data.serpapi_pagination?.next || adResults.length < 10) {
          break;
        }

        start += adResults.length;
      }

      this.logger.info(`Extracted ${ads.length} YouTube ads via SerpApi`);
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
   * Extract YouTube ads using SearchAPI.io
   */
  private async extractViaSearchApi(apiKey: string, options: ExtractionOptions): Promise<Ad[] | null> {
    this.logger.info('Extracting YouTube ads via SearchAPI.io...');
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      const baseUrl = 'https://www.searchapi.io/api/v1/search';

      const params: Record<string, string> = {
        engine: 'google_ads_transparency',
        api_key: apiKey,
        q: options.competitor,
        region: options.country || 'US',
        format: 'video'
      };

      let page = 1;
      let totalFetched = 0;

      while (totalFetched < maxAds) {
        this.emitProgress(`Fetching YouTube ads from SearchAPI.io (${totalFetched}/${maxAds})...`,
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
          this.logger.debug('No more YouTube ads from SearchAPI.io');
          break;
        }

        for (const apiAd of adResults) {
          if (totalFetched >= maxAds) break;

          const format = (apiAd.format || apiAd.type || '').toLowerCase();
          if (!format.includes('video')) continue;

          const ad = this.processApiAd(apiAd, options.competitor);
          ads.push(ad);
          this.emitAdFound(ad);
          totalFetched++;
        }

        if (!data.pagination?.next_page || adResults.length < 10) {
          break;
        }

        page++;
      }

      this.logger.info(`Extracted ${ads.length} YouTube ads via SearchAPI.io`);
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
   * Process API response into Ad object
   */
  private processApiAd(apiAd: Record<string, any>, competitor: string): Ad {
    const primaryText = apiAd.text || apiAd.description || apiAd.body || '';
    const headline = apiAd.title || apiAd.headline || '';

    const startDate = apiAd.first_shown || apiAd.start_date;
    const endDate = apiAd.last_shown || apiAd.end_date;

    // Detect YouTube ad format from API data
    let adFormat: YouTubeAdData['adFormat'] = 'unknown';
    const formatStr = (apiAd.format || apiAd.ad_type || apiAd.video_format || '').toLowerCase();
    if (formatStr.includes('skippable') && !formatStr.includes('non')) adFormat = 'skippable';
    else if (formatStr.includes('non-skippable') || formatStr.includes('non_skippable')) adFormat = 'non_skippable';
    else if (formatStr.includes('bumper')) adFormat = 'bumper';
    else if (formatStr.includes('discovery') || formatStr.includes('in-feed')) adFormat = 'discovery';

    return this.createBaseAd(competitor, {
      primaryText,
      headline,
      description: apiAd.description,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      platforms: ['YouTube'],
      mediaType: 'video',
      destinationUrl: apiAd.destination_url || apiAd.link || apiAd.url,
      videoUrl: apiAd.video_url || apiAd.creative_url,
      videoThumbnailUrl: apiAd.thumbnail || apiAd.image_url || apiAd.preview_image,
      hashtags: this.extractHashtags(primaryText),
      rawData: {
        adId: apiAd.ad_id || apiAd.id,
        advertiserName: apiAd.advertiser_name || apiAd.advertiser,
        advertiserId: apiAd.advertiser_id,
        adFormat,
        videoDuration: apiAd.video_duration || apiAd.duration,
        channelName: apiAd.channel_name || apiAd.youtube_channel,
        channelUrl: apiAd.channel_url,
        regions: apiAd.regions || apiAd.countries || [],
        source: 'api'
      }
    });
  }
}
