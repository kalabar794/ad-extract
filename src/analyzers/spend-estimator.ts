/**
 * Spend Estimation Analyzer
 *
 * Estimates competitor ad spend based on:
 * - Impression/reach data (when available from APIs)
 * - Ad volume and duration
 * - Industry CPM benchmarks
 * - Platform-specific pricing models
 */

import { Ad, Platform } from '../types/ad';
import { createLogger } from '../utils/logger';

const logger = createLogger('spend-estimator');

// ============================================================================
// TYPES
// ============================================================================

export interface SpendEstimate {
  daily: {
    low: number;
    mid: number;
    high: number;
  };
  monthly: {
    low: number;
    mid: number;
    high: number;
  };
  total: {
    low: number;
    mid: number;
    high: number;
  };
  confidence: 'low' | 'medium' | 'high';
  methodology: string;
  breakdown: PlatformSpendBreakdown[];
}

export interface PlatformSpendBreakdown {
  platform: Platform;
  adCount: number;
  avgDaysActive: number;
  estimatedImpressions: {
    low: number;
    mid: number;
    high: number;
  };
  estimatedSpend: {
    low: number;
    mid: number;
    high: number;
  };
  cpmUsed: number;
}

export interface AdWithMetrics extends Ad {
  impressions?: number;
  reach?: number;
  spend?: {
    lower_bound?: number;
    upper_bound?: number;
  };
}

// ============================================================================
// CPM BENCHMARKS BY PLATFORM AND INDUSTRY
// ============================================================================

/**
 * CPM (Cost Per Mille) benchmarks in USD
 * Sources: Industry reports, WordStream, Revealbot, Databox
 * Updated: 2025
 */
export const CPM_BENCHMARKS: Record<Platform, {
  average: number;
  low: number;
  high: number;
  byIndustry: Record<string, number>;
}> = {
  meta: {
    average: 11.54,
    low: 5.00,
    high: 25.00,
    byIndustry: {
      'finance': 18.50,
      'insurance': 17.80,
      'legal': 16.75,
      'healthcare': 14.20,
      'b2b': 13.50,
      'ecommerce': 10.20,
      'retail': 9.80,
      'technology': 12.50,
      'education': 8.50,
      'real_estate': 15.00,
      'automotive': 11.00,
      'travel': 7.50,
      'entertainment': 6.80,
      'fitness': 9.20,
      'food': 8.00,
      'dental': 14.50,      // Specific for your use case
      'medical': 15.80,
      'saas': 13.20,
      'agency': 12.00,
    }
  },
  tiktok: {
    average: 10.00,
    low: 4.00,
    high: 20.00,
    byIndustry: {
      'finance': 15.00,
      'ecommerce': 8.50,
      'retail': 7.80,
      'entertainment': 5.50,
      'fitness': 7.20,
      'beauty': 9.00,
      'fashion': 8.80,
      'food': 6.50,
      'technology': 11.00,
      'gaming': 6.00,
    }
  },
  google: {
    average: 3.12,  // Display network
    low: 1.00,
    high: 8.00,
    byIndustry: {
      'finance': 5.50,
      'insurance': 5.20,
      'legal': 4.80,
      'healthcare': 3.80,
      'b2b': 3.50,
      'ecommerce': 2.50,
      'retail': 2.20,
      'technology': 3.20,
      'real_estate': 4.00,
    }
  },
  linkedin: {
    average: 33.80,  // LinkedIn is significantly more expensive
    low: 15.00,
    high: 65.00,
    byIndustry: {
      'b2b': 35.00,
      'technology': 38.00,
      'saas': 40.00,
      'finance': 45.00,
      'consulting': 32.00,
      'recruiting': 28.00,
      'education': 25.00,
    }
  },
  youtube: {
    average: 9.68,  // YouTube video ads CPM
    low: 4.00,
    high: 20.00,
    byIndustry: {
      'finance': 15.00,
      'insurance': 14.50,
      'legal': 13.80,
      'healthcare': 12.50,
      'b2b': 11.00,
      'ecommerce': 8.50,
      'retail': 7.80,
      'technology': 10.50,
      'education': 7.00,
      'real_estate': 12.00,
      'automotive': 11.50,
      'travel': 8.00,
      'entertainment': 6.50,
      'fitness': 8.80,
      'food': 7.20,
      'dental': 13.00,
      'medical': 14.20,
      'saas': 11.50,
      'gaming': 5.80,
    }
  }
};

/**
 * Estimated daily impressions per ad based on platform
 * Used when actual impression data is not available
 */
export const DAILY_IMPRESSIONS_ESTIMATE: Record<Platform, {
  low: number;
  average: number;
  high: number;
}> = {
  meta: {
    low: 1000,
    average: 5000,
    high: 25000,
  },
  tiktok: {
    low: 2000,
    average: 10000,
    high: 50000,
  },
  google: {
    low: 500,
    average: 3000,
    high: 15000,
  },
  linkedin: {
    low: 200,
    average: 1000,
    high: 5000,
  },
  youtube: {
    low: 1500,
    average: 8000,
    high: 40000,
  }
};

// ============================================================================
// SPEND ESTIMATOR CLASS
// ============================================================================

export class SpendEstimator {
  private industry?: string;

  constructor(industry?: string) {
    this.industry = industry?.toLowerCase();
  }

  /**
   * Estimate spend for a collection of ads
   */
  estimate(ads: AdWithMetrics[]): SpendEstimate {
    if (ads.length === 0) {
      return this.emptyEstimate();
    }

    // Check if we have actual spend/impression data
    const hasActualData = ads.some(ad => ad.impressions || ad.spend);

    if (hasActualData) {
      return this.estimateFromActualData(ads);
    }

    return this.estimateFromHeuristics(ads);
  }

  /**
   * Estimate using actual impression/spend data (from APIs)
   */
  private estimateFromActualData(ads: AdWithMetrics[]): SpendEstimate {
    const breakdown: PlatformSpendBreakdown[] = [];
    let totalLow = 0;
    let totalMid = 0;
    let totalHigh = 0;

    // Group by platform
    const byPlatform = this.groupByPlatform(ads);

    for (const [platform, platformAds] of Object.entries(byPlatform)) {
      const p = platform as Platform;
      const cpm = this.getCPM(p);

      let platformSpendLow = 0;
      let platformSpendMid = 0;
      let platformSpendHigh = 0;
      let platformImpressionsLow = 0;
      let platformImpressionsMid = 0;
      let platformImpressionsHigh = 0;

      for (const ad of platformAds) {
        if (ad.spend) {
          // Use actual spend data
          platformSpendLow += ad.spend.lower_bound || 0;
          platformSpendHigh += ad.spend.upper_bound || ad.spend.lower_bound || 0;
          platformSpendMid += (platformSpendLow + platformSpendHigh) / 2;
        } else if (ad.impressions) {
          // Calculate from impressions
          const spend = (ad.impressions / 1000) * cpm;
          platformSpendLow += spend * 0.7;
          platformSpendMid += spend;
          platformSpendHigh += spend * 1.5;
          platformImpressionsLow += ad.impressions * 0.8;
          platformImpressionsMid += ad.impressions;
          platformImpressionsHigh += ad.impressions * 1.2;
        } else if (ad.reach) {
          // Estimate impressions from reach (frequency ~2-4x)
          const estimatedImpressions = ad.reach * 3;
          const spend = (estimatedImpressions / 1000) * cpm;
          platformSpendLow += spend * 0.5;
          platformSpendMid += spend;
          platformSpendHigh += spend * 2;
          platformImpressionsLow += estimatedImpressions * 0.5;
          platformImpressionsMid += estimatedImpressions;
          platformImpressionsHigh += estimatedImpressions * 1.5;
        }
      }

      const avgDaysActive = this.calculateAvgDaysActive(platformAds);

      breakdown.push({
        platform: p,
        adCount: platformAds.length,
        avgDaysActive,
        estimatedImpressions: {
          low: Math.round(platformImpressionsLow),
          mid: Math.round(platformImpressionsMid),
          high: Math.round(platformImpressionsHigh),
        },
        estimatedSpend: {
          low: Math.round(platformSpendLow),
          mid: Math.round(platformSpendMid),
          high: Math.round(platformSpendHigh),
        },
        cpmUsed: cpm,
      });

      totalLow += platformSpendLow;
      totalMid += platformSpendMid;
      totalHigh += platformSpendHigh;
    }

    // Calculate daily/monthly from total and duration
    const avgDays = this.calculateAvgDaysActive(ads);
    const dailyLow = avgDays > 0 ? totalLow / avgDays : totalLow;
    const dailyMid = avgDays > 0 ? totalMid / avgDays : totalMid;
    const dailyHigh = avgDays > 0 ? totalHigh / avgDays : totalHigh;

    return {
      daily: {
        low: Math.round(dailyLow),
        mid: Math.round(dailyMid),
        high: Math.round(dailyHigh),
      },
      monthly: {
        low: Math.round(dailyLow * 30),
        mid: Math.round(dailyMid * 30),
        high: Math.round(dailyHigh * 30),
      },
      total: {
        low: Math.round(totalLow),
        mid: Math.round(totalMid),
        high: Math.round(totalHigh),
      },
      confidence: 'high',
      methodology: 'Based on actual impression/spend data from platform APIs',
      breakdown,
    };
  }

  /**
   * Estimate using heuristics when no actual data available
   */
  private estimateFromHeuristics(ads: Ad[]): SpendEstimate {
    const breakdown: PlatformSpendBreakdown[] = [];
    let totalLow = 0;
    let totalMid = 0;
    let totalHigh = 0;

    // Group by platform
    const byPlatform = this.groupByPlatform(ads);

    for (const [platform, platformAds] of Object.entries(byPlatform)) {
      const p = platform as Platform;
      const cpm = this.getCPM(p);
      const dailyImpressions = DAILY_IMPRESSIONS_ESTIMATE[p];
      const avgDaysActive = this.calculateAvgDaysActive(platformAds);

      // Calculate total impressions
      const totalImpressionsLow = platformAds.length * dailyImpressions.low * avgDaysActive;
      const totalImpressionsMid = platformAds.length * dailyImpressions.average * avgDaysActive;
      const totalImpressionsHigh = platformAds.length * dailyImpressions.high * avgDaysActive;

      // Calculate spend from impressions
      const spendLow = (totalImpressionsLow / 1000) * cpm * 0.7;  // Lower CPM
      const spendMid = (totalImpressionsMid / 1000) * cpm;
      const spendHigh = (totalImpressionsHigh / 1000) * cpm * 1.3;  // Higher CPM

      breakdown.push({
        platform: p,
        adCount: platformAds.length,
        avgDaysActive,
        estimatedImpressions: {
          low: Math.round(totalImpressionsLow),
          mid: Math.round(totalImpressionsMid),
          high: Math.round(totalImpressionsHigh),
        },
        estimatedSpend: {
          low: Math.round(spendLow),
          mid: Math.round(spendMid),
          high: Math.round(spendHigh),
        },
        cpmUsed: cpm,
      });

      totalLow += spendLow;
      totalMid += spendMid;
      totalHigh += spendHigh;
    }

    // Calculate daily estimates
    const totalDays = Math.max(1, this.calculateAvgDaysActive(ads));
    const dailyLow = totalLow / totalDays;
    const dailyMid = totalMid / totalDays;
    const dailyHigh = totalHigh / totalDays;

    return {
      daily: {
        low: Math.round(dailyLow),
        mid: Math.round(dailyMid),
        high: Math.round(dailyHigh),
      },
      monthly: {
        low: Math.round(dailyLow * 30),
        mid: Math.round(dailyMid * 30),
        high: Math.round(dailyHigh * 30),
      },
      total: {
        low: Math.round(totalLow),
        mid: Math.round(totalMid),
        high: Math.round(totalHigh),
      },
      confidence: 'low',
      methodology: 'Estimated from ad volume, duration, and industry CPM benchmarks. Actual spend may vary significantly.',
      breakdown,
    };
  }

  /**
   * Get CPM for a platform, considering industry if set
   */
  private getCPM(platform: Platform): number {
    const benchmarks = CPM_BENCHMARKS[platform];

    if (this.industry && benchmarks.byIndustry[this.industry]) {
      return benchmarks.byIndustry[this.industry];
    }

    return benchmarks.average;
  }

  /**
   * Calculate average days active for a set of ads
   */
  private calculateAvgDaysActive(ads: Ad[]): number {
    const now = new Date();
    let totalDays = 0;
    let countWithDates = 0;

    for (const ad of ads) {
      if (ad.startDate) {
        const start = new Date(ad.startDate);
        const end = ad.endDate ? new Date(ad.endDate) : now;
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        totalDays += days;
        countWithDates++;
      }
    }

    // Default to 30 days if no date information
    return countWithDates > 0 ? Math.round(totalDays / countWithDates) : 30;
  }

  /**
   * Group ads by platform
   */
  private groupByPlatform(ads: Ad[]): Record<string, Ad[]> {
    const groups: Record<string, Ad[]> = {};

    for (const ad of ads) {
      if (!groups[ad.platform]) {
        groups[ad.platform] = [];
      }
      groups[ad.platform].push(ad);
    }

    return groups;
  }

  /**
   * Return empty estimate
   */
  private emptyEstimate(): SpendEstimate {
    return {
      daily: { low: 0, mid: 0, high: 0 },
      monthly: { low: 0, mid: 0, high: 0 },
      total: { low: 0, mid: 0, high: 0 },
      confidence: 'low',
      methodology: 'No ads to analyze',
      breakdown: [],
    };
  }
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format spend as currency string
 */
export function formatSpend(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

/**
 * Format spend range
 */
export function formatSpendRange(low: number, high: number): string {
  return `${formatSpend(low)} - ${formatSpend(high)}`;
}

/**
 * Get spend summary text
 */
export function getSpendSummary(estimate: SpendEstimate): string {
  const monthly = formatSpendRange(estimate.monthly.low, estimate.monthly.high);
  return `Estimated monthly spend: ${monthly} (${estimate.confidence} confidence)`;
}

// ============================================================================
// QUICK ESTIMATION FUNCTION
// ============================================================================

/**
 * Quick spend estimation without creating instance
 */
export function estimateSpend(ads: AdWithMetrics[], industry?: string): SpendEstimate {
  const estimator = new SpendEstimator(industry);
  return estimator.estimate(ads);
}
