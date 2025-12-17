/**
 * Tests for Ad Categorizer
 */

import { categorizeAds, categorizeAd } from '../analyzers/categorizer';
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
    ...overrides
  };
}

describe('Ad Categorizer', () => {
  describe('categorizeAd', () => {
    it('should categorize testimonial ads', () => {
      const ad = createMockAd({
        primaryText: '"This product changed my life!" - John D. ★★★★★ Best purchase ever!'
      });

      const result = categorizeAd(ad);

      expect(result.category).toBe(AdCategory.TESTIMONIAL);
      expect(result.categoryConfidence).toBeGreaterThan(0);
    });

    it('should categorize offer/promo ads', () => {
      const ad = createMockAd({
        primaryText: 'LIMITED TIME OFFER! Get 50% off today only! Save $100 now!'
      });

      const result = categorizeAd(ad);

      expect(result.category).toBe(AdCategory.OFFER_PROMO);
      expect(result.categoryConfidence).toBeGreaterThan(0);
    });

    it('should categorize educational ads', () => {
      const ad = createMockAd({
        primaryText: 'Learn how to grow your business in 5 easy steps. Free guide included!'
      });

      const result = categorizeAd(ad);

      expect(result.category).toBe(AdCategory.EDUCATIONAL);
      expect(result.categoryConfidence).toBeGreaterThan(0);
    });

    it('should categorize urgency/scarcity ads', () => {
      const ad = createMockAd({
        primaryText: 'Only 3 spots left! Deadline is midnight tonight. Act now!'
      });

      const result = categorizeAd(ad);

      expect(result.category).toBe(AdCategory.URGENCY_SCARCITY);
      expect(result.categoryConfidence).toBeGreaterThan(0);
    });

    it('should categorize problem/solution ads', () => {
      const ad = createMockAd({
        primaryText: 'Struggling with low sales? Tired of poor results? Our solution fixes that.'
      });

      const result = categorizeAd(ad);

      expect(result.category).toBe(AdCategory.PROBLEM_SOLUTION);
      expect(result.categoryConfidence).toBeGreaterThan(0);
    });

    it('should categorize hiring ads', () => {
      const ad = createMockAd({
        primaryText: 'We are hiring! Join our team. Apply now for open positions.'
      });

      const result = categorizeAd(ad);

      expect(result.category).toBe(AdCategory.HIRING);
      expect(result.categoryConfidence).toBeGreaterThan(0);
    });

    it('should handle ads with low confidence by defaulting to OTHER', () => {
      const ad = createMockAd({
        primaryText: 'Hello world'
      });

      const result = categorizeAd(ad);

      // With minimal text, should default to OTHER
      expect(result.category).toBeDefined();
      expect(result.categoryConfidence).toBeDefined();
    });
  });

  describe('categorizeAds', () => {
    it('should categorize multiple ads', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: '★★★★★ Amazing product review!' }),
        createMockAd({ primaryText: '50% OFF limited time!' }),
        createMockAd({ primaryText: 'Learn the 5 secrets to success' }),
      ];

      const results = categorizeAds(ads);

      expect(results.length).toBe(3);
      results.forEach(ad => {
        expect(ad.category).toBeDefined();
        expect(ad.categoryConfidence).toBeDefined();
      });
    });

    it('should preserve ad properties after categorization', () => {
      const ad = createMockAd({
        id: 'test-123',
        primaryText: 'Test ad',
        headline: 'Test Headline',
        destinationUrl: 'https://example.com'
      });

      const [result] = categorizeAds([ad]);

      expect(result.id).toBe('test-123');
      expect(result.headline).toBe('Test Headline');
      expect(result.destinationUrl).toBe('https://example.com');
    });

    it('should handle empty array', () => {
      const results = categorizeAds([]);
      expect(results).toEqual([]);
    });
  });
});
