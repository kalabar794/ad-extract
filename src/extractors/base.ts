import { Browser, BrowserContext, Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import {
  Ad,
  Platform,
  ExtractionOptions,
  ExtractionResult
} from '../types/ad';
import { AppConfig, defaultConfig } from '../types/config';
import {
  getBrowser,
  createContext,
  createPage,
  scrollToBottom,
  takeScreenshot,
  retryOperation
} from '../utils/browser';
import { createLogger } from '../utils/logger';

export interface ExtractorEvents {
  onProgress?: (message: string, progress: number) => void;
  onAdFound?: (ad: Ad) => void;
  onError?: (error: Error) => void;
}

export abstract class BaseExtractor {
  protected platform: Platform;
  protected config: AppConfig;
  protected logger: ReturnType<typeof createLogger>;
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected events: ExtractorEvents;

  constructor(
    platform: Platform,
    config: Partial<AppConfig> = {},
    events: ExtractorEvents = {}
  ) {
    this.platform = platform;
    this.config = { ...defaultConfig, ...config };
    this.logger = createLogger(`extractor:${platform}`);
    this.events = events;
  }

  /**
   * Main extraction method - must be implemented by each platform extractor
   */
  abstract extractAds(options: ExtractionOptions): Promise<Ad[]>;

  /**
   * Optional API fallback - override in subclass if API is available
   */
  async extractViaApi(options: ExtractionOptions): Promise<Ad[] | null> {
    this.logger.debug('No API fallback available for this platform');
    return null;
  }

  /**
   * Main entry point for extraction with fallback logic
   */
  async extract(options: ExtractionOptions): Promise<ExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let ads: Ad[] = [];
    let usedFallback = false;

    this.emitProgress('Starting extraction...', 0);

    try {
      // Try Playwright extraction first
      ads = await this.extractAds(options);
      this.emitProgress('Extraction complete', 100);
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Playwright extraction failed: ${err.message}`);
      errors.push(`Playwright: ${err.message}`);

      // Try API fallback
      this.emitProgress('Trying API fallback...', 50);
      try {
        const apiAds = await this.extractViaApi(options);
        if (apiAds && apiAds.length > 0) {
          ads = apiAds;
          usedFallback = true;
          this.emitProgress('API extraction complete', 100);
        } else {
          throw new Error('API returned no results');
        }
      } catch (apiError) {
        const apiErr = apiError as Error;
        errors.push(`API: ${apiErr.message}`);
        this.events.onError?.(apiErr);
      }
    } finally {
      await this.cleanup();
    }

    return {
      ads,
      platform: this.platform,
      competitor: options.competitor,
      extractedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined,
      usedFallback
    };
  }

  /**
   * Initialize browser, context, and page
   */
  protected async initBrowser(): Promise<Page> {
    this.browser = await getBrowser(this.config.browser);
    this.context = await createContext(this.browser, this.config.browser);
    this.page = await createPage(this.context, this.config.browser);
    return this.page;
  }

  /**
   * Clean up browser resources
   */
  protected async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    // Don't close browser instance - it's shared
  }

  /**
   * Navigate with retry logic
   */
  protected async navigateWithRetry(
    page: Page,
    url: string
  ): Promise<void> {
    await retryOperation(
      async () => {
        await page.goto(url, { waitUntil: 'networkidle' });
      },
      this.config.extraction.retryAttempts,
      this.config.extraction.retryDelay
    );
  }

  /**
   * Scroll to load more content
   */
  protected async loadMoreContent(
    page: Page,
    maxScrolls: number = 10
  ): Promise<void> {
    await scrollToBottom(page, maxScrolls);
  }

  /**
   * Capture screenshot of an ad
   */
  protected async captureAdScreenshot(
    page: Page,
    adId: string,
    selector?: string
  ): Promise<string | undefined> {
    if (!this.config.extraction.screenshots) {
      return undefined;
    }

    const screenshotDir = this.config.output.screenshotsDirectory;
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const filename = `${this.platform}_${adId}_${Date.now()}.png`;
    const filepath = path.join(screenshotDir, filename);

    try {
      if (selector) {
        const element = await page.$(selector);
        if (element) {
          await element.screenshot({ path: filepath });
        }
      } else {
        await takeScreenshot(page, filepath);
      }
      return filepath;
    } catch (error) {
      this.logger.warn(`Failed to capture screenshot: ${(error as Error).message}`);
      return undefined;
    }
  }

  /**
   * Generate unique ad ID
   */
  protected generateAdId(): string {
    return uuidv4();
  }

  /**
   * Create base ad object with common fields
   */
  protected createBaseAd(
    competitor: string,
    data: Partial<Ad> = {}
  ): Ad {
    return {
      id: this.generateAdId(),
      competitor,
      platform: this.platform,
      extractedAt: new Date().toISOString(),
      primaryText: '',
      hashtags: [],
      ...data
    };
  }

  /**
   * Extract hashtags from text
   */
  protected extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex) || [];
    return [...new Set(matches)];
  }

  /**
   * Clean ad text (remove extra whitespace, etc.)
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

  /**
   * Emit progress event
   */
  protected emitProgress(message: string, progress: number): void {
    this.logger.info(`[${progress}%] ${message}`);
    this.events.onProgress?.(message, progress);
  }

  /**
   * Emit ad found event
   */
  protected emitAdFound(ad: Ad): void {
    this.logger.debug(`Found ad: ${ad.id}`);
    this.events.onAdFound?.(ad);
  }
}
