import { Ad } from '../types/ad';
import { createLogger } from '../utils/logger';

const logger = createLogger('campaign-analyzer');

export interface Campaign {
  id: string;
  name: string;
  theme: string;
  ads: Ad[];
  percentage: number;
  variations: number;

  // Core messaging
  hook: string;
  offer: string;
  cta: string;
  ctaPercentage: number;
  landingPage?: string;

  // Targeting
  targetAudience: string[];
  painPoints: string[];

  // Metrics
  format: string;
  videoLengths?: string[];

  // Case study specific
  caseStudy?: {
    name: string;
    result: string;
    painPoint: string;
    solutionAngle: string;
  };
}

export interface CampaignAnalysis {
  competitor: string;
  totalAds: number;
  activePeriod: string;
  campaigns: Campaign[];

  // Investment
  investmentEstimate: {
    conservative: number;
    aggressive: number;
    duration: string;
    signal: string;
  };

  // Pain points
  painPointCategories: {
    category: string;
    points: string[];
  }[];

  // Value propositions
  valuePropositions: {
    key: string;
    description: string;
  }[];

  // Creative execution
  creativeExecution: {
    formats: { type: string; percentage: number }[];
    videoLengths: string[];
    style: string;
    production: string;
  };

  // CTA distribution
  ctaDistribution: { cta: string; percentage: number }[];

  // Strategic analysis
  strategicStrengths: string[];
  strategicWeaknesses: string[];

  // Audience
  audienceTargeting: {
    primary: string[];
    secondary: string[];
    geography: string;
    demographics: string;
    segmentationByMessage: { segment: string; approach: string }[];
  };
}

export class CampaignAnalyzer {

  analyze(competitor: string, ads: Ad[]): CampaignAnalysis {
    logger.info(`Analyzing ${ads.length} ads for campaign patterns`);

    const campaigns = this.groupIntoCampaigns(ads);
    const painPoints = this.extractPainPoints(ads);
    const valueProps = this.extractValuePropositions(ads);
    const creativeExec = this.analyzeCreativeExecution(ads);
    const ctaDist = this.analyzeCTADistribution(ads);
    const audience = this.analyzeAudienceTargeting(ads);
    const strengths = this.identifyStrengths(campaigns, ads);
    const weaknesses = this.identifyWeaknesses(campaigns, ads);
    const investment = this.estimateInvestment(ads);
    const period = this.calculateActivePeriod(ads);

    return {
      competitor,
      totalAds: ads.length,
      activePeriod: period,
      campaigns,
      investmentEstimate: investment,
      painPointCategories: painPoints,
      valuePropositions: valueProps,
      creativeExecution: creativeExec,
      ctaDistribution: ctaDist,
      strategicStrengths: strengths,
      strategicWeaknesses: weaknesses,
      audienceTargeting: audience
    };
  }

  private groupIntoCampaigns(ads: Ad[]): Campaign[] {
    const campaigns: Campaign[] = [];
    const grouped = new Map<string, Ad[]>();

    // Group by similarity - looking for common hooks, offers, themes
    for (const ad of ads) {
      const theme = this.identifyTheme(ad);
      const existing = grouped.get(theme) || [];
      existing.push(ad);
      grouped.set(theme, existing);
    }

    let campaignNum = 1;
    for (const [theme, themeAds] of grouped) {
      if (themeAds.length === 0) continue;

      const hook = this.extractHook(themeAds);
      const offer = this.extractOffer(themeAds);
      const mainCta = this.getMostCommonCTA(themeAds);
      const ctaPct = this.calculateCTAPercentage(themeAds, mainCta);
      const painPoints = this.extractAdPainPoints(themeAds);
      const audience = this.inferTargetAudience(themeAds);
      const format = this.determineFormat(themeAds);
      const caseStudy = this.extractCaseStudy(themeAds);

      campaigns.push({
        id: `campaign-${campaignNum}`,
        name: this.generateCampaignName(theme, themeAds),
        theme,
        ads: themeAds,
        percentage: Math.round((themeAds.length / ads.length) * 100),
        variations: themeAds.length,
        hook,
        offer,
        cta: mainCta,
        ctaPercentage: ctaPct,
        landingPage: this.extractLandingPage(themeAds),
        targetAudience: audience,
        painPoints,
        format,
        videoLengths: this.extractVideoLengths(themeAds),
        caseStudy
      });

      campaignNum++;
    }

    // Sort by percentage descending
    return campaigns.sort((a, b) => b.percentage - a.percentage);
  }

  private identifyTheme(ad: Ad): string {
    const text = (ad.primaryText || '').toLowerCase();

    // Identify campaign themes based on content patterns
    if (this.containsTestimonialPattern(text)) return 'case_study';
    if (this.containsOfferPattern(text)) return 'lead_magnet';
    if (this.containsBrandPattern(text)) return 'brand_positioning';
    if (this.containsEducationalPattern(text)) return 'educational';
    if (this.containsPromoPattern(text)) return 'promotional';

    return 'general';
  }

  private containsTestimonialPattern(text: string): boolean {
    const patterns = [
      /\d+%\s*(increase|growth|boost|surge)/i,
      /from\s+\d+\s+to\s+\d+/i,
      /\$\d+k?\s+in\s+\d+\s+(month|week|day)/i,
      /dr\.|doctor|client|customer.*result/i,
      /case study|success story|testimonial/i
    ];
    return patterns.some(p => p.test(text));
  }

  private containsOfferPattern(text: string): boolean {
    const patterns = [
      /free\s+(guide|ebook|template|tool|starter|pack)/i,
      /download\s+(now|free|your)/i,
      /get\s+(instant|immediate|free)\s+access/i,
      /want\s+to\s+.*\?/i,
      /how\s+to\s+/i
    ];
    return patterns.some(p => p.test(text));
  }

  private containsBrandPattern(text: string): boolean {
    const patterns = [
      /become\s+(the|a)\s+/i,
      /transform\s+your/i,
      /the\s+secret\s+to/i,
      /everyone\s+knows/i,
      /authority|celebrity|expert/i
    ];
    return patterns.some(p => p.test(text));
  }

  private containsEducationalPattern(text: string): boolean {
    const patterns = [
      /\d+\s+(tips|ways|steps|strategies)/i,
      /learn\s+how/i,
      /discover\s+/i,
      /the\s+truth\s+about/i
    ];
    return patterns.some(p => p.test(text));
  }

  private containsPromoPattern(text: string): boolean {
    const patterns = [
      /\d+%\s+off/i,
      /sale|discount|limited\s+time/i,
      /shop\s+now|buy\s+now/i,
      /special\s+offer/i
    ];
    return patterns.some(p => p.test(text));
  }

  private extractHook(ads: Ad[]): string {
    // Find the most common opening line/hook
    const hooks: string[] = [];

    for (const ad of ads) {
      const text = ad.primaryText || '';
      // Extract first sentence or question
      const match = text.match(/^[^.!?]+[.!?]/);
      if (match) {
        hooks.push(match[0].trim());
      }
    }

    // Find most common or most representative
    if (hooks.length === 0) return 'N/A';

    const hookCounts = new Map<string, number>();
    for (const hook of hooks) {
      hookCounts.set(hook, (hookCounts.get(hook) || 0) + 1);
    }

    let bestHook = hooks[0];
    let bestCount = 0;
    for (const [hook, count] of hookCounts) {
      if (count > bestCount) {
        bestHook = hook;
        bestCount = count;
      }
    }

    return `"${bestHook}"`;
  }

  private extractOffer(ads: Ad[]): string {
    const allText = ads.map(a => a.primaryText || '').join(' ');

    // Look for offer patterns
    const offerPatterns = [
      /free\s+([^.!?]+)/i,
      /get\s+(your\s+)?([^.!?]+)/i,
      /download\s+([^.!?]+)/i,
      /access\s+to\s+([^.!?]+)/i
    ];

    for (const pattern of offerPatterns) {
      const match = allText.match(pattern);
      if (match) {
        return match[0].substring(0, 60);
      }
    }

    return 'Contact for details';
  }

  private getMostCommonCTA(ads: Ad[]): string {
    const ctaCounts = new Map<string, number>();

    for (const ad of ads) {
      if (ad.cta) {
        ctaCounts.set(ad.cta, (ctaCounts.get(ad.cta) || 0) + 1);
      }
    }

    let bestCTA = 'Learn More';
    let bestCount = 0;

    for (const [cta, count] of ctaCounts) {
      if (count > bestCount) {
        bestCTA = cta;
        bestCount = count;
      }
    }

    return bestCTA;
  }

  private calculateCTAPercentage(ads: Ad[], cta: string): number {
    const count = ads.filter(a => a.cta === cta).length;
    return Math.round((count / ads.length) * 100);
  }

  private extractAdPainPoints(ads: Ad[]): string[] {
    const painPoints = new Set<string>();
    const allText = ads.map(a => a.primaryText || '').join(' ').toLowerCase();

    // Common pain point patterns
    const patterns: [RegExp, string][] = [
      [/tired\s+of\s+([^?]+)\?/gi, 'Frustrated with'],
      [/struggling\s+(with|to)\s+([^?]+)\?/gi, 'Struggling with'],
      [/want\s+to\s+([^?]+)\?/gi, 'Desire to'],
      [/sick\s+of\s+([^?]+)/gi, 'Sick of'],
      [/frustrated\s+(by|with)\s+([^?]+)/gi, 'Frustrated by'],
      [/stuck\s+(at|with)\s+([^?]+)/gi, 'Stuck with'],
      [/burnt?\s+out/gi, 'Burnout'],
      [/overwhelm/gi, 'Overwhelm'],
      [/inconsistent/gi, 'Inconsistency'],
      [/scattered/gi, 'Scattered efforts'],
      [/ghost/gi, 'Being ghosted'],
      [/empty\s+(calendar|schedule)/gi, 'Empty calendar'],
      [/competition/gi, 'Competition'],
      [/price\s+shopper/gi, 'Price shoppers']
    ];

    for (const [pattern, label] of patterns) {
      if (pattern.test(allText)) {
        painPoints.add(label);
      }
    }

    return Array.from(painPoints).slice(0, 5);
  }

  private inferTargetAudience(ads: Ad[]): string[] {
    const audience = new Set<string>();
    const allText = ads.map(a => a.primaryText || '').join(' ').toLowerCase();

    // Industry/profession detection
    const professions: [RegExp, string][] = [
      [/dentist|dental|practice/i, 'Dental professionals'],
      [/doctor|physician|medical/i, 'Medical professionals'],
      [/business\s+owner/i, 'Business owners'],
      [/entrepreneur/i, 'Entrepreneurs'],
      [/marketer|marketing/i, 'Marketers'],
      [/agency|freelancer/i, 'Agency owners'],
      [/coach|consultant/i, 'Coaches/Consultants'],
      [/ecommerce|shopify|store/i, 'E-commerce owners'],
      [/saas|software/i, 'SaaS founders'],
      [/real\s+estate|realtor/i, 'Real estate professionals']
    ];

    for (const [pattern, label] of professions) {
      if (pattern.test(allText)) {
        audience.add(label);
      }
    }

    if (audience.size === 0) {
      audience.add('Business professionals');
    }

    return Array.from(audience);
  }

  private determineFormat(ads: Ad[]): string {
    const formats = ads.map(a => a.mediaType || 'unknown');
    const videoCt = formats.filter(f => f === 'video').length;
    const imageCt = formats.filter(f => f === 'image').length;

    if (videoCt > imageCt) return 'Video';
    if (imageCt > videoCt) return 'Image';
    return 'Mixed';
  }

  private extractVideoLengths(ads: Ad[]): string[] {
    // Would need to extract from raw data if available
    return ['30-60 seconds'];
  }

  private extractCaseStudy(ads: Ad[]): Campaign['caseStudy'] | undefined {
    const allText = ads.map(a => a.primaryText || '').join(' ');

    // Look for case study patterns
    const resultMatch = allText.match(/(\d+%?\s*(?:increase|growth|boost|surge|revenue|patients?|calls?))/i);
    const nameMatch = allText.match(/(?:dr\.?|doctor)\s+([a-z]+)/i);

    if (resultMatch) {
      return {
        name: nameMatch ? `Dr. ${nameMatch[1]}` : 'Client',
        result: resultMatch[1],
        painPoint: this.extractAdPainPoints(ads)[0] || 'Growth challenges',
        solutionAngle: 'Strategic approach'
      };
    }

    return undefined;
  }

  private extractLandingPage(ads: Ad[]): string | undefined {
    for (const ad of ads) {
      if (ad.destinationUrl) {
        return ad.destinationUrl;
      }
    }
    return undefined;
  }

  private generateCampaignName(theme: string, ads: Ad[]): string {
    const themeNames: Record<string, string> = {
      'case_study': 'Case Studies',
      'lead_magnet': 'Lead Magnet',
      'brand_positioning': 'Brand Positioning',
      'educational': 'Educational Content',
      'promotional': 'Promotional',
      'general': 'General Awareness'
    };

    return themeNames[theme] || 'Campaign';
  }

  private extractPainPoints(ads: Ad[]): CampaignAnalysis['painPointCategories'] {
    const categories = [
      {
        category: 'Business Challenges',
        keywords: ['growth', 'revenue', 'profit', 'scaling', 'competition']
      },
      {
        category: 'Marketing Issues',
        keywords: ['marketing', 'leads', 'traffic', 'conversion', 'ads', 'social']
      },
      {
        category: 'Operational Problems',
        keywords: ['time', 'overwhelm', 'burnout', 'staff', 'systems']
      },
      {
        category: 'Vendor/Agency Issues',
        keywords: ['agency', 'ghost', 'vendor', 'promise', 'partner']
      }
    ];

    const allText = ads.map(a => (a.primaryText || '').toLowerCase()).join(' ');
    const result: CampaignAnalysis['painPointCategories'] = [];

    for (const cat of categories) {
      const points: string[] = [];
      for (const kw of cat.keywords) {
        if (allText.includes(kw)) {
          // Extract the context around the keyword
          const regex = new RegExp(`[^.]*${kw}[^.]*\\.`, 'gi');
          const matches = allText.match(regex);
          if (matches && matches[0]) {
            points.push(matches[0].substring(0, 50));
          }
        }
      }
      if (points.length > 0) {
        result.push({ category: cat.category, points: points.slice(0, 4) });
      }
    }

    return result;
  }

  private extractValuePropositions(ads: Ad[]): CampaignAnalysis['valuePropositions'] {
    const allText = ads.map(a => a.primaryText || '').join(' ').toLowerCase();
    const props: CampaignAnalysis['valuePropositions'] = [];

    const patterns: [RegExp, string, string][] = [
      [/\d+%.*in\s+\d+\s+(day|week|month)/i, 'Speed', 'Quick results promised'],
      [/system|turn-key|done.for.you/i, 'Systematic', 'Turn-key approach'],
      [/partner|we\s+work\s+with/i, 'Partnership', 'Strategic partner relationship'],
      [/simple|easy|just\s+\d+/i, 'Accessibility', 'Low barrier to entry'],
      [/authority|expert|celebrity/i, 'Authority', 'Positioning as authority'],
      [/roi|pays\s+for\s+itself|investment/i, 'ROI Certainty', 'Clear return on investment'],
      [/since\s+\d{4}|\d+\+?\s+(year|client|customer)/i, 'Credibility', 'Established track record'],
      [/\$[\d,]+|\d+%\s+increase/i, 'Results', 'Measurable outcomes']
    ];

    for (const [pattern, key, desc] of patterns) {
      if (pattern.test(allText)) {
        props.push({ key, description: desc });
      }
    }

    return props;
  }

  private analyzeCreativeExecution(ads: Ad[]): CampaignAnalysis['creativeExecution'] {
    const formatCounts = new Map<string, number>();

    for (const ad of ads) {
      const format = ad.mediaType || 'unknown';
      formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
    }

    const formats: { type: string; percentage: number }[] = [];
    for (const [type, count] of formatCounts) {
      formats.push({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        percentage: Math.round((count / ads.length) * 100)
      });
    }

    return {
      formats: formats.sort((a, b) => b.percentage - a.percentage),
      videoLengths: ['30-60 seconds'],
      style: 'Mixed creative styles',
      production: 'Professional to UGC'
    };
  }

  private analyzeCTADistribution(ads: Ad[]): CampaignAnalysis['ctaDistribution'] {
    const ctaCounts = new Map<string, number>();

    for (const ad of ads) {
      const cta = ad.cta || 'Unknown';
      ctaCounts.set(cta, (ctaCounts.get(cta) || 0) + 1);
    }

    const distribution: { cta: string; percentage: number }[] = [];
    for (const [cta, count] of ctaCounts) {
      distribution.push({
        cta,
        percentage: Math.round((count / ads.length) * 100)
      });
    }

    return distribution.sort((a, b) => b.percentage - a.percentage);
  }

  private analyzeAudienceTargeting(ads: Ad[]): CampaignAnalysis['audienceTargeting'] {
    const allText = ads.map(a => a.primaryText || '').join(' ');

    return {
      primary: this.inferTargetAudience(ads),
      secondary: ['Decision makers', 'Growth-focused professionals'],
      geography: 'US-wide (no visible geo-restriction)',
      demographics: 'Business owners 25-55',
      segmentationByMessage: [
        { segment: 'Growth-stage', approach: 'Case studies showing scaling' },
        { segment: 'Frustrated switchers', approach: 'Agency pain messaging' },
        { segment: 'DIY marketers', approach: 'Free tools and systems' }
      ]
    };
  }

  private identifyStrengths(campaigns: Campaign[], ads: Ad[]): string[] {
    const strengths: string[] = [];

    // Check for testimonial/case study usage
    const caseStudyCampaigns = campaigns.filter(c => c.theme === 'case_study');
    if (caseStudyCampaigns.length > 0) {
      strengths.push('Strong social proof with case studies');
    }

    // Check for variation testing
    const highVariationCampaigns = campaigns.filter(c => c.variations >= 5);
    if (highVariationCampaigns.length > 0) {
      strengths.push('Systematic creative testing at scale');
    }

    // Check for funnel diversity
    if (campaigns.length >= 3) {
      strengths.push('Clear funnel progression');
    }

    // Check for specific proof points
    const allText = ads.map(a => a.primaryText || '').join(' ');
    if (/\d{3}%|\$\d+k/i.test(allText)) {
      strengths.push('Specific proof points (builds credibility)');
    }

    // Check for consistent messaging
    if (campaigns.some(c => c.percentage >= 30)) {
      strengths.push('Focused messaging strategy');
    }

    // Check ad volume
    if (ads.length >= 20) {
      strengths.push('Significant ad investment level');
    }

    return strengths.slice(0, 6);
  }

  private identifyWeaknesses(campaigns: Campaign[], ads: Ad[]): string[] {
    const weaknesses: string[] = [];

    // Check for creative fatigue risk
    const oldestAd = this.getOldestAdDate(ads);
    if (oldestAd) {
      const monthsActive = this.monthsSince(oldestAd);
      if (monthsActive >= 3) {
        weaknesses.push('Creative fatigue risk (long-running campaigns)');
      }
    }

    // Check CTA diversity
    const ctaDist = this.analyzeCTADistribution(ads);
    if (ctaDist.length > 0 && ctaDist[0].percentage >= 70) {
      weaknesses.push(`CTA monotony (${ctaDist[0].percentage}% use "${ctaDist[0].cta}")`);
    }

    // Check for missing urgency
    const allText = ads.map(a => a.primaryText || '').join(' ').toLowerCase();
    if (!/limited|deadline|expires|only \d+|hurry/i.test(allText)) {
      weaknesses.push('Missing urgency mechanisms');
    }

    // Check for pricing transparency
    if (!/\$[\d,]+\s*(per|\/)/i.test(allText)) {
      weaknesses.push('Pricing opacity');
    }

    // Check platform diversity
    const platforms = new Set(ads.flatMap(a => a.platforms || []));
    if (platforms.size <= 1) {
      weaknesses.push('Single platform focus');
    }

    // Check for geographic targeting
    weaknesses.push('Geographic dilution (broad targeting)');

    return weaknesses.slice(0, 6);
  }

  private estimateInvestment(ads: Ad[]): CampaignAnalysis['investmentEstimate'] {
    // Rough estimates based on ad count and assumed CPMs
    const adCount = ads.length;

    // Conservative: $200-500/ad/month, Aggressive: $500-1500/ad/month
    const conservative = adCount * 300;
    const aggressive = adCount * 1200;

    const oldest = this.getOldestAdDate(ads);
    let duration = 'Recent';
    if (oldest) {
      const months = this.monthsSince(oldest);
      duration = months > 0 ? `${months}+ months active` : 'Recent campaign';
    }

    return {
      conservative,
      aggressive,
      duration,
      signal: adCount >= 20 ? 'Primary acquisition channel' : 'Testing/secondary channel'
    };
  }

  private calculateActivePeriod(ads: Ad[]): string {
    const oldest = this.getOldestAdDate(ads);
    if (!oldest) return 'Recent';

    const months = this.monthsSince(oldest);
    return `${months}+ months`;
  }

  private getOldestAdDate(ads: Ad[]): Date | null {
    let oldest: Date | null = null;

    for (const ad of ads) {
      if (ad.startDate) {
        try {
          const date = new Date(ad.startDate);
          if (!oldest || date < oldest) {
            oldest = date;
          }
        } catch {
          // Skip invalid dates
        }
      }
    }

    return oldest;
  }

  private monthsSince(date: Date): number {
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }
}

export function analyzeCampaigns(competitor: string, ads: Ad[]): CampaignAnalysis {
  const analyzer = new CampaignAnalyzer();
  return analyzer.analyze(competitor, ads);
}
