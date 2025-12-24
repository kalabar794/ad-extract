import { Page } from 'playwright';
import axios from 'axios';
import { BaseExtractor, ExtractorEvents } from './base';
import { Ad, ExtractionOptions } from '../types/ad';
import { AppConfig } from '../types/config';
import { MetaApiAd, MetaApiDemographic, MetaApiDeliveryRegion } from '../types/api-responses';

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
  videoUrl?: string;
  videoThumbnailUrl?: string;
  imageUrls?: string[];
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

      // Extract video/media URLs from the page
      this.emitProgress('Extracting media URLs...', 55);
      const mediaData = await this.extractMediaUrls(page);

      // Process ads
      for (let i = 0; i < Math.min(rawAds.length, maxAds); i++) {
        const raw = rawAds[i];

        // Match media data to this ad if available
        if (mediaData[i]) {
          raw.videoUrl = mediaData[i].videoUrl;
          raw.videoThumbnailUrl = mediaData[i].thumbnailUrl;
          raw.imageUrls = mediaData[i].imageUrls;
        }

        const ad = this.processAd(raw, options.competitor);

        if (this.config.extraction.screenshots) {
          // Take screenshot of full page for now
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

  /**
   * Extract video and image URLs from ad cards on the page
   */
  private async extractMediaUrls(page: Page): Promise<Array<{
    videoUrl?: string;
    thumbnailUrl?: string;
    imageUrls?: string[];
  }>> {
    return await page.evaluate(() => {
      const mediaData: Array<{
        videoUrl?: string;
        thumbnailUrl?: string;
        imageUrls?: string[];
      }> = [];

      // Find all ad containers (elements with Library ID)
      const adContainers: Element[] = [];
      const allElements = document.querySelectorAll('*');

      allElements.forEach((el) => {
        const text = el.textContent || '';
        if (text.includes('Library ID:') && text.includes('See ad details') && text.length < 5000) {
          adContainers.push(el);
        }
      });

      // For each ad container, extract media URLs
      adContainers.forEach((container) => {
        const data: {
          videoUrl?: string;
          thumbnailUrl?: string;
          imageUrls?: string[];
        } = {};

        // Look for video elements
        const videos = container.querySelectorAll('video');
        videos.forEach((video) => {
          // Check for source element
          const source = video.querySelector('source');
          if (source?.src) {
            data.videoUrl = source.src;
          } else if (video.src) {
            data.videoUrl = video.src;
          }

          // Get poster/thumbnail
          if (video.poster) {
            data.thumbnailUrl = video.poster;
          }
        });

        // Look for video source in data attributes or blob URLs
        const elementsWithData = container.querySelectorAll('[data-video-url], [data-src]');
        elementsWithData.forEach((el) => {
          const videoUrl = el.getAttribute('data-video-url') || el.getAttribute('data-src');
          if (videoUrl && (videoUrl.includes('.mp4') || videoUrl.includes('video'))) {
            data.videoUrl = videoUrl;
          }
        });

        // Look for images
        const images = container.querySelectorAll('img');
        const imageUrls: string[] = [];
        images.forEach((img) => {
          // Skip small icons and tracking pixels
          if (img.width > 100 && img.height > 100 && img.src) {
            // Skip data URLs and internal FB images
            if (!img.src.startsWith('data:') && !img.src.includes('emoji')) {
              imageUrls.push(img.src);
            }
          }
        });

        if (imageUrls.length > 0) {
          data.imageUrls = imageUrls;
          // If no video thumbnail, use first image as fallback
          if (!data.thumbnailUrl && imageUrls.length > 0) {
            data.thumbnailUrl = imageUrls[0];
          }
        }

        mediaData.push(data);
      });

      return mediaData;
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
      videoUrl: raw.videoUrl,
      videoThumbnailUrl: raw.videoThumbnailUrl,
      mediaUrls: raw.imageUrls,
      hashtags: this.extractHashtags(raw.primaryText),
      rawData: {
        libraryId: raw.libraryId,
        status: raw.status,
        advertiserName: raw.advertiserName
      }
    });
  }

  /**
   * Extract ads via Meta Ad Library API (Graph API ads_archive endpoint)
   * Requires: Facebook App with ads_read permission and valid access token
   * Docs: https://developers.facebook.com/docs/marketing-api/reference/ads_archive/
   */
  async extractViaApi(options: ExtractionOptions): Promise<Ad[] | null> {
    const apiConfig = this.config.api?.meta;

    if (!apiConfig?.accessToken) {
      this.logger.debug('No Meta API credentials configured');
      return null;
    }

    this.logger.info('Extracting via Meta Ad Library API...');
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      const baseUrl = 'https://graph.facebook.com/v18.0/ads_archive';

      // Build API parameters
      const params: Record<string, string> = {
        access_token: apiConfig.accessToken,
        ad_reached_countries: `["${options.country || 'US'}"]`,
        search_terms: options.competitor,
        ad_active_status: options.includeInactive ? 'ALL' : 'ACTIVE',
        ad_type: 'ALL',
        fields: [
          'id',
          'ad_creation_time',
          'ad_creative_bodies',
          'ad_creative_link_captions',
          'ad_creative_link_descriptions',
          'ad_creative_link_titles',
          'ad_delivery_start_time',
          'ad_delivery_stop_time',
          'ad_snapshot_url',
          'page_id',
          'page_name',
          'publisher_platforms',
          'bylines',
          'currency',
          'estimated_audience_size',
          'impressions',
          'spend',
          'demographic_distribution',
          'delivery_by_region'
        ].join(','),
        limit: Math.min(maxAds, 100).toString() // API max is 100 per request
      };

      // Handle search by page ID
      if (options.searchType === 'advertiser_id' || options.searchType === 'page') {
        params.search_page_ids = `["${options.competitor}"]`;
        delete params.search_terms;
      }

      let nextUrl: string | null = `${baseUrl}?${new URLSearchParams(params)}`;
      let totalFetched = 0;

      while (nextUrl && totalFetched < maxAds) {
        this.emitProgress(`Fetching ads from API (${totalFetched}/${maxAds})...`,
          Math.round((totalFetched / maxAds) * 100));

        const response = await axios.get(nextUrl, { timeout: 30000 });
        const data = response.data;

        if (!data.data || data.data.length === 0) {
          this.logger.debug('No more ads from API');
          break;
        }

        for (const apiAd of data.data) {
          if (totalFetched >= maxAds) break;

          const ad = this.processApiAd(apiAd, options.competitor);
          ads.push(ad);
          this.emitAdFound(ad);
          totalFetched++;
        }

        // Handle pagination
        nextUrl = data.paging?.next || null;
      }

      this.logger.info(`Extracted ${ads.length} ads via API`);
      return ads;

    } catch (error) {
      const err = error as any;

      // Handle specific API errors
      if (err.response?.data?.error) {
        const apiError = err.response.data.error;
        this.logger.error(`Meta API Error: ${apiError.message} (code: ${apiError.code})`);

        if (apiError.code === 190) {
          this.logger.error('Access token expired or invalid. Please refresh your token.');
        } else if (apiError.code === 100) {
          this.logger.error('Invalid parameter. Check search terms and country code.');
        } else if (apiError.code === 4) {
          this.logger.error('Rate limit exceeded. Wait before retrying.');
        }
      } else {
        this.logger.error(`API request failed: ${err.message}`);
      }

      return null;
    }
  }

  /**
   * Process API response into Ad object
   */
  private processApiAd(apiAd: MetaApiAd, competitor: string): Ad {
    // Extract primary text from creative bodies
    const primaryText = apiAd.ad_creative_bodies?.[0] || '';

    // Extract headline from link titles
    const headline = apiAd.ad_creative_link_titles?.[0] || '';

    // Extract description
    const description = apiAd.ad_creative_link_descriptions?.[0] || '';

    // Extract platforms
    const platforms = apiAd.publisher_platforms?.map((p: string) =>
      p.charAt(0).toUpperCase() + p.slice(1)
    ) || ['Facebook'];

    // Parse dates
    const startDate = apiAd.ad_delivery_start_time
      ? new Date(apiAd.ad_delivery_start_time).toISOString()
      : undefined;
    const endDate = apiAd.ad_delivery_stop_time
      ? new Date(apiAd.ad_delivery_stop_time).toISOString()
      : undefined;

    // Extract targeting info from demographic distribution
    const targetingInfo: Ad['targetingInfo'] = {};
    if (apiAd.demographic_distribution) {
      const demographics = apiAd.demographic_distribution as MetaApiDemographic[];
      const ageDemos = demographics.filter(d => d.age);
      const genderDemos = demographics.filter(d => d.gender);

      if (ageDemos.length > 0) {
        const ages = ageDemos.map(d => d.age!);
        targetingInfo.age = {
          min: Math.min(...ages.map((a: string) => parseInt(a.split('-')[0]))),
          max: Math.max(...ages.map((a: string) => parseInt(a.split('-')[1] || a.split('-')[0])))
        };
      }
      if (genderDemos.length > 0) {
        targetingInfo.gender = genderDemos.map(d => d.gender!);
      }
    }
    if (apiAd.delivery_by_region) {
      targetingInfo.locations = apiAd.delivery_by_region.map((r: MetaApiDeliveryRegion) => r.region);
    }

    return this.createBaseAd(competitor, {
      primaryText,
      headline,
      description,
      platforms,
      startDate,
      endDate,
      targetingInfo: Object.keys(targetingInfo).length > 0 ? targetingInfo : undefined,
      hashtags: this.extractHashtags(primaryText),
      rawData: {
        id: apiAd.id,
        pageId: apiAd.page_id,
        pageName: apiAd.page_name,
        snapshotUrl: apiAd.ad_snapshot_url,
        impressions: apiAd.impressions,
        spend: apiAd.spend,
        currency: apiAd.currency,
        estimatedAudienceSize: apiAd.estimated_audience_size,
        bylines: apiAd.bylines
      }
    });
  }
}
