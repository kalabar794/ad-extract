import { Platform } from './ad';

export interface BrowserConfig {
  headless: boolean;
  slowMo: number;
  timeout: number;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
}

export interface ExtractionConfig {
  defaultMaxAds: number;
  screenshots: boolean;
  landingPageAnalysis: boolean;
  retryAttempts: number;
  retryDelay: number;
  useStealthPlugin: boolean;
}

export interface DatabaseConfig {
  path: string;
}

export interface OutputConfig {
  directory: string;
  screenshotsDirectory: string;
  formats: ('json' | 'markdown' | 'html' | 'intelligence' | 'excel' | 'pdf')[];
  generateExecutiveSummary: boolean;
}

export interface CategorizationConfig {
  confidenceThreshold: number;
  defaultCategory: string;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export interface ApiConfig {
  meta?: {
    accessToken?: string;
    appId?: string;
    appSecret?: string;
  };
  tiktok?: {
    clientKey?: string;
    clientSecret?: string;
  };
  google?: {
    // Google doesn't have official API - use third-party
    serpApiKey?: string;      // SerpApi
    searchApiKey?: string;    // SearchAPI.io
  };
  linkedin?: {
    // LinkedIn doesn't have public ad library API - use third-party
    searchApiKey?: string;    // SearchAPI.io
    apifyToken?: string;      // Apify scraper
  };
}

export interface AppConfig {
  browser: BrowserConfig;
  extraction: ExtractionConfig;
  database: DatabaseConfig;
  output: OutputConfig;
  categorization: CategorizationConfig;
  server: ServerConfig;
  api?: ApiConfig;
  enabledPlatforms: Platform[];
}

export const defaultConfig: AppConfig = {
  browser: {
    headless: true,
    slowMo: 100,
    timeout: 30000,
    viewport: {
      width: 1920,
      height: 1080
    }
  },
  extraction: {
    defaultMaxAds: 50,
    screenshots: true,
    landingPageAnalysis: false,
    retryAttempts: 3,
    retryDelay: 2000,
    useStealthPlugin: true
  },
  database: {
    path: './data/ads.db'
  },
  output: {
    directory: './output',
    screenshotsDirectory: './screenshots',
    formats: ['json', 'markdown'],
    generateExecutiveSummary: true
  },
  categorization: {
    confidenceThreshold: 0.5,
    defaultCategory: 'other'
  },
  server: {
    port: 3000,
    host: 'localhost'
  },
  enabledPlatforms: ['meta', 'tiktok', 'google', 'linkedin']
};
