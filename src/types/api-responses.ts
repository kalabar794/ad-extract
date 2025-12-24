/**
 * API Response Types
 *
 * Type definitions for external API responses to replace `any` types
 */

// =============================================================================
// META AD LIBRARY API
// =============================================================================

export interface MetaApiDemographic {
  age?: string;
  gender?: string;
  percentage?: number;
}

export interface MetaApiDeliveryRegion {
  region: string;
  percentage?: number;
}

export interface MetaApiAd {
  id: string;
  ad_snapshot_url?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  page_id?: string;
  page_name?: string;
  bylines?: string;
  currency?: string;
  impressions?: { lower_bound?: string; upper_bound?: string };
  spend?: { lower_bound?: string; upper_bound?: string };
  demographic_distribution?: MetaApiDemographic[];
  delivery_by_region?: MetaApiDeliveryRegion[];
  publisher_platforms?: string[];
  estimated_audience_size?: { lower_bound?: number; upper_bound?: number };
}

export interface MetaApiResponse {
  data: MetaApiAd[];
  paging?: {
    cursors?: { after?: string; before?: string };
    next?: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

// =============================================================================
// TIKTOK COMMERCIAL CONTENT API
// =============================================================================

export interface TikTokApiTargeting {
  age_range?: { min?: number; max?: number };
  genders?: string[];
  locations?: string[];
  interests?: string[];
}

export interface TikTokApiAd {
  ad_id: string;
  advertiser_name?: string;
  advertiser_business_name?: string;
  advertiser_id?: string;
  ad_text?: string;
  hashtags?: string[];
  call_to_action?: string;
  landing_page_url?: string;
  destination_url?: string;
  create_time?: string;
  ad_start_date?: string;
  ad_end_date?: string;
  first_shown_date?: string;
  last_shown_date?: string;
  ad_format?: string;
  video_url?: string;
  image_urls?: string[];
  ad_targeting?: TikTokApiTargeting;
  reach?: number;
  ad_reach?: number;
  impression_count?: number;
  click_count?: number;
  engagement_count?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface TikTokApiResponse {
  code: number;
  message: string;
  data?: {
    ads: TikTokApiAd[];
    cursor?: string;
    has_more?: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TikTokTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

// =============================================================================
// GOOGLE ADS TRANSPARENCY (via SerpApi / SearchAPI.io)
// =============================================================================

export interface SerpApiGoogleAd {
  id?: string;
  ad_id?: string;
  advertiser_id?: string;
  advertiser?: string;
  advertiser_name?: string;
  text?: string;
  ad_text?: string;
  body?: string;
  title?: string;
  headline?: string;
  description?: string;
  destination_url?: string;
  link?: string;
  url?: string;
  final_url?: string;
  display_url?: string;
  format?: string;
  ad_type?: string;
  ad_format?: string;
  first_shown?: string;
  start_date?: string;
  last_shown?: string;
  end_date?: string;
  regions?: string[];
  countries?: string[];
  thumbnail?: string;
  image_url?: string;
  video_url?: string;
  impressions?: number;
}

export interface SerpApiResponse {
  search_metadata?: {
    id: string;
    status: string;
    created_at: string;
  };
  search_parameters?: Record<string, string>;
  ads?: SerpApiGoogleAd[];
  error?: string;
}

export interface SearchApiGoogleAd {
  id?: string;
  ad_id?: string;
  advertiser_id?: string;
  advertiser?: string;
  advertiser_name?: string;
  text?: string;
  body?: string;
  snippet?: string;
  ad_copy?: string;
  title?: string;
  headline?: string;
  description?: string;
  landing_page?: string;
  destination_url?: string;
  link?: string;
  format?: string;
  type?: string;
  first_shown?: string;
  date_first_shown?: string;
  first_seen?: string;
  last_shown?: string;
  date_last_shown?: string;
  last_seen?: string;
  regions?: string[];
  countries?: string[];
  thumbnail?: string;
  image?: string;
  image_url?: string;
  video_url?: string;
}

export interface SearchApiResponse {
  ads?: SearchApiGoogleAd[];
  total_results?: number;
  page?: number;
  error?: {
    message: string;
    code: number;
  };
}

// =============================================================================
// LINKEDIN AD LIBRARY (via SearchAPI.io / Apify)
// =============================================================================

export interface LinkedInSearchApiTargeting {
  locations?: string[];
  industries?: string[];
  job_functions?: string[];
}

export interface LinkedInSearchApiAd {
  id?: string;
  ad_id?: string;
  advertiser?: string;
  company_name?: string;
  text?: string;
  body?: string;
  ad_text?: string;
  title?: string;
  headline?: string;
  description?: string;
  cta?: string;
  call_to_action?: string;
  link?: string;
  landing_page_url?: string;
  destination_url?: string;
  start_date?: string;
  first_shown?: string;
  end_date?: string;
  last_shown?: string;
  format?: string;
  type?: string;
  ad_format?: string;
  image?: string;
  thumbnail?: string;
  image_url?: string;
  video_url?: string;
  impressions?: number;
  targeting?: LinkedInSearchApiTargeting;
}

export interface LinkedInApifyAd {
  id?: string;
  adId?: string;
  advertiserName?: string;
  companyName?: string;
  text?: string;
  adText?: string;
  adCopy?: string;
  title?: string;
  headline?: string;
  description?: string;
  cta?: string;
  callToAction?: string;
  destinationUrl?: string;
  landingPageUrl?: string;
  startDate?: string;
  dateStarted?: string;
  endDate?: string;
  dateEnded?: string;
  format?: string;
  image?: string;
  images?: string[];
  imageUrl?: string;
  video?: string;
  videoUrl?: string;
  impressions?: number;
  targetingCriteria?: LinkedInTargetingCriteria;
}

export interface LinkedInTargetingCriteria {
  locations?: string[];
  industries?: string[];
  jobTitles?: string[];
  companySize?: string[];
  seniority?: string[];
}

export interface LinkedInSearchApiResponse {
  ads?: LinkedInSearchApiAd[];
  total?: number;
  page?: number;
  error?: {
    message: string;
    code: number;
  };
}

export interface ApifyRunResponse {
  id: string;
  status: string;
  defaultDatasetId?: string;
}

export interface ApifyDatasetResponse {
  items?: LinkedInApifyAd[];
}

// =============================================================================
// COMMON API ERROR TYPES
// =============================================================================

export interface ApiError {
  message: string;
  code?: string | number;
  status?: number;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}
