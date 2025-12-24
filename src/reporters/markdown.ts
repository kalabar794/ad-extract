import fs from 'fs';
import path from 'path';
import { Ad, AdCategory } from '../types/ad';
import { CompetitorAnalysis, ExecutiveSummary, StrategicOpportunity } from '../types/analysis';
import { createLogger } from '../utils/logger';

const logger = createLogger('markdown-reporter');

export interface MarkdownReportOptions {
  outputDir: string;
  filename?: string;
  includeRawData?: boolean;
  maxAdsPerCategory?: number;
}

export class MarkdownReporter {
  private options: MarkdownReportOptions;

  constructor(options: MarkdownReportOptions) {
    this.options = {
      includeRawData: false,
      maxAdsPerCategory: 5,
      ...options
    };
  }

  /**
   * Generate full markdown report
   */
  generate(
    competitor: string,
    ads: Ad[],
    analysis: CompetitorAnalysis,
    summary?: ExecutiveSummary
  ): string {
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader(competitor, analysis));

    // Executive Summary
    if (summary) {
      sections.push(this.generateExecutiveSummary(summary));
    }

    // Quick Stats
    sections.push(this.generateQuickStats(analysis));

    // Platform Breakdown
    sections.push(this.generatePlatformBreakdown(analysis));

    // Category Distribution
    sections.push(this.generateCategoryDistribution(analysis));

    // Messaging Analysis
    sections.push(this.generateMessagingAnalysis(analysis));

    // CTA Analysis
    sections.push(this.generateCTAAnalysis(analysis));

    // Sample Ads by Category
    sections.push(this.generateSampleAds(ads, analysis));

    // Strategic Opportunities
    if (summary?.strategicOpportunities) {
      sections.push(this.generateOpportunities(summary.strategicOpportunities));
    }

    // Recommendations
    if (summary?.recommendedActions) {
      sections.push(this.generateRecommendations(summary.recommendedActions));
    }

    return sections.join('\n\n');
  }

  /**
   * Save markdown report to file
   */
  async save(
    competitor: string,
    ads: Ad[],
    analysis: CompetitorAnalysis,
    summary?: ExecutiveSummary
  ): Promise<string> {
    const markdown = this.generate(competitor, ads, analysis, summary);

    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    const filename = this.options.filename || this.generateFilename(competitor);
    const filepath = path.join(this.options.outputDir, filename);

    fs.writeFileSync(filepath, markdown, 'utf-8');
    logger.info(`Markdown report saved: ${filepath}`);

    return filepath;
  }

  private generateFilename(competitor: string): string {
    const sanitized = competitor.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitized}_${timestamp}.md`;
  }

  private generateHeader(competitor: string, analysis: CompetitorAnalysis): string {
    return `# Competitive Ad Analysis: ${competitor}

**Analysis Date:** ${new Date(analysis.analysisDate).toLocaleDateString()}
**Total Ads Analyzed:** ${analysis.totalAds}
**Date Range:** ${this.formatDateRange(analysis.dateRange)}

---`;
  }

  private generateExecutiveSummary(summary: ExecutiveSummary): string {
    return `## Executive Summary

### Key Findings

${summary.keyFindings.summary}

**Primary Theme:** ${summary.keyFindings.primaryTheme}
**Key Opportunity:** ${summary.keyFindings.keyOpportunity}

### Advertising Footprint

| Platform | Ad Count | Focus |
|----------|----------|-------|
${Object.entries(summary.advertisingFootprint.platforms)
  .map(([platform, data]) => `| ${platform} | ${data.count} | ${data.focus} |`)
  .join('\n')}

### Messaging Strategy

**Top Keywords:** ${summary.messagingStrategy.topKeywords.join(', ')}

**Primary Angles:**
${summary.messagingStrategy.primaryAngles.map(a => `- ${a}`).join('\n')}

**Dominant CTA:** "${summary.messagingStrategy.dominantCTA.text}" (${summary.messagingStrategy.dominantCTA.percentage}% of ads)`;
  }

  private generateQuickStats(analysis: CompetitorAnalysis): string {
    const { copyAnalysis } = analysis;

    return `## Quick Stats

| Metric | Value |
|--------|-------|
| Total Ads | ${analysis.totalAds} |
| Avg Copy Length | ${copyAnalysis.avgCopyLength} characters |
| Readability Score | ${copyAnalysis.readabilityScore}/100 |
| Unique Hashtags | ${copyAnalysis.hashtagFrequency.size} |
| Emojis Used | ${copyAnalysis.emojiUsage.length > 0 ? copyAnalysis.emojiUsage.join(' ') : 'None'} |`;
  }

  private generatePlatformBreakdown(analysis: CompetitorAnalysis): string {
    const total = Object.values(analysis.platformBreakdown).reduce((a, b) => a + b, 0);

    return `## Platform Distribution

| Platform | Ads | Percentage |
|----------|-----|------------|
${Object.entries(analysis.platformBreakdown)
  .sort((a, b) => b[1] - a[1])
  .map(([platform, count]) => {
    const pct = Math.round((count / total) * 100);
    return `| ${platform} | ${count} | ${pct}% |`;
  })
  .join('\n')}`;
  }

  private generateCategoryDistribution(analysis: CompetitorAnalysis): string {
    const total = Object.values(analysis.categoryBreakdown).reduce((a, b) => a + b, 0);

    const rows = Object.entries(analysis.categoryBreakdown)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => {
        const pct = Math.round((count / total) * 100);
        const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        return `| ${this.formatCategoryName(category)} | ${count} | ${pct}% | ${bar} |`;
      });

    return `## Ad Categories

| Category | Count | % | Distribution |
|----------|-------|---|--------------|
${rows.join('\n')}`;
  }

  private generateMessagingAnalysis(analysis: CompetitorAnalysis): string {
    const { copyAnalysis } = analysis;

    const topKeywords = copyAnalysis.topKeywords.slice(0, 15);
    const topPhrases = copyAnalysis.commonPhrases.slice(0, 10);

    // Get top hashtags
    const topHashtags = Array.from(copyAnalysis.hashtagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return `## Messaging Analysis

### Top Keywords
${topKeywords.map((kw, i) => `${i + 1}. **${kw}**`).join('\n')}

### Common Phrases
${topPhrases.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

### Messaging Themes
${analysis.messagingThemes.map(t => `- ${t}`).join('\n')}

${topHashtags.length > 0 ? `### Top Hashtags
${topHashtags.map(([tag, count]) => `- ${tag} (${count}x)`).join('\n')}` : ''}`;
  }

  private generateCTAAnalysis(analysis: CompetitorAnalysis): string {
    const ctaRows = analysis.ctaPatterns
      .slice(0, 10)
      .map(({ cta, count, percentage }) => `| ${cta} | ${count} | ${percentage}% |`);

    return `## Call-to-Action Analysis

| CTA | Count | Usage |
|-----|-------|-------|
${ctaRows.join('\n')}`;
  }

  private generateSampleAds(ads: Ad[], analysis: CompetitorAnalysis): string {
    const sections: string[] = ['## Sample Ads by Category'];

    // Get ads by category
    const adsByCategory = new Map<AdCategory, Ad[]>();
    for (const ad of ads) {
      if (ad.category) {
        const existing = adsByCategory.get(ad.category) || [];
        existing.push(ad);
        adsByCategory.set(ad.category, existing);
      }
    }

    // Generate sections for top categories
    const sortedCategories = Object.entries(analysis.categoryBreakdown)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [category] of sortedCategories) {
      const categoryAds = adsByCategory.get(category as AdCategory) || [];
      const sampleAds = categoryAds.slice(0, this.options.maxAdsPerCategory);

      if (sampleAds.length === 0) continue;

      sections.push(`\n### ${this.formatCategoryName(category)}\n`);

      for (const ad of sampleAds) {
        sections.push(this.formatAdSample(ad));
      }
    }

    return sections.join('\n');
  }

  private formatAdSample(ad: Ad): string {
    let sample = `---\n\n`;

    if (ad.primaryText) {
      // Truncate long text
      const text = ad.primaryText.length > 300
        ? ad.primaryText.substring(0, 300) + '...'
        : ad.primaryText;
      sample += `> ${text.replace(/\n/g, '\n> ')}\n\n`;
    }

    const meta: string[] = [];
    if (ad.cta) meta.push(`**CTA:** ${ad.cta}`);
    if (ad.startDate) meta.push(`**Started:** ${ad.startDate}`);
    if (ad.platforms?.length) meta.push(`**Platforms:** ${ad.platforms.join(', ')}`);
    if (ad.destinationUrl) meta.push(`**URL:** ${this.truncateUrl(ad.destinationUrl)}`);

    if (meta.length > 0) {
      sample += meta.join(' | ') + '\n';
    }

    return sample;
  }

  private generateOpportunities(opportunities: StrategicOpportunity[]): string {
    const rows = opportunities.map(opp => {
      const priorityEmoji = opp.priority === 'high' ? '🔴' : opp.priority === 'medium' ? '🟡' : '🟢';
      return `### ${priorityEmoji} ${opp.type.charAt(0).toUpperCase() + opp.type.slice(1)}

**${opp.description}**

*Opportunity:* ${opp.opportunity}`;
    });

    return `## Strategic Opportunities

${rows.join('\n\n')}`;
  }

  private generateRecommendations(recommendations: string[]): string {
    return `## Recommended Actions

${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  }

  private formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatDateRange(dateRange: { earliest?: string; latest?: string }): string {
    if (!dateRange.earliest && !dateRange.latest) return 'N/A';
    const earliest = dateRange.earliest ? new Date(dateRange.earliest).toLocaleDateString() : '?';
    const latest = dateRange.latest ? new Date(dateRange.latest).toLocaleDateString() : '?';
    return `${earliest} to ${latest}`;
  }

  private truncateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname + (parsed.pathname.length > 30 ? parsed.pathname.substring(0, 30) + '...' : parsed.pathname);
    } catch {
      return url.substring(0, 50) + '...';
    }
  }
}

/**
 * Quick markdown generation
 */
export function generateMarkdownReport(
  competitor: string,
  ads: Ad[],
  analysis: CompetitorAnalysis,
  outputDir: string
): Promise<string> {
  const reporter = new MarkdownReporter({ outputDir });
  return reporter.save(competitor, ads, analysis);
}
