/**
 * DOM selectors for each ad library platform
 * These may need updating as platforms change their layouts
 */

export const metaSelectors = {
  // Search and navigation
  searchInput: 'input[placeholder*="Search"]',
  searchButton: 'div[role="button"]:has-text("Search")',
  countrySelector: '[aria-label="Country"]',

  // Ad container and cards
  adLibraryContainer: '[class*="AdLibrarySearchResultsContainer"]',
  adCard: '[class*="_7jvw"]', // Meta's ad card wrapper
  adCardAlt: 'div[class*="x1yztbdb"]', // Alternative selector

  // Ad content
  adPrimaryText: '[class*="_4ik4"]',
  adHeadline: '[class*="_8nfa"]',
  adDescription: '[class*="_8nfb"]',
  adCTA: '[class*="x1i10hfl"]',

  // Media
  adImage: 'img[class*="x1lliihq"]',
  adVideo: 'video',

  // Metadata
  adStartDate: '[class*="x8t9es0"]:has-text("Started running")',
  adPlatforms: '[class*="xzsf02u"]', // Facebook, Instagram icons
  adStatus: '[class*="_7jwu"]', // Active/Inactive

  // Pagination and loading
  loadMoreButton: '[class*="x1i10hfl"]:has-text("See more")',
  spinner: '[role="progressbar"]',

  // Detail view
  seeAdDetails: ':text("See ad details")',
  adDetailModal: '[role="dialog"]',
  destinationUrl: 'a[href*="l.facebook.com"]'
};

export const tiktokSelectors = {
  // Search
  searchInput: 'input[placeholder*="Search"]',
  searchButton: 'button[type="submit"]',

  // Ad cards
  adCard: '[class*="ad-card"]',
  adContainer: '[class*="search-result"]',

  // Ad content
  adText: '[class*="ad-text"]',
  adCaption: '[class*="caption"]',

  // Media
  videoPlayer: 'video',
  videoThumbnail: '[class*="thumbnail"]',

  // Metadata
  adDateRange: '[class*="date-range"]',
  targetingInfo: '[class*="targeting"]',
  reachMetrics: '[class*="impressions"]',

  // Navigation
  loadMore: '[class*="load-more"]',
  adDetailLink: '[class*="detail-link"]'
};

export const googleSelectors = {
  // Search
  searchInput: 'input[aria-label*="Search"]',
  searchButton: 'button[aria-label="Search"]',

  // Results
  advertiserCard: '[class*="advertiser-card"]',
  adCard: '[class*="creative-card"]',

  // Ad content
  headline: '[class*="headline"]',
  description: '[class*="description"]',
  displayUrl: '[class*="display-url"]',

  // Metadata
  dateRange: '[class*="date-range"]',
  regionInfo: '[class*="region"]',
  formatType: '[class*="format"]',

  // Navigation
  viewMoreAds: ':text("View more ads")',
  pagination: '[class*="pagination"]'
};

export const linkedinSelectors = {
  // Search
  searchInput: 'input[class*="search"]',

  // Ad cards
  adCard: '[class*="ad-card"]',
  sponsoredContent: '[class*="sponsored"]',

  // Content
  adText: '[class*="ad-text"]',
  adImage: '[class*="ad-image"] img',

  // Metadata
  advertiserName: '[class*="advertiser-name"]',
  dateInfo: '[class*="date"]'
};

/**
 * Get selectors for a specific platform
 */
export function getSelectors(platform: string) {
  switch (platform) {
    case 'meta':
      return metaSelectors;
    case 'tiktok':
      return tiktokSelectors;
    case 'google':
      return googleSelectors;
    case 'linkedin':
      return linkedinSelectors;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}
