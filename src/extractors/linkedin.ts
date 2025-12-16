import { Page } from 'playwright';
import axios from 'axios';
import { BaseExtractor, ExtractorEvents } from './base';
import { Ad, ExtractionOptions } from '../types/ad';
import { AppConfig } from '../types/config';

const LINKEDIN_AD_LIBRARY_URL = 'https://www.linkedin.com/ad-library/';

interface LinkedInAdData {
  adId: string;
  advertiserName: string;
  primaryText: string;
  headline?: string;
  cta?: string;
  startDate?: string;
  endDate?: string;
  destinationUrl?: string;
  mediaType?: 'image' | 'video' | 'carousel';
  impressions?: string;
  targetingInfo?: {
    locations?: string[];
    companySize?: string[];
    industries?: string[];
    jobFunctions?: string[];
  };
}

export class LinkedInExtractor extends BaseExtractor {
  constructor(config: Partial<AppConfig> = {}, events: ExtractorEvents = {}) {
    super('linkedin', config, events);
  }

  async extractAds(options: ExtractionOptions): Promise<Ad[]> {
    const page = await this.initBrowser();
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      this.emitProgress('Navigating to LinkedIn Ad Library...', 5);

      // Navigate to LinkedIn Ad Library with search query
      const searchUrl = this.buildSearchUrl(options);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      this.emitProgress('Waiting for page to load...', 15);
      await page.waitForTimeout(3000);

      // Check if we need to handle login or consent dialogs
      await this.handleDialogs(page);

      this.emitProgress('Searching for ads...', 20);

      // Wait for ad results to load
      const hasResults = await this.waitForAdsToLoad(page);

      if (!hasResults) {
        this.logger.warn('No ads found for this advertiser');
        return ads;
      }

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

  private buildSearchUrl(options: ExtractionOptions): string {
    // LinkedIn Ad Library search URL format
    // The search is typically done by advertiser name
    const encodedCompetitor = encodeURIComponent(options.competitor);
    return `${LINKEDIN_AD_LIBRARY_URL}?advertiserName=${encodedCompetitor}`;
  }

  private async handleDialogs(page: Page): Promise<void> {
    try {
      // Handle cookie consent banner if present
      const cookieButton = await page.$('button[action-type="ACCEPT"]');
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(1000);
      }

      // Handle "Join LinkedIn" or sign-in prompts
      const dismissButton = await page.$('[data-tracking-control-name="public_jobs_nav-header-join"]');
      if (dismissButton) {
        // Just navigate around it - don't click join
        this.logger.debug('Sign-in prompt detected, continuing without login');
      }

      // Close any modal overlays
      const closeButtons = await page.$$('button[aria-label="Dismiss"], button[aria-label="Close"]');
      for (const btn of closeButtons) {
        try {
          await btn.click();
          await page.waitForTimeout(500);
        } catch {
          // Button may have been removed
        }
      }
    } catch (error) {
      this.logger.debug('No dialogs to handle');
    }
  }

  private async waitForAdsToLoad(page: Page): Promise<boolean> {
    try {
      // LinkedIn Ad Library uses various selectors for ad cards
      // Wait for any of these to appear
      await page.waitForSelector(
        '[data-test-id="ad-library-ad-card"], .ad-library-ad-card, [class*="ad-card"], [class*="AdCard"]',
        { timeout: 15000 }
      );
      await page.waitForTimeout(2000);
      return true;
    } catch {
      // Try alternative approach - look for any content indicating ads
      const pageContent = await page.content();
      if (pageContent.includes('Sponsored') || pageContent.includes('Promoted')) {
        return true;
      }

      this.logger.warn('Timeout waiting for ads - page may have no results or different structure');

      // Check for "no results" message
      const noResults = await page.$('text=No ads found');
      if (noResults) {
        return false;
      }

      // Still try to extract in case the structure is different
      return true;
    }
  }

  private async loadAdsUntilLimit(page: Page, limit: number): Promise<void> {
    let previousCount = 0;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      // Count current ads on page
      const currentCount = await page.evaluate(() => {
        // Try multiple selectors used by LinkedIn
        const cards = document.querySelectorAll(
          '[data-test-id="ad-library-ad-card"], .ad-library-ad-card, [class*="ad-card"], article'
        );
        return cards.length;
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

      // Try to click "Show more" button if present
      const showMoreButton = await page.$('button:has-text("Show more"), button:has-text("Load more")');
      if (showMoreButton) {
        try {
          await showMoreButton.click();
          await page.waitForTimeout(2000);
        } catch {
          // Button may not be clickable
        }
      }

      // Scroll down to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }
  }

  private async extractAdsFromPage(page: Page): Promise<LinkedInAdData[]> {
    return await page.evaluate(() => {
      const ads: LinkedInAdData[] = [];
      const seenIds = new Set<string>();

      // Try multiple approaches to find ad cards
      const selectors = [
        '[data-test-id="ad-library-ad-card"]',
        '.ad-library-ad-card',
        '[class*="ad-card"]',
        '[class*="AdCard"]',
        'article[class*="ad"]',
        '.feed-shared-update-v2' // LinkedIn's standard post format
      ];

      let adCards: Element[] = [];
      for (const selector of selectors) {
        const cards = document.querySelectorAll(selector);
        if (cards.length > 0) {
          adCards = Array.from(cards);
          break;
        }
      }

      // If no cards found, try to find ads by content patterns
      if (adCards.length === 0) {
        const allElements = document.querySelectorAll('div, article, section');
        adCards = Array.from(allElements).filter(el => {
          const text = el.textContent || '';
          return (
            (text.includes('Sponsored') || text.includes('Promoted')) &&
            text.length > 50 &&
            text.length < 5000
          );
        });
      }

      adCards.forEach((card, index) => {
        const text = card.textContent || '';
        const html = card.innerHTML || '';

        // Generate a unique ID
        const adId = `linkedin_${index}_${Date.now()}`;

        if (seenIds.has(adId)) return;
        seenIds.add(adId);

        // Extract advertiser name
        let advertiserName = '';
        const nameSelectors = [
          '[data-test-id="advertiser-name"]',
          '.ad-library-advertiser-name',
          '[class*="advertiser-name"]',
          '.feed-shared-actor__name',
          'a[href*="/company/"]'
        ];
        for (const selector of nameSelectors) {
          const nameEl = card.querySelector(selector);
          if (nameEl) {
            advertiserName = nameEl.textContent?.trim() || '';
            break;
          }
        }

        // Extract primary text (ad copy)
        let primaryText = '';
        const textSelectors = [
          '[data-test-id="ad-text"]',
          '.ad-library-ad-text',
          '[class*="ad-text"]',
          '.feed-shared-text',
          '.break-words'
        ];
        for (const selector of textSelectors) {
          const textEl = card.querySelector(selector);
          if (textEl) {
            primaryText = textEl.textContent?.trim() || '';
            break;
          }
        }

        // Fallback: extract from full text
        if (!primaryText && text.length > 20) {
          // Remove common UI elements from text
          primaryText = text
            .replace(/Sponsored|Promoted/g, '')
            .replace(/Like|Comment|Share|Send/g, '')
            .replace(/\d+ reactions?/g, '')
            .replace(/\d+ comments?/g, '')
            .trim()
            .substring(0, 1000);
        }

        // Extract headline
        let headline = '';
        const headlineEl = card.querySelector(
          '[data-test-id="ad-headline"], .ad-library-headline, h2, h3'
        );
        if (headlineEl) {
          headline = headlineEl.textContent?.trim() || '';
        }

        // Extract CTA
        let cta = '';
        const ctaPatterns = [
          'Learn More', 'Apply Now', 'Sign Up', 'Download', 'Register',
          'Get Started', 'Contact Us', 'Visit Website', 'Shop Now',
          'Subscribe', 'Follow', 'Request Demo', 'Book Now'
        ];
        for (const pattern of ctaPatterns) {
          if (text.includes(pattern)) {
            cta = pattern;
            break;
          }
        }

        // Also check for CTA buttons
        const ctaButton = card.querySelector('button[class*="cta"], a[class*="cta"], .ad-cta');
        if (ctaButton && !cta) {
          cta = ctaButton.textContent?.trim() || '';
        }

        // Extract dates
        let startDate = '';
        let endDate = '';
        const dateMatch = text.match(/(\w+ \d+, \d{4})/g);
        if (dateMatch && dateMatch.length > 0) {
          startDate = dateMatch[0];
          if (dateMatch.length > 1) {
            endDate = dateMatch[1];
          }
        }

        // Extract running period if available
        const runningMatch = text.match(/Running since (\w+ \d+, \d{4})/i);
        if (runningMatch) {
          startDate = runningMatch[1];
        }

        // Extract destination URL
        let destinationUrl = '';
        const links = card.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          // Skip LinkedIn internal links
          if (href && !href.includes('linkedin.com') && href.startsWith('http')) {
            destinationUrl = href;
          }
        });

        // Detect media type
        let mediaType: 'image' | 'video' | 'carousel' | undefined;
        if (html.includes('<video') || html.includes('video-player')) {
          mediaType = 'video';
        } else if (card.querySelectorAll('img').length > 1) {
          mediaType = 'carousel';
        } else if (card.querySelector('img')) {
          mediaType = 'image';
        }

        // Extract impressions if available
        let impressions = '';
        const impressionMatch = text.match(/(\d+[KMB]?)\s*impressions/i);
        if (impressionMatch) {
          impressions = impressionMatch[1];
        }

        // Extract targeting info
        const targetingInfo: LinkedInAdData['targetingInfo'] = {};

        // Look for location targeting
        const locationMatch = text.match(/Location:\s*([^,\n]+)/i);
        if (locationMatch) {
          targetingInfo.locations = [locationMatch[1].trim()];
        }

        // Look for industry targeting
        const industryMatch = text.match(/Industries?:\s*([^,\n]+)/i);
        if (industryMatch) {
          targetingInfo.industries = [industryMatch[1].trim()];
        }

        // Only add if we have meaningful content
        if (primaryText.length > 10 || headline.length > 5) {
          ads.push({
            adId,
            advertiserName,
            primaryText,
            headline,
            cta,
            startDate,
            endDate,
            destinationUrl,
            mediaType,
            impressions,
            targetingInfo: Object.keys(targetingInfo).length > 0 ? targetingInfo : undefined
          });
        }
      });

      return ads;
    });
  }

  private processAd(raw: LinkedInAdData, competitor: string): Ad {
    return this.createBaseAd(competitor, {
      primaryText: raw.primaryText,
      headline: raw.headline,
      cta: raw.cta,
      startDate: raw.startDate,
      endDate: raw.endDate,
      destinationUrl: raw.destinationUrl,
      mediaType: raw.mediaType,
      hashtags: this.extractHashtags(raw.primaryText),
      targetingInfo: raw.targetingInfo ? {
        locations: raw.targetingInfo.locations,
        interests: raw.targetingInfo.industries
      } : undefined,
      rawData: {
        adId: raw.adId,
        advertiserName: raw.advertiserName,
        impressions: raw.impressions,
        targetingInfo: raw.targetingInfo
      }
    });
  }

  /**
   * Extract ads via third-party API services
   * LinkedIn doesn't have a public ad library API, so we use:
   * - SearchAPI.io LinkedIn Ads endpoint
   * - Apify LinkedIn Ad Library scraper
   */
  async extractViaApi(options: ExtractionOptions): Promise<Ad[] | null> {
    const apiConfig = this.config.api?.linkedin;

    // Try SearchAPI.io first
    if (apiConfig?.searchApiKey) {
      const result = await this.extractViaSearchApi(apiConfig.searchApiKey, options);
      if (result && result.length > 0) return result;
    }

    // Fall back to Apify scraper
    if (apiConfig?.apifyToken) {
      const result = await this.extractViaApify(apiConfig.apifyToken, options);
      if (result && result.length > 0) return result;
    }

    if (!apiConfig?.searchApiKey && !apiConfig?.apifyToken) {
      this.logger.debug('No LinkedIn third-party API credentials configured');
    }

    return null;
  }

  /**
   * Extract ads using SearchAPI.io LinkedIn Ads endpoint
   * Docs: https://www.searchapi.io/docs/linkedin-ads
   */
  private async extractViaSearchApi(apiKey: string, options: ExtractionOptions): Promise<Ad[] | null> {
    this.logger.info('Extracting via SearchAPI.io LinkedIn Ads...');
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      const baseUrl = 'https://www.searchapi.io/api/v1/search';

      const params: Record<string, string> = {
        engine: 'linkedin_ads',
        api_key: apiKey,
        q: options.competitor
      };

      // Add country filter if specified
      if (options.country) {
        params.country = options.country;
      }

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
   * Extract ads using Apify LinkedIn Ad Library scraper
   * Docs: https://apify.com/apify/linkedin-ad-library-scraper
   */
  private async extractViaApify(apiToken: string, options: ExtractionOptions): Promise<Ad[] | null> {
    this.logger.info('Extracting via Apify LinkedIn Ad Library scraper...');
    const ads: Ad[] = [];
    const maxAds = options.maxAds || this.config.extraction.defaultMaxAds;

    try {
      // Step 1: Start the actor run
      const actorId = 'apify~linkedin-ad-library-scraper';
      const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs`;

      const runInput = {
        searchQuery: options.competitor,
        maxResults: maxAds,
        country: options.country || 'US'
      };

      this.emitProgress('Starting Apify scraper...', 10);

      const runResponse = await axios.post(runUrl, runInput, {
        params: { token: apiToken },
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const runId = runResponse.data.data.id;
      this.logger.debug(`Apify run started: ${runId}`);

      // Step 2: Wait for the run to complete
      const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}`;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max wait (5 seconds * 60)

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await axios.get(statusUrl, {
          params: { token: apiToken },
          timeout: 10000
        });

        const status = statusResponse.data.data.status;
        this.emitProgress(`Apify scraper running... (${attempts * 5}s)`,
          Math.min(10 + attempts, 80));

        if (status === 'SUCCEEDED') {
          break;
        } else if (status === 'FAILED' || status === 'ABORTED') {
          this.logger.error(`Apify run failed with status: ${status}`);
          return null;
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        this.logger.error('Apify run timed out');
        return null;
      }

      // Step 3: Get the results
      this.emitProgress('Fetching results...', 85);

      const datasetUrl = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items`;
      const resultsResponse = await axios.get(datasetUrl, {
        params: { token: apiToken },
        timeout: 30000
      });

      const adResults = resultsResponse.data;
      if (!Array.isArray(adResults) || adResults.length === 0) {
        this.logger.debug('No ads found from Apify');
        return null;
      }

      for (const apiAd of adResults) {
        if (ads.length >= maxAds) break;

        const ad = this.processApifyAd(apiAd, options.competitor);
        ads.push(ad);
        this.emitAdFound(ad);
      }

      this.logger.info(`Extracted ${ads.length} ads via Apify`);
      return ads.length > 0 ? ads : null;

    } catch (error) {
      const err = error as any;
      if (err.response?.status === 401) {
        this.logger.error('Apify: Invalid API token');
      } else if (err.response?.status === 402) {
        this.logger.error('Apify: Insufficient credits');
      } else {
        this.logger.error(`Apify request failed: ${err.message}`);
      }
      return null;
    }
  }

  /**
   * Process SearchAPI.io response into Ad object
   */
  private processSearchApiAd(apiAd: any, competitor: string): Ad {
    const primaryText = apiAd.text || apiAd.body || apiAd.description || '';
    const headline = apiAd.title || apiAd.headline || '';

    // Determine media type
    let mediaType: 'image' | 'video' | 'carousel' | undefined;
    const format = (apiAd.format || apiAd.type || '').toLowerCase();
    if (format.includes('video')) mediaType = 'video';
    else if (format.includes('carousel')) mediaType = 'carousel';
    else if (format.includes('image') || apiAd.image) mediaType = 'image';

    // Parse dates
    const startDate = apiAd.start_date || apiAd.first_shown;
    const endDate = apiAd.end_date || apiAd.last_shown;

    // Extract targeting info
    const targetingInfo: Ad['targetingInfo'] = {};
    if (apiAd.targeting) {
      if (apiAd.targeting.locations) {
        targetingInfo.locations = apiAd.targeting.locations;
      }
      if (apiAd.targeting.industries) {
        targetingInfo.interests = apiAd.targeting.industries;
      }
      if (apiAd.targeting.job_functions) {
        targetingInfo.interests = [
          ...(targetingInfo.interests || []),
          ...apiAd.targeting.job_functions
        ];
      }
    }

    return this.createBaseAd(competitor, {
      primaryText,
      headline,
      cta: apiAd.cta || apiAd.call_to_action,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      platforms: ['LinkedIn'],
      mediaType,
      destinationUrl: apiAd.destination_url || apiAd.link,
      targetingInfo: Object.keys(targetingInfo).length > 0 ? targetingInfo : undefined,
      hashtags: this.extractHashtags(primaryText),
      rawData: {
        adId: apiAd.id,
        advertiserName: apiAd.advertiser || apiAd.company_name,
        impressions: apiAd.impressions,
        image: apiAd.image || apiAd.thumbnail,
        source: 'searchapi'
      }
    });
  }

  /**
   * Process Apify response into Ad object
   */
  private processApifyAd(apiAd: any, competitor: string): Ad {
    const primaryText = apiAd.adText || apiAd.text || apiAd.description || '';
    const headline = apiAd.headline || apiAd.title || '';

    // Determine media type
    let mediaType: 'image' | 'video' | 'carousel' | undefined;
    if (apiAd.videoUrl || apiAd.video) {
      mediaType = 'video';
    } else if (apiAd.images && apiAd.images.length > 1) {
      mediaType = 'carousel';
    } else if (apiAd.imageUrl || apiAd.image || apiAd.images?.length > 0) {
      mediaType = 'image';
    }

    // Parse dates
    const startDate = apiAd.startDate || apiAd.dateStarted;
    const endDate = apiAd.endDate || apiAd.dateEnded;

    // Extract targeting info
    const targetingInfo: Ad['targetingInfo'] = {};
    if (apiAd.targetingCriteria) {
      const tc = apiAd.targetingCriteria;
      if (tc.locations) targetingInfo.locations = tc.locations;
      if (tc.industries) targetingInfo.interests = tc.industries;
      if (tc.companySize) {
        targetingInfo.interests = [
          ...(targetingInfo.interests || []),
          `Company Size: ${tc.companySize}`
        ];
      }
    }

    return this.createBaseAd(competitor, {
      primaryText,
      headline,
      cta: apiAd.callToAction || apiAd.cta,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      platforms: ['LinkedIn'],
      mediaType,
      destinationUrl: apiAd.destinationUrl || apiAd.landingPageUrl,
      targetingInfo: Object.keys(targetingInfo).length > 0 ? targetingInfo : undefined,
      hashtags: this.extractHashtags(primaryText),
      rawData: {
        adId: apiAd.adId || apiAd.id,
        advertiserName: apiAd.advertiserName || apiAd.companyName,
        impressions: apiAd.impressions,
        imageUrl: apiAd.imageUrl || apiAd.images?.[0],
        videoUrl: apiAd.videoUrl,
        targetingCriteria: apiAd.targetingCriteria,
        source: 'apify'
      }
    });
  }
}
