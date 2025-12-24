export { AdCategorizer, categorizeAd, categorizeAds } from './categorizer';
export { CopyAnalyzer, analyzeCopy } from './copy-analyzer';
export { CampaignAnalyzer, analyzeCampaigns } from './campaign-analyzer';
export type { Campaign, CampaignAnalysis } from './campaign-analyzer';
export { LandingPageAnalyzer, analyzeLandingPage, analyzeLandingPages } from './landing-page';
export {
  SentimentAnalyzer,
  analyzeSentiment,
  analyzeAdsSentiment,
  analyzeCompetitorSentiment,
  EmotionAnalyzer,
  PersuasionAnalyzer,
  ToneAnalyzer,
  FramingAnalyzer,
  TriggerAnalyzer,
  PositioningAnalyzer
} from './sentiment';

import { Ad, AdCategory } from '../types/ad';
import { CompetitorAnalysis, CopyAnalysis } from '../types/analysis';
import { AdCategorizer } from './categorizer';
import { CopyAnalyzer } from './copy-analyzer';
import { createLogger } from '../utils/logger';

const logger = createLogger('analyzer');

/**
 * Comprehensive analysis of competitor ads
 */
export function analyzeCompetitor(
  competitor: string,
  ads: Ad[]
): CompetitorAnalysis {
  logger.info(`Analyzing ${ads.length} ads for ${competitor}`);

  const categorizer = new AdCategorizer();
  const copyAnalyzer = new CopyAnalyzer();

  // Categorize all ads
  const categorizedAds = categorizer.categorizeAndUpdate(ads);
  const categoryDistribution = categorizer.getCategoryDistribution(categorizedAds);

  // Analyze copy
  const copyAnalysis = copyAnalyzer.analyze(ads);

  // Calculate platform breakdown
  const platformBreakdown: Record<string, number> = {};
  for (const ad of ads) {
    if (ad.platforms) {
      for (const platform of ad.platforms) {
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
      }
    } else {
      platformBreakdown[ad.platform] = (platformBreakdown[ad.platform] || 0) + 1;
    }
  }

  // Get date range
  const dates = ads
    .map(ad => ad.startDate)
    .filter(Boolean)
    .map(d => new Date(d!).getTime())
    .filter(d => !isNaN(d));

  const dateRange = dates.length > 0
    ? {
        earliest: new Date(Math.min(...dates)).toISOString(),
        latest: new Date(Math.max(...dates)).toISOString()
      }
    : {};

  // Extract CTA patterns
  const ctaPatterns = Array.from(copyAnalysis.ctaDistribution.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cta, count]) => ({
      cta,
      count,
      percentage: Math.round((count / ads.length) * 100)
    }));

  // Identify messaging themes from top keywords
  const messagingThemes = identifyThemes(copyAnalysis.topKeywords);

  // Identify top performing angles based on category + keywords
  const topAngles = identifyTopAngles(categorizedAds, copyAnalysis);

  return {
    competitor,
    analysisDate: new Date().toISOString(),
    totalAds: ads.length,
    platformBreakdown,
    categoryBreakdown: categoryDistribution,
    copyAnalysis,
    topPerformingAngles: topAngles,
    messagingThemes,
    ctaPatterns,
    dateRange
  };
}

/**
 * Identify themes from keywords
 */
function identifyThemes(keywords: string[]): string[] {
  const themeGroups: Record<string, string[]> = {
    'Value/Price': ['free', 'save', 'discount', 'deal', 'affordable', 'cheap', 'price', 'cost'],
    'Quality/Premium': ['premium', 'quality', 'best', 'top', 'luxury', 'exclusive', 'professional'],
    'Trust/Social Proof': ['trusted', 'review', 'rated', 'recommended', 'proven', 'verified', 'certified'],
    'Urgency/Scarcity': ['limited', 'now', 'today', 'hurry', 'fast', 'quick', 'instant', 'immediate'],
    'Results/Benefits': ['results', 'transform', 'improve', 'boost', 'increase', 'grow', 'success'],
    'Innovation/New': ['new', 'latest', 'innovative', 'advanced', 'modern', 'cutting-edge'],
    'Easy/Simple': ['easy', 'simple', 'effortless', 'quick', 'fast', 'instant', 'automatic']
  };

  const detectedThemes: string[] = [];
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  for (const [theme, themeKeywords] of Object.entries(themeGroups)) {
    const matches = themeKeywords.filter(tk => lowerKeywords.includes(tk));
    if (matches.length > 0) {
      detectedThemes.push(theme);
    }
  }

  return detectedThemes;
}

/**
 * Identify top performing angles
 */
function identifyTopAngles(ads: Ad[], copyAnalysis: CopyAnalysis): string[] {
  const angles: string[] = [];

  // Get dominant category
  const categoryCount: Record<string, number> = {};
  for (const ad of ads) {
    if (ad.category) {
      categoryCount[ad.category] = (categoryCount[ad.category] || 0) + 1;
    }
  }

  const sortedCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1]);

  if (sortedCategories.length > 0) {
    const [topCategory, count] = sortedCategories[0];
    const percentage = Math.round((count / ads.length) * 100);
    angles.push(`${formatCategoryName(topCategory)} (${percentage}% of ads)`);
  }

  // Add top CTA pattern
  const topCTA = Array.from(copyAnalysis.ctaDistribution.entries())
    .sort((a, b) => b[1] - a[1])[0];
  if (topCTA) {
    angles.push(`"${topCTA[0]}" CTA focus`);
  }

  // Add top phrase if meaningful
  if (copyAnalysis.commonPhrases.length > 0) {
    angles.push(`Phrase: "${copyAnalysis.commonPhrases[0]}"`);
  }

  return angles;
}

/**
 * Format category name for display
 */
function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
