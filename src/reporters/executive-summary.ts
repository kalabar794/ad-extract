import { Ad, AdCategory } from '../types/ad';
import { CompetitorAnalysis, ExecutiveSummary, StrategicOpportunity } from '../types/analysis';
import { createLogger } from '../utils/logger';

const logger = createLogger('executive-summary');

export class ExecutiveSummaryGenerator {
  /**
   * Generate executive summary from analysis
   */
  generate(
    competitor: string,
    ads: Ad[],
    analysis: CompetitorAnalysis
  ): ExecutiveSummary {
    logger.info(`Generating executive summary for ${competitor}`);

    const keyFindings = this.generateKeyFindings(analysis);
    const advertisingFootprint = this.generateFootprint(analysis);
    const messagingStrategy = this.generateMessagingStrategy(analysis);
    const creativeMix = analysis.categoryBreakdown;
    const strategicOpportunities = this.identifyOpportunities(analysis);
    const recommendedActions = this.generateRecommendations(analysis, strategicOpportunities);

    return {
      competitor,
      analysisDate: analysis.analysisDate,
      keyFindings,
      advertisingFootprint,
      messagingStrategy,
      creativeMix,
      strategicOpportunities,
      recommendedActions
    };
  }

  /**
   * Generate key findings summary
   */
  private generateKeyFindings(analysis: CompetitorAnalysis): ExecutiveSummary['keyFindings'] {
    // Find dominant category
    const sortedCategories = Object.entries(analysis.categoryBreakdown)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    const topCategory = sortedCategories[0]?.[0] || 'other';
    const topCategoryPct = sortedCategories[0]
      ? Math.round((sortedCategories[0][1] / analysis.totalAds) * 100)
      : 0;

    // Find primary theme
    const primaryTheme = analysis.messagingThemes[0] || 'General advertising';

    // Generate summary
    const summary = this.generateSummaryText(analysis, topCategory, topCategoryPct);

    // Identify key opportunity
    const keyOpportunity = this.identifyKeyOpportunity(analysis, sortedCategories);

    return {
      summary,
      primaryTheme,
      keyOpportunity
    };
  }

  /**
   * Generate summary text
   */
  private generateSummaryText(
    analysis: CompetitorAnalysis,
    topCategory: string,
    topCategoryPct: number
  ): string {
    const platformList = Object.keys(analysis.platformBreakdown).join(', ');
    const topCTA = analysis.ctaPatterns[0]?.cta || 'Learn More';

    return `${analysis.competitor} is running ${analysis.totalAds} ads across ${platformList}. ` +
      `Their dominant strategy is ${this.formatCategoryName(topCategory)} content (${topCategoryPct}% of ads) ` +
      `with "${topCTA}" as the primary call-to-action. ` +
      `Key messaging themes include ${analysis.messagingThemes.slice(0, 3).join(', ').toLowerCase() || 'general product promotion'}.`;
  }

  /**
   * Identify key opportunity
   */
  private identifyKeyOpportunity(
    analysis: CompetitorAnalysis,
    sortedCategories: [string, number][]
  ): string {
    // Find underutilized categories
    const usedCategories = new Set(sortedCategories.filter(([_, c]) => c > 0).map(([cat]) => cat));
    const allCategories = Object.values(AdCategory);
    const unusedCategories = allCategories.filter(cat => !usedCategories.has(cat));

    if (unusedCategories.includes(AdCategory.TESTIMONIAL) && !usedCategories.has(AdCategory.TESTIMONIAL)) {
      return 'Competitor not using social proof/testimonials - opportunity to differentiate with customer stories';
    }

    if (unusedCategories.includes(AdCategory.EDUCATIONAL) && !usedCategories.has(AdCategory.EDUCATIONAL)) {
      return 'No educational content detected - opportunity to establish thought leadership';
    }

    // Check CTA diversity
    if (analysis.ctaPatterns.length < 3) {
      return 'Limited CTA variety - test multiple call-to-action approaches';
    }

    // Default opportunity
    return 'Test messaging angles not currently used by competitor';
  }

  /**
   * Generate advertising footprint
   */
  private generateFootprint(analysis: CompetitorAnalysis): ExecutiveSummary['advertisingFootprint'] {
    const platforms: Record<string, { count: number; focus: string }> = {};

    for (const [platform, count] of Object.entries(analysis.platformBreakdown)) {
      const focus = this.determinePlatformFocus(platform, count, analysis);
      platforms[platform] = { count, focus };
    }

    return {
      totalAds: analysis.totalAds,
      platforms
    };
  }

  /**
   * Determine focus for a platform
   */
  private determinePlatformFocus(
    platform: string,
    count: number,
    analysis: CompetitorAnalysis
  ): string {
    const pct = Math.round((count / analysis.totalAds) * 100);

    if (pct > 50) return 'Primary channel';
    if (pct > 25) return 'Secondary channel';
    if (pct > 10) return 'Supporting channel';
    return 'Test/minor channel';
  }

  /**
   * Generate messaging strategy insights
   */
  private generateMessagingStrategy(analysis: CompetitorAnalysis): ExecutiveSummary['messagingStrategy'] {
    const topKeywords = analysis.copyAnalysis.topKeywords.slice(0, 10);
    const primaryAngles = analysis.topPerformingAngles.slice(0, 5);

    // Find dominant CTA
    const topCTA = analysis.ctaPatterns[0] || { cta: 'Learn More', percentage: 0 };

    return {
      topKeywords,
      primaryAngles,
      dominantCTA: {
        text: topCTA.cta,
        percentage: topCTA.percentage
      }
    };
  }

  /**
   * Identify strategic opportunities
   */
  private identifyOpportunities(analysis: CompetitorAnalysis): StrategicOpportunity[] {
    const opportunities: StrategicOpportunity[] = [];

    // Check for gaps in ad categories
    const categoryGaps = this.findCategoryGaps(analysis);
    opportunities.push(...categoryGaps);

    // Check for messaging opportunities
    const messagingOpps = this.findMessagingOpportunities(analysis);
    opportunities.push(...messagingOpps);

    // Check for platform opportunities
    const platformOpps = this.findPlatformOpportunities(analysis);
    opportunities.push(...platformOpps);

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return opportunities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Find gaps in ad categories
   */
  private findCategoryGaps(analysis: CompetitorAnalysis): StrategicOpportunity[] {
    const gaps: StrategicOpportunity[] = [];
    const total = analysis.totalAds;

    // Check for missing/low testimonials
    const testimonialPct = (analysis.categoryBreakdown[AdCategory.TESTIMONIAL] || 0) / total;
    if (testimonialPct < 0.1) {
      gaps.push({
        type: 'gap',
        description: 'Low social proof usage',
        opportunity: 'Competitor uses minimal testimonials/reviews - strong opportunity to build trust with customer stories',
        priority: 'high'
      });
    }

    // Check for missing educational content
    const educationalPct = (analysis.categoryBreakdown[AdCategory.EDUCATIONAL] || 0) / total;
    if (educationalPct < 0.1) {
      gaps.push({
        type: 'gap',
        description: 'No educational content strategy',
        opportunity: 'Position as thought leader with how-to and educational content',
        priority: 'medium'
      });
    }

    return gaps;
  }

  /**
   * Find messaging opportunities
   */
  private findMessagingOpportunities(analysis: CompetitorAnalysis): StrategicOpportunity[] {
    const opportunities: StrategicOpportunity[] = [];

    // Check readability
    if (analysis.copyAnalysis.readabilityScore < 50) {
      opportunities.push({
        type: 'differentiation',
        description: 'Complex ad copy detected',
        opportunity: 'Use simpler, more readable copy to stand out',
        priority: 'medium'
      });
    }

    // Check emoji usage
    if (analysis.copyAnalysis.emojiUsage.length === 0) {
      opportunities.push({
        type: 'differentiation',
        description: 'No emoji usage',
        opportunity: 'Test emoji-enhanced copy for higher engagement',
        priority: 'low'
      });
    }

    // Check CTA diversity
    if (analysis.ctaPatterns.length < 3) {
      opportunities.push({
        type: 'trend',
        description: 'Limited CTA variety',
        opportunity: 'Test diverse CTAs - competitor relies on single approach',
        priority: 'medium'
      });
    }

    return opportunities;
  }

  /**
   * Find platform opportunities
   */
  private findPlatformOpportunities(analysis: CompetitorAnalysis): StrategicOpportunity[] {
    const opportunities: StrategicOpportunity[] = [];
    const platforms = Object.keys(analysis.platformBreakdown);

    // Check for single-platform focus
    if (platforms.length === 1) {
      opportunities.push({
        type: 'gap',
        description: 'Single platform focus',
        opportunity: 'Competitor only advertising on one platform - expand to capture audience elsewhere',
        priority: 'high'
      });
    }

    return opportunities;
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendations(
    analysis: CompetitorAnalysis,
    opportunities: StrategicOpportunity[]
  ): string[] {
    const recommendations: string[] = [];

    // Add recommendations based on opportunities
    for (const opp of opportunities.filter(o => o.priority === 'high').slice(0, 3)) {
      recommendations.push(opp.opportunity);
    }

    // Add general competitive recommendations
    const topKeywords = analysis.copyAnalysis.topKeywords.slice(0, 3);
    if (topKeywords.length > 0) {
      recommendations.push(`Target competitor keywords: ${topKeywords.join(', ')}`);
    }

    // Add CTA recommendation
    const topCTA = analysis.ctaPatterns[0];
    if (topCTA && topCTA.percentage > 50) {
      recommendations.push(`Test alternative to "${topCTA.cta}" - competitor over-reliant on this CTA`);
    }

    // Ensure we have at least 3 recommendations
    if (recommendations.length < 3) {
      recommendations.push('Monitor competitor ad frequency for campaign timing insights');
      recommendations.push('A/B test messaging themes identified in competitor analysis');
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Format category name
   */
  private formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

/**
 * Quick summary generation
 */
export function generateExecutiveSummary(
  competitor: string,
  ads: Ad[],
  analysis: CompetitorAnalysis
): ExecutiveSummary {
  const generator = new ExecutiveSummaryGenerator();
  return generator.generate(competitor, ads, analysis);
}
