import { Platform } from '../types/ad';
import { AppConfig } from '../types/config';
import { BaseExtractor, ExtractorEvents } from './base';
import { MetaExtractor } from './meta';
import { TikTokExtractor } from './tiktok';
import { GoogleExtractor } from './google';
import { LinkedInExtractor } from './linkedin';
import { YouTubeExtractor } from './youtube';

export { BaseExtractor, ExtractorEvents } from './base';
export { MetaExtractor } from './meta';
export { TikTokExtractor } from './tiktok';
export { GoogleExtractor } from './google';
export { LinkedInExtractor } from './linkedin';
export { YouTubeExtractor } from './youtube';

/**
 * Factory function to get the appropriate extractor for a platform
 */
export function getExtractor(
  platform: Platform,
  config: Partial<AppConfig> = {},
  events: ExtractorEvents = {}
): BaseExtractor {
  switch (platform) {
    case 'meta':
      return new MetaExtractor(config, events);
    case 'tiktok':
      return new TikTokExtractor(config, events);
    case 'google':
      return new GoogleExtractor(config, events);
    case 'linkedin':
      return new LinkedInExtractor(config, events);
    case 'youtube':
      return new YouTubeExtractor(config, events);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Get list of available extractors
 */
export function getAvailablePlatforms(): Platform[] {
  return ['meta', 'tiktok', 'google', 'linkedin', 'youtube'];
}
