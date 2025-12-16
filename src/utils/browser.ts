import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BrowserConfig } from '../types/config';
import { createLogger } from './logger';

const logger = createLogger('browser');

let browserInstance: Browser | null = null;

export async function getBrowser(config: BrowserConfig): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  logger.info('Launching browser...');

  browserInstance = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  return browserInstance;
}

export async function createContext(
  browser: Browser,
  config: BrowserConfig
): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: config.viewport,
    userAgent: config.userAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });

  // Add stealth scripts to avoid detection
  await context.addInitScript(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });

    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });
  });

  return context;
}

export async function createPage(
  context: BrowserContext,
  config: BrowserConfig
): Promise<Page> {
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeout);
  page.setDefaultNavigationTimeout(config.timeout);

  return page;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    logger.info('Closing browser...');
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function waitForSelector(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

export async function safeClick(
  page: Page,
  selector: string,
  options: { timeout?: number; force?: boolean } = {}
): Promise<boolean> {
  try {
    await page.click(selector, {
      timeout: options.timeout || 5000,
      force: options.force || false
    });
    return true;
  } catch {
    logger.warn(`Failed to click selector: ${selector}`);
    return false;
  }
}

export async function scrollToBottom(
  page: Page,
  maxScrolls: number = 10,
  scrollDelay: number = 1000
): Promise<void> {
  let previousHeight = 0;
  let scrollCount = 0;

  while (scrollCount < maxScrolls) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    if (currentHeight === previousHeight) {
      break;
    }

    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(scrollDelay);
    scrollCount++;
  }

  logger.debug(`Scrolled ${scrollCount} times`);
}

export async function takeScreenshot(
  page: Page,
  path: string,
  fullPage: boolean = false
): Promise<string> {
  await page.screenshot({ path, fullPage });
  logger.debug(`Screenshot saved: ${path}`);
  return path;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
