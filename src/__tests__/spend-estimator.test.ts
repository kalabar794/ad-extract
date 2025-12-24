/**
 * Tests for Spend Estimator
 */

import { SpendEstimator, estimateSpend, formatSpend, formatSpendRange, CPM_BENCHMARKS } from '../analyzers/spend-estimator';
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

describe('Spend Estimator', () => {
  let estimator: SpendEstimator;

  beforeEach(() => {
    estimator = new SpendEstimator();
  });

  describe('estimate', () => {
    it('should return empty estimate for empty ads array', () => {
      const result = estimator.estimate([]);

      expect(result.total.low).toBe(0);
      expect(result.total.mid).toBe(0);
      expect(result.total.high).toBe(0);
      expect(result.confidence).toBe('low');
    });

    it('should estimate spend using heuristics when no impression data', () => {
      const ads = [
        createMockAd({ startDate: '2025-01-01', platform: 'meta' }),
        createMockAd({ startDate: '2025-01-01', platform: 'meta' }),
        createMockAd({ startDate: '2025-01-01', platform: 'meta' }),
      ];

      const result = estimator.estimate(ads);

      expect(result.daily.low).toBeGreaterThan(0);
      expect(result.daily.mid).toBeGreaterThan(result.daily.low);
      expect(result.daily.high).toBeGreaterThan(result.daily.mid);
      expect(result.confidence).toBe('low');
      expect(result.methodology).toContain('CPM benchmarks');
    });

    it('should estimate spend using actual impression data when available', () => {
      const ads = [
        createMockAd({
          startDate: '2025-01-01',
          platform: 'meta',
          impressions: 100000
        }),
      ];

      const result = estimator.estimate(ads);

      expect(result.confidence).toBe('high');
      expect(result.methodology).toContain('actual');
    });

    it('should estimate from spend data when available', () => {
      const ads = [
        createMockAd({
          startDate: '2025-01-01',
          platform: 'meta',
          spend: { lower_bound: 500, upper_bound: 1000 }
        }),
      ];

      const result = estimator.estimate(ads);

      expect(result.confidence).toBe('high');
      expect(result.total.low).toBeGreaterThanOrEqual(500);
    });

    it('should calculate from reach data when impressions not available', () => {
      const ads = [
        createMockAd({
          startDate: '2025-01-01',
          platform: 'meta',
          reach: 50000,
          impressions: 150000  // reach * ~3 frequency
        }),
      ];

      const result = estimator.estimate(ads);

      // With impressions data, confidence is high
      expect(result.confidence).toBe('high');
      expect(result.total.mid).toBeGreaterThan(0);
    });

    it('should provide platform breakdown', () => {
      const ads = [
        createMockAd({ platform: 'meta', startDate: '2025-01-01' }),
        createMockAd({ platform: 'meta', startDate: '2025-01-01' }),
        createMockAd({ platform: 'linkedin', startDate: '2025-01-01' }),
      ];

      const result = estimator.estimate(ads);

      expect(result.breakdown.length).toBe(2);

      const metaBreakdown = result.breakdown.find(b => b.platform === 'meta');
      const linkedinBreakdown = result.breakdown.find(b => b.platform === 'linkedin');

      expect(metaBreakdown).toBeDefined();
      expect(metaBreakdown?.adCount).toBe(2);
      expect(linkedinBreakdown).toBeDefined();
      expect(linkedinBreakdown?.adCount).toBe(1);
    });

    it('should use higher CPM for LinkedIn', () => {
      // Verify LinkedIn CPM is higher than Meta
      expect(CPM_BENCHMARKS.linkedin.average).toBeGreaterThan(CPM_BENCHMARKS.meta.average);

      // With same impressions, LinkedIn should cost more
      const metaAds = [createMockAd({ platform: 'meta', impressions: 10000 })];
      const linkedinAds = [createMockAd({ platform: 'linkedin', impressions: 10000 })];

      const metaResult = estimator.estimate(metaAds);
      const linkedinResult = estimator.estimate(linkedinAds);

      // With equal impressions, LinkedIn's higher CPM means higher spend
      expect(linkedinResult.total.mid).toBeGreaterThan(metaResult.total.mid);
    });
  });

  describe('industry-specific CPM', () => {
    it('should use industry CPM when specified', () => {
      const dentalEstimator = new SpendEstimator('dental');
      const defaultEstimator = new SpendEstimator();

      const ads = [createMockAd({ platform: 'meta', startDate: '2025-01-01' })];

      const dentalResult = dentalEstimator.estimate(ads);
      const defaultResult = defaultEstimator.estimate(ads);

      // Dental has higher CPM than average
      expect(dentalResult.daily.mid).toBeGreaterThan(defaultResult.daily.mid);
    });

    it('should fall back to average CPM for unknown industry', () => {
      const unknownEstimator = new SpendEstimator('unknown_industry_xyz');
      const defaultEstimator = new SpendEstimator();

      const ads = [createMockAd({ platform: 'meta', startDate: '2025-01-01' })];

      const unknownResult = unknownEstimator.estimate(ads);
      const defaultResult = defaultEstimator.estimate(ads);

      // Should be the same since unknown industry falls back to average
      expect(unknownResult.daily.mid).toBe(defaultResult.daily.mid);
    });
  });

  describe('date calculations', () => {
    it('should calculate days active from start date to now', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const ads = [
        createMockAd({
          platform: 'meta',
          startDate: thirtyDaysAgo.toISOString()
        })
      ];

      const result = estimator.estimate(ads);

      expect(result.breakdown[0].avgDaysActive).toBeGreaterThanOrEqual(29);
      expect(result.breakdown[0].avgDaysActive).toBeLessThanOrEqual(31);
    });

    it('should use end date when provided', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-15');

      const ads = [
        createMockAd({
          platform: 'meta',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      ];

      const result = estimator.estimate(ads);

      expect(result.breakdown[0].avgDaysActive).toBe(14);
    });

    it('should default to 30 days when no date info', () => {
      const ads = [createMockAd({ platform: 'meta' })];

      const result = estimator.estimate(ads);

      expect(result.breakdown[0].avgDaysActive).toBe(30);
    });
  });
});

describe('Formatting utilities', () => {
  describe('formatSpend', () => {
    it('should format small amounts', () => {
      expect(formatSpend(500)).toBe('$500');
    });

    it('should format thousands with K suffix', () => {
      expect(formatSpend(5000)).toBe('$5.0K');
      expect(formatSpend(15500)).toBe('$15.5K');
    });

    it('should format millions with M suffix', () => {
      expect(formatSpend(1500000)).toBe('$1.5M');
    });
  });

  describe('formatSpendRange', () => {
    it('should format a range correctly', () => {
      expect(formatSpendRange(5000, 15000)).toBe('$5.0K - $15.0K');
    });
  });
});

describe('CPM Benchmarks', () => {
  it('should have benchmarks for all platforms', () => {
    expect(CPM_BENCHMARKS.meta).toBeDefined();
    expect(CPM_BENCHMARKS.tiktok).toBeDefined();
    expect(CPM_BENCHMARKS.google).toBeDefined();
    expect(CPM_BENCHMARKS.linkedin).toBeDefined();
    expect(CPM_BENCHMARKS.youtube).toBeDefined();
  });

  it('should have LinkedIn as highest CPM platform', () => {
    expect(CPM_BENCHMARKS.linkedin.average).toBeGreaterThan(CPM_BENCHMARKS.meta.average);
    expect(CPM_BENCHMARKS.linkedin.average).toBeGreaterThan(CPM_BENCHMARKS.tiktok.average);
    expect(CPM_BENCHMARKS.linkedin.average).toBeGreaterThan(CPM_BENCHMARKS.google.average);
    expect(CPM_BENCHMARKS.linkedin.average).toBeGreaterThan(CPM_BENCHMARKS.youtube.average);
  });

  it('should have YouTube CPM between Google and Meta', () => {
    // YouTube video ads are typically more expensive than display but less than social
    expect(CPM_BENCHMARKS.youtube.average).toBeGreaterThan(CPM_BENCHMARKS.google.average);
    expect(CPM_BENCHMARKS.youtube.average).toBeLessThan(CPM_BENCHMARKS.meta.average);
  });
});

describe('estimateSpend helper function', () => {
  it('should work without creating instance', () => {
    const ads = [
      createMockAd({ platform: 'meta', startDate: '2025-01-01' }),
    ];

    const result = estimateSpend(ads, 'dental');

    expect(result).toBeDefined();
    expect(result.daily.mid).toBeGreaterThan(0);
  });
});
