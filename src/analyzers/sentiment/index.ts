/**
 * Sentiment Analyzer
 *
 * Comprehensive sentiment and psychological analysis engine for ad copy.
 * Designed for senior marketers who need deep competitive intelligence.
 *
 * Features:
 * - Emotional tone analysis (Plutchik's Wheel)
 * - Persuasion technique detection (Cialdini's principles)
 * - Voice & tone analysis
 * - Framing analysis
 * - Psychological triggers
 * - Competitive positioning
 * - Auto-generated strategic insights
 */

import { Ad } from '../../types/ad';
import {
  SentimentAnalysis,
  SentimentSummary,
  EmotionType,
  PersuasionTechnique,
  PsychologicalTrigger,
  BrandPersonalityTrait,
  FramingStyle,
  OverallSentiment,
  SentimentAnalysisOptions,
  VoiceProfile,
  CompetitivePosture,
  StrategicOpportunities
} from '../../types/sentiment';

import { EmotionAnalyzer, analyzeEmotions } from './emotion-analyzer';
import { PersuasionAnalyzer, analyzePersuasion } from './persuasion-analyzer';
import { ToneAnalyzer, analyzeTone } from './tone-analyzer';
import { FramingAnalyzer, analyzeFraming } from './framing-analyzer';
import { TriggerAnalyzer, analyzeTriggers } from './trigger-analyzer';
import { PositioningAnalyzer, analyzePositioning } from './positioning-analyzer';
import { InsightsGenerator, generateInsights } from './insights-generator';
import { createLogger } from '../../utils/logger';

const logger = createLogger('sentiment-analyzer');
const ANALYSIS_VERSION = '1.0.0';

export class SentimentAnalyzer {
  private emotionAnalyzer: EmotionAnalyzer;
  private persuasionAnalyzer: PersuasionAnalyzer;
  private toneAnalyzer: ToneAnalyzer;
  private framingAnalyzer: FramingAnalyzer;
  private triggerAnalyzer: TriggerAnalyzer;
  private positioningAnalyzer: PositioningAnalyzer;
  private insightsGenerator: InsightsGenerator;

  constructor() {
    this.emotionAnalyzer = new EmotionAnalyzer();
    this.persuasionAnalyzer = new PersuasionAnalyzer();
    this.toneAnalyzer = new ToneAnalyzer();
    this.framingAnalyzer = new FramingAnalyzer();
    this.triggerAnalyzer = new TriggerAnalyzer();
    this.positioningAnalyzer = new PositioningAnalyzer();
    this.insightsGenerator = new InsightsGenerator();
  }

  /**
   * Analyze sentiment of a single text string
   */
  analyze(text: string, options: SentimentAnalysisOptions = {}): SentimentAnalysis {
    const startTime = Date.now();

    // Skip empty or very short text
    if (!text || text.trim().length < 10) {
      return this.createEmptyAnalysis(text);
    }

    // Run all analyzers
    const emotions = this.emotionAnalyzer.analyze(text);
    const persuasion = this.persuasionAnalyzer.analyze(text);
    const tone = this.toneAnalyzer.analyze(text);
    const framing = this.framingAnalyzer.analyze(text);
    const triggers = this.triggerAnalyzer.analyze(text);
    const positioning = this.positioningAnalyzer.analyze(text);

    // Calculate overall sentiment
    const overall = this.calculateOverallSentiment(emotions, framing);

    // Generate strategic insights
    const strategicInsights = options.includeStrategicInsights !== false
      ? this.insightsGenerator.generate(emotions, persuasion, tone, framing, triggers, positioning)
      : this.createEmptyInsights();

    // Calculate metadata
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const processingTimeMs = Date.now() - startTime;

    return {
      text,
      analyzedAt: new Date().toISOString(),
      overall,
      emotions,
      persuasion,
      tone,
      framing,
      triggers,
      positioning,
      strategicInsights,
      metadata: {
        wordCount,
        sentenceCount,
        analysisVersion: ANALYSIS_VERSION,
        processingTimeMs
      }
    };
  }

  /**
   * Analyze sentiment of an ad
   */
  analyzeAd(ad: Ad, options: SentimentAnalysisOptions = {}): SentimentAnalysis {
    // Combine all text fields for analysis
    const textParts = [
      ad.primaryText,
      ad.headline,
      ad.description,
      ad.cta
    ].filter(Boolean);

    const text = textParts.join(' ');
    const analysis = this.analyze(text, options);

    return {
      ...analysis,
      adId: ad.id
    };
  }

  /**
   * Analyze multiple ads and return individual analyses
   */
  analyzeAds(ads: Ad[], options: SentimentAnalysisOptions = {}): SentimentAnalysis[] {
    logger.info(`Analyzing sentiment for ${ads.length} ads`);
    return ads.map(ad => this.analyzeAd(ad, options));
  }

  /**
   * Generate aggregate summary from multiple analyses
   */
  generateSummary(competitor: string, analyses: SentimentAnalysis[]): SentimentSummary {
    const startTime = Date.now();

    if (analyses.length === 0) {
      return this.createEmptySummary(competitor);
    }

    // Calculate emotion distribution
    const emotionCounts: Record<EmotionType, number> = {} as Record<EmotionType, number>;
    for (const type of Object.values(EmotionType)) {
      emotionCounts[type] = 0;
    }
    for (const analysis of analyses) {
      emotionCounts[analysis.emotions.primary]++;
    }

    // Find dominant emotion
    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as EmotionType;

    // Calculate average emotional intensity
    const avgEmotionalIntensity = analyses.reduce((sum, a) => sum + a.emotions.intensityScore, 0) / analyses.length;

    // Calculate emotional consistency (how often primary emotion is same as dominant)
    const emotionalConsistency = emotionCounts[dominantEmotion] / analyses.length;

    // Calculate technique distribution
    const techniqueCounts: Record<PersuasionTechnique, number> = {} as Record<PersuasionTechnique, number>;
    for (const technique of Object.values(PersuasionTechnique)) {
      techniqueCounts[technique] = 0;
    }
    for (const analysis of analyses) {
      for (const technique of analysis.persuasion.techniques) {
        techniqueCounts[technique]++;
      }
    }

    // Most used techniques
    const mostUsedTechniques = Object.entries(techniqueCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([technique]) => technique as PersuasionTechnique);

    // Average pressure score
    const avgPressureScore = analyses.reduce((sum, a) => sum + a.persuasion.pressureScore, 0) / analyses.length;

    // Generate persuasion style description
    const persuasionStyle = this.describePersuasionStyle(mostUsedTechniques, avgPressureScore);

    // Calculate trigger distribution
    const triggerCounts: Record<PsychologicalTrigger, number> = {} as Record<PsychologicalTrigger, number>;
    for (const trigger of Object.values(PsychologicalTrigger)) {
      triggerCounts[trigger] = 0;
    }
    for (const analysis of analyses) {
      for (const trigger of analysis.triggers.detected) {
        triggerCounts[trigger]++;
      }
    }

    const dominantTriggers = Object.entries(triggerCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trigger]) => trigger as PsychologicalTrigger);

    // Build voice profile
    const brandVoiceProfile = this.buildVoiceProfile(analyses);

    // Calculate framing patterns
    const framingPatterns = this.calculateFramingPatterns(analyses);

    // Calculate competitive posture
    const competitivePosture = this.calculateCompetitivePosture(analyses);

    // Calculate sentiment distribution
    const sentimentDistribution = {
      positive: analyses.filter(a => a.overall.sentiment === 'positive').length / analyses.length,
      neutral: analyses.filter(a => a.overall.sentiment === 'neutral').length / analyses.length,
      negative: analyses.filter(a => a.overall.sentiment === 'negative').length / analyses.length
    };
    const avgSentimentScore = analyses.reduce((sum, a) => sum + a.overall.score, 0) / analyses.length;

    // Identify strategic opportunities
    const opportunities = this.identifyOpportunities(emotionCounts, techniqueCounts, triggerCounts, analyses);

    // Generate recommendations
    const recommendations = this.generateSummaryRecommendations(
      dominantEmotion,
      mostUsedTechniques,
      brandVoiceProfile,
      competitivePosture,
      opportunities
    );

    // Generate top insights
    const topInsights = this.generateTopInsights(analyses);

    return {
      competitor,
      adsAnalyzed: analyses.length,
      analysisDate: new Date().toISOString(),
      dominantEmotion,
      emotionDistribution: emotionCounts,
      avgEmotionalIntensity: Math.round(avgEmotionalIntensity * 10) / 10,
      emotionalConsistency: Math.round(emotionalConsistency * 100) / 100,
      mostUsedTechniques,
      techniqueDistribution: techniqueCounts,
      avgPressureScore: Math.round(avgPressureScore * 10) / 10,
      persuasionStyle,
      brandVoiceProfile,
      framingPatterns,
      dominantTriggers,
      triggerDistribution: triggerCounts,
      competitivePosture,
      opportunities,
      sentimentDistribution,
      avgSentimentScore: Math.round(avgSentimentScore * 100) / 100,
      recommendations,
      topInsights,
      metadata: {
        analysisVersion: ANALYSIS_VERSION,
        totalProcessingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Convenience method: analyze ads and generate summary in one call
   */
  analyzeCompetitor(competitor: string, ads: Ad[], options: SentimentAnalysisOptions = {}): {
    analyses: SentimentAnalysis[];
    summary: SentimentSummary;
  } {
    const analyses = this.analyzeAds(ads, options);
    const summary = this.generateSummary(competitor, analyses);
    return { analyses, summary };
  }

  /**
   * Calculate overall sentiment from emotion and framing analysis
   */
  private calculateOverallSentiment(
    emotions: SentimentAnalysis['emotions'],
    framing: SentimentAnalysis['framing']
  ): OverallSentiment {
    // Calculate sentiment score based on emotion polarity
    const positiveEmotions = [EmotionType.JOY, EmotionType.TRUST, EmotionType.ANTICIPATION];
    const negativeEmotions = [EmotionType.FEAR, EmotionType.SADNESS, EmotionType.ANGER, EmotionType.DISGUST];

    let score = 0;
    const breakdown = emotions.emotionBreakdown;

    for (const emotion of positiveEmotions) {
      score += breakdown[emotion] || 0;
    }
    for (const emotion of negativeEmotions) {
      score -= breakdown[emotion] || 0;
    }

    // Adjust for framing
    if (framing.primaryFrame === 'positive') {
      score += 0.1;
    } else if (framing.primaryFrame === 'negative') {
      score -= 0.1;
    }

    // Normalize to -1 to 1 range
    score = Math.max(-1, Math.min(1, score));

    // Determine sentiment label
    let sentiment: 'positive' | 'neutral' | 'negative';
    if (score > 0.15) {
      sentiment = 'positive';
    } else if (score < -0.15) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    // Confidence based on intensity and consistency
    const confidence = Math.min(1, (emotions.intensityScore / 10) * 0.7 + 0.3);

    return {
      sentiment,
      score: Math.round(score * 100) / 100,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Build aggregate voice profile from multiple analyses
   */
  private buildVoiceProfile(analyses: SentimentAnalysis[]): VoiceProfile {
    // Count personality traits
    const traitCounts: Record<BrandPersonalityTrait, number> = {} as Record<BrandPersonalityTrait, number>;
    for (const trait of Object.values(BrandPersonalityTrait)) {
      traitCounts[trait] = 0;
    }
    for (const analysis of analyses) {
      for (const trait of analysis.tone.brandPersonality) {
        traitCounts[trait]++;
      }
    }

    // Get dominant traits
    const dominantTraits = Object.entries(traitCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([trait, count]) => ({
        trait: trait as BrandPersonalityTrait,
        frequency: count / analyses.length
      }));

    const personality = dominantTraits.slice(0, 3).map(t => t.trait);

    // Calculate average formality
    const avgFormality = analyses.reduce((sum, a) => sum + a.tone.formalityScore, 0) / analyses.length;

    // Calculate consistency (how often same personality appears)
    const mostCommonTrait = dominantTraits[0];
    const consistencyScore = mostCommonTrait ? mostCommonTrait.frequency : 0;

    // Generate voice description
    const voiceDescription = this.generateVoiceDescription(personality, avgFormality, consistencyScore);

    return {
      personality,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      avgFormality: Math.round(avgFormality * 10) / 10,
      voiceDescription,
      dominantTraits: dominantTraits.slice(0, 3)
    };
  }

  /**
   * Calculate framing patterns from analyses
   */
  private calculateFramingPatterns(analyses: SentimentAnalysis[]): SentimentSummary['framingPatterns'] {
    const frameCounts = { positive: 0, negative: 0, balanced: 0 };
    const styleCounts: Record<FramingStyle, number> = {
      [FramingStyle.GAIN]: 0,
      [FramingStyle.LOSS]: 0,
      [FramingStyle.RISK]: 0,
      [FramingStyle.OPPORTUNITY]: 0
    };

    for (const analysis of analyses) {
      frameCounts[analysis.framing.primaryFrame]++;
      styleCounts[analysis.framing.framingStyle]++;
    }

    const dominantFrame = Object.entries(frameCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as 'positive' | 'negative' | 'balanced';

    const dominantStyle = Object.entries(styleCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as FramingStyle;

    return {
      dominantFrame,
      dominantStyle,
      frameDistribution: frameCounts
    };
  }

  /**
   * Calculate competitive posture from analyses
   */
  private calculateCompetitivePosture(analyses: SentimentAnalysis[]): CompetitivePosture {
    // Average positioning score
    const avgPositioningScore = analyses.reduce((sum, a) => sum + a.positioning.positioningScore, 0) / analyses.length;

    // Most common aggressiveness level
    const aggressivenessCounts: Record<string, number> = {};
    for (const analysis of analyses) {
      const level = analysis.positioning.aggressiveness;
      aggressivenessCounts[level] = (aggressivenessCounts[level] || 0) + 1;
    }
    const aggressivenessLevel = Object.entries(aggressivenessCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Most common market position
    const positionCounts: Record<string, number> = {};
    for (const analysis of analyses) {
      const pos = analysis.positioning.marketPosition;
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    }
    const positioningStrategy = Object.entries(positionCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Determine threat level based on aggressiveness and positioning
    let threatLevel: 'low' | 'medium' | 'high';
    if (avgPositioningScore >= 7 || aggressivenessLevel === 'aggressive') {
      threatLevel = 'high';
    } else if (avgPositioningScore >= 4) {
      threatLevel = 'medium';
    } else {
      threatLevel = 'low';
    }

    return {
      aggressivenessLevel,
      positioningStrategy,
      threatLevel,
      competitiveIntensity: Math.round(avgPositioningScore * 10) / 10
    };
  }

  /**
   * Identify strategic opportunities (gaps in competitor approach)
   */
  private identifyOpportunities(
    emotionCounts: Record<EmotionType, number>,
    techniqueCounts: Record<PersuasionTechnique, number>,
    triggerCounts: Record<PsychologicalTrigger, number>,
    analyses: SentimentAnalysis[]
  ): StrategicOpportunities {
    // Find unused or underused emotions
    const totalAds = analyses.length;
    const emotionalGaps = Object.entries(emotionCounts)
      .filter(([_, count]) => count < totalAds * 0.1)
      .map(([emotion]) => {
        const emotionDescriptions: Record<string, string> = {
          [EmotionType.JOY]: 'Joy/celebration messaging',
          [EmotionType.TRUST]: 'Trust-building content',
          [EmotionType.FEAR]: 'Risk/fear awareness',
          [EmotionType.SURPRISE]: 'Novelty/surprise elements',
          [EmotionType.ANTICIPATION]: 'Anticipation/future-focused content',
          [EmotionType.SADNESS]: 'Empathy-driven messaging',
          [EmotionType.ANGER]: 'Frustration/pain point activation',
          [EmotionType.DISGUST]: 'Rejection of status quo'
        };
        return emotionDescriptions[emotion] || emotion;
      })
      .slice(0, 3);

    // Find unused persuasion techniques
    const persuasionGaps = Object.entries(techniqueCounts)
      .filter(([_, count]) => count < totalAds * 0.1)
      .map(([technique]) => {
        const techniqueDescriptions: Record<string, string> = {
          [PersuasionTechnique.SCARCITY]: 'Scarcity/limited availability',
          [PersuasionTechnique.SOCIAL_PROOF]: 'Social proof/testimonials',
          [PersuasionTechnique.AUTHORITY]: 'Authority/expertise',
          [PersuasionTechnique.RECIPROCITY]: 'Reciprocity/free value',
          [PersuasionTechnique.COMMITMENT]: 'Commitment/consistency',
          [PersuasionTechnique.LIKING]: 'Liking/rapport building',
          [PersuasionTechnique.URGENCY]: 'Urgency/time pressure',
          [PersuasionTechnique.FOMO]: 'FOMO messaging',
          [PersuasionTechnique.ANCHORING]: 'Price anchoring',
          [PersuasionTechnique.EXCLUSIVITY]: 'Exclusivity/VIP positioning'
        };
        return techniqueDescriptions[technique] || technique;
      })
      .slice(0, 3);

    // Find voice opportunities based on low characteristic scores
    const voiceOpportunities: string[] = [];
    const avgVoice = {
      authority: 0, urgency: 0, empathy: 0,
      confidence: 0, exclusivity: 0, warmth: 0
    };
    for (const analysis of analyses) {
      for (const [key, value] of Object.entries(analysis.tone.voiceCharacteristics)) {
        avgVoice[key as keyof typeof avgVoice] += value;
      }
    }
    for (const key of Object.keys(avgVoice) as (keyof typeof avgVoice)[]) {
      avgVoice[key] /= analyses.length;
      if (avgVoice[key] < 5) {
        const voiceDescriptions: Record<string, string> = {
          authority: 'More authoritative positioning',
          urgency: 'Greater urgency in messaging',
          empathy: 'More empathetic, customer-focused copy',
          confidence: 'Bolder, more confident claims',
          exclusivity: 'Premium/exclusive positioning',
          warmth: 'Warmer, more personal tone'
        };
        voiceOpportunities.push(voiceDescriptions[key]);
      }
    }

    // Find positioning gaps
    const positioningGaps: string[] = [];
    const avgPositioningScore = analyses.reduce((sum, a) => sum + a.positioning.positioningScore, 0) / analyses.length;
    if (avgPositioningScore < 5) {
      positioningGaps.push('Stronger competitive differentiation');
    }

    const marketPositions = analyses.map(a => a.positioning.marketPosition);
    if (!marketPositions.includes('leader' as any)) {
      positioningGaps.push('Leadership claim opportunity');
    }
    if (!marketPositions.includes('disruptor' as any)) {
      positioningGaps.push('Disruptor/innovation positioning');
    }

    return {
      emotionalGaps: emotionalGaps.slice(0, 3),
      voiceOpportunities: voiceOpportunities.slice(0, 3),
      persuasionGaps: persuasionGaps.slice(0, 3),
      positioningGaps: positioningGaps.slice(0, 3)
    };
  }

  /**
   * Generate voice description string
   */
  private generateVoiceDescription(
    personality: BrandPersonalityTrait[],
    avgFormality: number,
    consistency: number
  ): string {
    const formalityLabel = avgFormality >= 7 ? 'formal' :
      avgFormality >= 5 ? 'professional' :
      avgFormality >= 3 ? 'conversational' : 'casual';

    const personalityLabels: Record<BrandPersonalityTrait, string> = {
      [BrandPersonalityTrait.SINCERITY]: 'sincere',
      [BrandPersonalityTrait.EXCITEMENT]: 'exciting',
      [BrandPersonalityTrait.COMPETENCE]: 'competent',
      [BrandPersonalityTrait.SOPHISTICATION]: 'sophisticated',
      [BrandPersonalityTrait.RUGGEDNESS]: 'rugged'
    };

    const consistencyLabel = consistency >= 0.8 ? 'highly consistent' :
      consistency >= 0.5 ? 'moderately consistent' : 'varied';

    if (personality.length === 0) {
      return `${formalityLabel.charAt(0).toUpperCase() + formalityLabel.slice(1)}, ${consistencyLabel} voice without strong personality differentiation.`;
    }

    const primaryPersonality = personalityLabels[personality[0]];
    return `${formalityLabel.charAt(0).toUpperCase() + formalityLabel.slice(1)}, ${primaryPersonality} voice that is ${consistencyLabel} across ads.`;
  }

  /**
   * Describe persuasion style
   */
  private describePersuasionStyle(techniques: PersuasionTechnique[], avgPressure: number): string {
    if (techniques.length === 0) {
      return 'Minimal overt persuasion; relies on value communication';
    }

    const pressureLabel = avgPressure >= 7 ? 'high-pressure' :
      avgPressure >= 4 ? 'moderate' : 'soft-sell';

    const techniqueLabels: Record<PersuasionTechnique, string> = {
      [PersuasionTechnique.SCARCITY]: 'scarcity',
      [PersuasionTechnique.SOCIAL_PROOF]: 'social proof',
      [PersuasionTechnique.AUTHORITY]: 'authority',
      [PersuasionTechnique.RECIPROCITY]: 'reciprocity',
      [PersuasionTechnique.COMMITMENT]: 'commitment',
      [PersuasionTechnique.LIKING]: 'rapport',
      [PersuasionTechnique.URGENCY]: 'urgency',
      [PersuasionTechnique.FOMO]: 'FOMO',
      [PersuasionTechnique.ANCHORING]: 'anchoring',
      [PersuasionTechnique.EXCLUSIVITY]: 'exclusivity'
    };

    const topTechniques = techniques.slice(0, 2).map(t => techniqueLabels[t]).join(' and ');
    return `${pressureLabel.charAt(0).toUpperCase() + pressureLabel.slice(1)} approach emphasizing ${topTechniques}`;
  }

  /**
   * Generate summary recommendations
   */
  private generateSummaryRecommendations(
    dominantEmotion: EmotionType,
    techniques: PersuasionTechnique[],
    voiceProfile: VoiceProfile,
    posture: CompetitivePosture,
    opportunities: StrategicOpportunities
  ): string[] {
    const recommendations: string[] = [];

    // Opportunity-based recommendations
    if (opportunities.emotionalGaps.length > 0) {
      recommendations.push(`Differentiate with ${opportunities.emotionalGaps[0].toLowerCase()} that competitor underutilizes`);
    }

    if (opportunities.persuasionGaps.length > 0) {
      recommendations.push(`Add ${opportunities.persuasionGaps[0].toLowerCase()} to your persuasion mix`);
    }

    if (opportunities.voiceOpportunities.length > 0) {
      recommendations.push(`Develop ${opportunities.voiceOpportunities[0].toLowerCase()} to stand out`);
    }

    // Counter-positioning recommendations
    if (posture.threatLevel === 'high') {
      recommendations.push('Prepare defensive positioning as competitor shows aggressive competitive stance');
    }

    // Voice consistency recommendation
    if (voiceProfile.consistencyScore < 0.5) {
      recommendations.push('Competitor has inconsistent voice - opportunity to own clear brand position');
    }

    // Emotional strategy recommendations
    if (dominantEmotion === EmotionType.FEAR) {
      recommendations.push('Counter fear-based messaging with empowering, positive positioning');
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Generate top insights from analyses
   */
  private generateTopInsights(analyses: SentimentAnalysis[]): string[] {
    const insights: string[] = [];

    // Collect all insights from individual analyses
    for (const analysis of analyses) {
      if (analysis.strategicInsights.keyStrengths.length > 0) {
        insights.push(`Strength: ${analysis.strategicInsights.keyStrengths[0]}`);
      }
      if (analysis.strategicInsights.keyWeaknesses.length > 0) {
        insights.push(`Weakness: ${analysis.strategicInsights.keyWeaknesses[0]}`);
      }
    }

    // Deduplicate and limit
    const unique = [...new Set(insights)];
    return unique.slice(0, 5);
  }

  /**
   * Create empty analysis for invalid input
   */
  private createEmptyAnalysis(text: string): SentimentAnalysis {
    return {
      text,
      analyzedAt: new Date().toISOString(),
      overall: { sentiment: 'neutral', score: 0, confidence: 0 },
      emotions: {
        primary: EmotionType.TRUST,
        secondary: [],
        intensityScore: 1,
        emotionalArc: 'flat' as any,
        emotionBreakdown: {} as Record<EmotionType, number>,
        dominantPolarity: 'mixed'
      },
      persuasion: {
        techniques: [],
        intensityLevel: 'light',
        primaryTechnique: null,
        techniqueCount: 0,
        pressureScore: 1,
        detectedPatterns: []
      },
      tone: {
        formality: 'conversational' as any,
        formalityScore: 5,
        voiceCharacteristics: { authority: 5, urgency: 5, empathy: 5, confidence: 5, exclusivity: 5, warmth: 5 },
        brandPersonality: [],
        primaryPersonality: null,
        voiceSummary: 'Insufficient text for analysis.'
      },
      framing: {
        primaryFrame: 'balanced',
        framingStyle: 'gain' as any,
        timeOrientation: 'present',
        focusType: 'balanced',
        framingSignals: []
      },
      triggers: {
        detected: [],
        primaryTrigger: null,
        triggerIntensity: {} as Record<PsychologicalTrigger, number>,
        triggerSignals: []
      },
      positioning: {
        aggressiveness: 'passive' as any,
        marketPosition: 'unknown' as any,
        competitiveSignals: [],
        comparisonMentions: [],
        positioningScore: 1
      },
      strategicInsights: this.createEmptyInsights(),
      metadata: {
        wordCount: 0,
        sentenceCount: 0,
        analysisVersion: ANALYSIS_VERSION,
        processingTimeMs: 0
      }
    };
  }

  /**
   * Create empty insights
   */
  private createEmptyInsights() {
    return {
      emotionalStrategy: 'Insufficient data for analysis',
      persuasionApproach: 'Insufficient data for analysis',
      brandVoiceSummary: 'Insufficient data for analysis',
      competitivePosture: 'Insufficient data for analysis',
      keyStrengths: [],
      keyWeaknesses: [],
      recommendations: []
    };
  }

  /**
   * Create empty summary
   */
  private createEmptySummary(competitor: string): SentimentSummary {
    return {
      competitor,
      adsAnalyzed: 0,
      analysisDate: new Date().toISOString(),
      dominantEmotion: EmotionType.TRUST,
      emotionDistribution: {} as Record<EmotionType, number>,
      avgEmotionalIntensity: 0,
      emotionalConsistency: 0,
      mostUsedTechniques: [],
      techniqueDistribution: {} as Record<PersuasionTechnique, number>,
      avgPressureScore: 0,
      persuasionStyle: 'No data',
      brandVoiceProfile: {
        personality: [],
        consistencyScore: 0,
        avgFormality: 5,
        voiceDescription: 'No data',
        dominantTraits: []
      },
      framingPatterns: {
        dominantFrame: 'balanced',
        dominantStyle: FramingStyle.GAIN,
        frameDistribution: { positive: 0, negative: 0, balanced: 0 }
      },
      dominantTriggers: [],
      triggerDistribution: {} as Record<PsychologicalTrigger, number>,
      competitivePosture: {
        aggressivenessLevel: 'passive',
        positioningStrategy: 'unknown',
        threatLevel: 'low',
        competitiveIntensity: 0
      },
      opportunities: {
        emotionalGaps: [],
        voiceOpportunities: [],
        persuasionGaps: [],
        positioningGaps: []
      },
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      avgSentimentScore: 0,
      recommendations: [],
      topInsights: [],
      metadata: {
        analysisVersion: ANALYSIS_VERSION,
        totalProcessingTimeMs: 0
      }
    };
  }
}

// Export sub-analyzers for direct use
export { EmotionAnalyzer, analyzeEmotions } from './emotion-analyzer';
export { PersuasionAnalyzer, analyzePersuasion } from './persuasion-analyzer';
export { ToneAnalyzer, analyzeTone } from './tone-analyzer';
export { FramingAnalyzer, analyzeFraming } from './framing-analyzer';
export { TriggerAnalyzer, analyzeTriggers } from './trigger-analyzer';
export { PositioningAnalyzer, analyzePositioning } from './positioning-analyzer';
export { InsightsGenerator, generateInsights } from './insights-generator';

/**
 * Convenience function: analyze sentiment of text
 */
export function analyzeSentiment(text: string, options?: SentimentAnalysisOptions): SentimentAnalysis {
  const analyzer = new SentimentAnalyzer();
  return analyzer.analyze(text, options);
}

/**
 * Convenience function: analyze sentiment of ads
 */
export function analyzeAdsSentiment(ads: Ad[], options?: SentimentAnalysisOptions): SentimentAnalysis[] {
  const analyzer = new SentimentAnalyzer();
  return analyzer.analyzeAds(ads, options);
}

/**
 * Convenience function: full competitor sentiment analysis
 */
export function analyzeCompetitorSentiment(
  competitor: string,
  ads: Ad[],
  options?: SentimentAnalysisOptions
): { analyses: SentimentAnalysis[]; summary: SentimentSummary } {
  const analyzer = new SentimentAnalyzer();
  return analyzer.analyzeCompetitor(competitor, ads, options);
}
