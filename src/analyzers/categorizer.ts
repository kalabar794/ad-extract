import { Ad, AdCategory } from '../types/ad';
import { CategorizationResult } from '../types/analysis';
import { categoryRules, CategoryRule } from '../config/categories';
import { createLogger } from '../utils/logger';

const logger = createLogger('categorizer');

export class AdCategorizer {
  private rules: CategoryRule[];

  constructor(customRules?: CategoryRule[]) {
    this.rules = customRules || categoryRules;
  }

  /**
   * Categorize a single ad
   */
  categorize(ad: Ad): CategorizationResult {
    const scores: Record<AdCategory, number> = {
      [AdCategory.TESTIMONIAL]: 0,
      [AdCategory.OFFER_PROMO]: 0,
      [AdCategory.EDUCATIONAL]: 0,
      [AdCategory.PRODUCT_FEATURE]: 0,
      [AdCategory.BRAND_AWARENESS]: 0,
      [AdCategory.EVENT]: 0,
      [AdCategory.HIRING]: 0,
      [AdCategory.URGENCY_SCARCITY]: 0,
      [AdCategory.PROBLEM_SOLUTION]: 0,
      [AdCategory.COMPARISON]: 0,
      [AdCategory.OTHER]: 0
    };

    const signals: string[] = [];
    const text = this.getFullText(ad);

    // Score each category
    for (const rule of this.rules) {
      const { score, matchedSignals } = this.scoreCategory(text, rule);
      scores[rule.category] = score * rule.weight;
      signals.push(...matchedSignals.map(s => `[${rule.category}] ${s}`));
    }

    // Find the highest scoring category
    let maxScore = 0;
    let category = AdCategory.OTHER;

    for (const [cat, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        category = cat as AdCategory;
      }
    }

    // Calculate confidence (normalized score)
    const totalPossibleScore = this.calculateMaxPossibleScore();
    const confidence = Math.min(maxScore / totalPossibleScore, 1);

    return {
      category,
      confidence,
      signals,
      scores
    };
  }

  /**
   * Categorize multiple ads
   */
  categorizeAll(ads: Ad[]): Map<string, CategorizationResult> {
    const results = new Map<string, CategorizationResult>();

    for (const ad of ads) {
      results.set(ad.id, this.categorize(ad));
    }

    return results;
  }

  /**
   * Get full searchable text from ad
   */
  private getFullText(ad: Ad): string {
    const parts = [
      ad.primaryText,
      ad.headline,
      ad.description,
      ad.cta,
      ...(ad.hashtags || [])
    ].filter(Boolean);

    return parts.join(' ').toLowerCase();
  }

  /**
   * Score a category based on pattern and keyword matches
   */
  private scoreCategory(
    text: string,
    rule: CategoryRule
  ): { score: number; matchedSignals: string[] } {
    let score = 0;
    const matchedSignals: string[] = [];

    // Check patterns (higher weight)
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        score += 3;
        matchedSignals.push(`Pattern: ${pattern.toString()}`);
      }
    }

    // Check keywords
    for (const keyword of rule.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 1;
        matchedSignals.push(`Keyword: ${keyword}`);
      }
    }

    return { score, matchedSignals };
  }

  /**
   * Calculate maximum possible score for normalization
   */
  private calculateMaxPossibleScore(): number {
    // Assume a well-matching ad hits 5 patterns (15 points) and 10 keywords (10 points)
    // with average weight of 1.2
    return 30;
  }

  /**
   * Get category distribution from a set of ads
   */
  getCategoryDistribution(ads: Ad[]): Record<AdCategory, number> {
    const distribution: Record<AdCategory, number> = {
      [AdCategory.TESTIMONIAL]: 0,
      [AdCategory.OFFER_PROMO]: 0,
      [AdCategory.EDUCATIONAL]: 0,
      [AdCategory.PRODUCT_FEATURE]: 0,
      [AdCategory.BRAND_AWARENESS]: 0,
      [AdCategory.EVENT]: 0,
      [AdCategory.HIRING]: 0,
      [AdCategory.URGENCY_SCARCITY]: 0,
      [AdCategory.PROBLEM_SOLUTION]: 0,
      [AdCategory.COMPARISON]: 0,
      [AdCategory.OTHER]: 0
    };

    for (const ad of ads) {
      const result = this.categorize(ad);
      distribution[result.category]++;
    }

    return distribution;
  }

  /**
   * Update ad objects with categorization results
   */
  categorizeAndUpdate(ads: Ad[]): Ad[] {
    return ads.map(ad => {
      const result = this.categorize(ad);
      return {
        ...ad,
        category: result.category,
        categoryConfidence: result.confidence
      };
    });
  }
}

/**
 * Quick categorization without creating instance
 */
export function categorizeAd(ad: Ad): CategorizationResult {
  const categorizer = new AdCategorizer();
  return categorizer.categorize(ad);
}

/**
 * Quick categorization for multiple ads
 */
export function categorizeAds(ads: Ad[]): Ad[] {
  const categorizer = new AdCategorizer();
  return categorizer.categorizeAndUpdate(ads);
}
