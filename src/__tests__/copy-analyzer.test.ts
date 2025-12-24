/**
 * Tests for Copy Analyzer
 */

import { CopyAnalyzer } from '../analyzers/copy-analyzer';
import { Ad, AdCategory } from '../types/ad';

// Helper to create mock ads
function createMockAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: `ad-${Math.random().toString(36).substr(2, 9)}`,
    competitor: 'Test Company',
    platform: 'meta',
    extractedAt: new Date().toISOString(),
    primaryText: 'Test ad copy',
    hashtags: [],
    category: AdCategory.OTHER,
    ...overrides
  };
}

describe('Copy Analyzer', () => {
  let analyzer: CopyAnalyzer;

  beforeEach(() => {
    analyzer = new CopyAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze word frequency in ads', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'Get amazing results today with our product' }),
        createMockAd({ primaryText: 'Amazing deals on our best product' }),
        createMockAd({ primaryText: 'Our product delivers amazing results' }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.wordFrequency).toBeDefined();
      expect(result.wordFrequency instanceof Map).toBe(true);

      // 'amazing' appears 3 times
      const amazingCount = result.wordFrequency.get('amazing');
      expect(amazingCount).toBe(3);
    });

    it('should calculate average copy length (in characters)', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'Short text' }), // 10 chars
        createMockAd({ primaryText: 'Medium length text here' }), // 23 chars
        createMockAd({ primaryText: 'A' }), // 1 char
      ];

      const result = analyzer.analyze(ads);

      // avgCopyLength is character count, not word count
      expect(result.avgCopyLength).toBeDefined();
      expect(typeof result.avgCopyLength).toBe('number');
      expect(result.avgCopyLength).toBeGreaterThan(0);
    });

    it('should extract common phrases (n-grams)', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'free trial available now free trial' }),
        createMockAd({ primaryText: 'start your free trial today' }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.commonPhrases).toBeDefined();
      expect(Array.isArray(result.commonPhrases)).toBe(true);
    });

    it('should extract top keywords', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'marketing strategy for growth' }),
        createMockAd({ primaryText: 'growth marketing tips' }),
        createMockAd({ primaryText: 'business growth strategies' }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.topKeywords).toBeDefined();
      expect(Array.isArray(result.topKeywords)).toBe(true);
      expect(result.topKeywords).toContain('growth');
    });

    it('should calculate readability scores', () => {
      const ads: Ad[] = [
        createMockAd({
          primaryText: 'Simple words here. Easy to read. Short sentences work best.'
        }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.readabilityScore).toBeDefined();
      expect(typeof result.readabilityScore).toBe('number');
      // Flesch Reading Ease: 0-100 scale
      expect(result.readabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.readabilityScore).toBeLessThanOrEqual(100);
    });

    it('should identify CTA distribution', () => {
      const ads: Ad[] = [
        createMockAd({ cta: 'Learn More' }),
        createMockAd({ cta: 'Learn More' }),
        createMockAd({ cta: 'Sign Up' }),
        createMockAd({ cta: 'Get Started' }),
        createMockAd({ cta: 'Learn More' }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.ctaDistribution).toBeDefined();
      expect(result.ctaDistribution instanceof Map).toBe(true);

      // 'Learn More' should appear 3 times
      expect(result.ctaDistribution.get('Learn More')).toBe(3);
    });

    it('should extract hashtag frequency', () => {
      const ads: Ad[] = [
        createMockAd({ hashtags: ['#marketing', '#business', '#growth'] }),
        createMockAd({ hashtags: ['#marketing', '#sales'] }),
        createMockAd({ hashtags: ['#marketing'] }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.hashtagFrequency).toBeDefined();
      expect(result.hashtagFrequency instanceof Map).toBe(true);

      // #marketing appears 3 times (normalized to lowercase)
      expect(result.hashtagFrequency.get('#marketing')).toBe(3);
    });

    it('should handle empty ads array', () => {
      const result = analyzer.analyze([]);

      expect(result).toBeDefined();
      expect(result.wordFrequency.size).toBe(0);
      expect(result.avgCopyLength).toBe(0);
    });

    it('should filter out common stop words', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'the quick brown fox jumps with the lazy dog' }),
      ];

      const result = analyzer.analyze(ads);

      // Stop words like 'the', 'with' should be filtered
      expect(result.wordFrequency.has('the')).toBe(false);
      expect(result.wordFrequency.has('with')).toBe(false);
      // But content words should be present
      expect(result.wordFrequency.has('quick')).toBe(true);
      expect(result.wordFrequency.has('brown')).toBe(true);
    });

    it('should extract emojis from text', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: '🚀 Launch your business today! 💰 Make money fast! 🎉' }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.emojiUsage).toBeDefined();
      expect(Array.isArray(result.emojiUsage)).toBe(true);
      expect(result.emojiUsage.length).toBeGreaterThan(0);
    });
  });
});
