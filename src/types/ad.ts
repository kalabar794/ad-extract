export type Platform = 'meta' | 'tiktok' | 'google' | 'linkedin';

export enum AdCategory {
  TESTIMONIAL = 'testimonial',
  OFFER_PROMO = 'offer_promo',
  EDUCATIONAL = 'educational',
  PRODUCT_FEATURE = 'product_feature',
  BRAND_AWARENESS = 'brand_awareness',
  EVENT = 'event',
  HIRING = 'hiring',
  URGENCY_SCARCITY = 'urgency_scarcity',
  PROBLEM_SOLUTION = 'problem_solution',
  COMPARISON = 'comparison',
  OTHER = 'other'
}

export interface Ad {
  id: string;
  competitor: string;
  platform: Platform;
  extractedAt: string;

  // Core ad content
  primaryText: string;
  headline?: string;
  description?: string;
  cta?: string;
  hashtags: string[];

  // Dates
  startDate?: string;
  endDate?: string;

  // Media
  mediaType?: 'image' | 'video' | 'carousel';
  mediaUrls?: string[];
  screenshotPath?: string;

  // Destination
  destinationUrl?: string;

  // Platform-specific
  platforms?: string[]; // e.g., ['Facebook', 'Instagram'] for Meta
  targetingInfo?: TargetingInfo;

  // Analysis results (populated after analysis)
  category?: AdCategory;
  categoryConfidence?: number;

  // Raw data for debugging
  rawData?: Record<string, unknown>;
}

export interface TargetingInfo {
  age?: { min?: number; max?: number };
  gender?: string[];
  locations?: string[];
  interests?: string[];
}

export interface ExtractionOptions {
  competitor: string;
  searchType?: 'keyword' | 'page' | 'advertiser_id';
  country?: string;
  maxAds?: number;
  includeInactive?: boolean;
  captureScreenshots?: boolean;
  analyzeLandingPages?: boolean;
}

export interface ExtractionResult {
  ads: Ad[];
  platform: Platform;
  competitor: string;
  extractedAt: string;
  duration: number; // ms
  errors?: string[];
  usedFallback?: boolean; // true if API fallback was used
}
