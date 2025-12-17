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
      expect(result.wordFrequency.length).toBeGreaterThan(0);

      // 'amazing' appears 3 times
      const amazingEntry = result.wordFrequency.find(w => w.word === 'amazing');
      expect(amazingEntry).toBeDefined();
      expect(amazingEntry?.count).toBe(3);
    });

    it('should calculate average word count', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'One two three four five' }), // 5 words
        createMockAd({ primaryText: 'One two three' }), // 3 words
        createMockAd({ primaryText: 'One two three four five six seven' }), // 7 words
      ];

      const result = analyzer.analyze(ads);

      expect(result.averageWordCount).toBe(5); // (5 + 3 + 7) / 3 = 5
    });

    it('should extract bigrams (2-word phrases)', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'free trial available now free trial' }),
        createMockAd({ primaryText: 'start your free trial today' }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.topBigrams).toBeDefined();

      // 'free trial' should appear multiple times
      const freeTrialBigram = result.topBigrams.find(b =>
        b.phrase.toLowerCase().includes('free trial')
      );
      expect(freeTrialBigram).toBeDefined();
    });

    it('should extract trigrams (3-word phrases)', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'get started today and get started today' }),
        createMockAd({ primaryText: 'you can get started today easily' }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.topTrigrams).toBeDefined();
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
    });

    it('should identify top CTAs', () => {
      const ads: Ad[] = [
        createMockAd({ cta: 'Learn More' }),
        createMockAd({ cta: 'Learn More' }),
        createMockAd({ cta: 'Sign Up' }),
        createMockAd({ cta: 'Get Started' }),
        createMockAd({ cta: 'Learn More' }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.topCTAs).toBeDefined();
      expect(result.topCTAs.length).toBeGreaterThan(0);

      // 'Learn More' should be top CTA
      expect(result.topCTAs[0].cta).toBe('Learn More');
      expect(result.topCTAs[0].count).toBe(3);
    });

    it('should extract hashtags', () => {
      const ads: Ad[] = [
        createMockAd({ hashtags: ['#marketing', '#business', '#growth'] }),
        createMockAd({ hashtags: ['#marketing', '#sales'] }),
        createMockAd({ hashtags: ['#marketing'] }),
      ];

      const result = analyzer.analyze(ads);

      expect(result.topHashtags).toBeDefined();

      // #marketing appears 3 times
      const marketingHashtag = result.topHashtags.find(h => h.hashtag === '#marketing');
      expect(marketingHashtag).toBeDefined();
      expect(marketingHashtag?.count).toBe(3);
    });

    it('should handle empty ads array', () => {
      const result = analyzer.analyze([]);

      expect(result).toBeDefined();
      expect(result.wordFrequency).toEqual([]);
      expect(result.averageWordCount).toBe(0);
    });

    it('should filter out common stop words', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'the quick brown fox jumps over the lazy dog' }),
      ];

      const result = analyzer.analyze(ads);

      // Stop words like 'the', 'over' should be filtered
      const theWord = result.wordFrequency.find(w => w.word === 'the');
      expect(theWord).toBeUndefined();
    });
  });
});
