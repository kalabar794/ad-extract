/**
 * Tone & Voice Analyzer Module
 *
 * Analyzes formality level, voice characteristics, and brand personality
 * traits in ad copy to understand brand positioning and communication style.
 */

import {
  ToneAnalysis,
  FormalityLevel,
  BrandPersonalityTrait,
  VoiceCharacteristics
} from '../../types/sentiment';
import {
  formalityMarkers,
  brandPersonalityMarkers
} from '../../config/sentiment-lexicons';

export class ToneAnalyzer {
  /**
   * Analyze tone and voice in text
   */
  analyze(text: string): ToneAnalysis {
    const normalizedText = text.toLowerCase();

    // Analyze formality
    const { formality, formalityScore } = this.analyzeFormality(text);

    // Analyze voice characteristics
    const voiceCharacteristics = this.analyzeVoiceCharacteristics(text);

    // Detect brand personality traits
    const { traits, primaryTrait } = this.detectBrandPersonality(text);

    // Generate voice summary
    const voiceSummary = this.generateVoiceSummary(
      formality,
      voiceCharacteristics,
      traits,
      primaryTrait
    );

    return {
      formality,
      formalityScore,
      voiceCharacteristics,
      brandPersonality: traits,
      primaryPersonality: primaryTrait,
      voiceSummary
    };
  }

  /**
   * Analyze formality level
   */
  private analyzeFormality(text: string): { formality: FormalityLevel; formalityScore: number } {
    const normalizedText = text.toLowerCase();
    const scores: Record<string, number> = {
      casual: 0,
      conversational: 0,
      professional: 0,
      formal: 0
    };

    // Check each formality level's markers
    for (const [level, markers] of Object.entries(formalityMarkers)) {
      // Check patterns
      for (const pattern of markers.patterns) {
        if (pattern.test(text)) {
          scores[level] += 2;
        }
      }

      // Check keywords
      for (const keyword of markers.keywords) {
        if (normalizedText.includes(keyword)) {
          scores[level] += 1;
        }
      }
    }

    // Additional signals
    // Contractions indicate casual/conversational
    const contractionCount = (text.match(/\b\w+[']\w+\b/g) || []).length;
    if (contractionCount > 0) {
      scores.casual += contractionCount * 0.5;
      scores.conversational += contractionCount * 0.3;
    }

    // Emojis indicate casual
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu) || []).length;
    if (emojiCount > 0) {
      scores.casual += emojiCount;
    }

    // Long sentences and passive voice indicate formal
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / (sentences.length || 1);
    if (avgSentenceLength > 20) {
      scores.formal += 2;
      scores.professional += 1;
    }

    // Determine winning level
    const sortedLevels = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const formality = sortedLevels[0][0] as FormalityLevel;

    // Calculate formality score (1-10, where 1=casual, 10=formal)
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    const formalityScore = Math.round(
      (scores.formal * 10 + scores.professional * 7 + scores.conversational * 4 + scores.casual * 1) /
      totalScore * 10
    ) / 10;

    return {
      formality,
      formalityScore: Math.max(1, Math.min(10, formalityScore))
    };
  }

  /**
   * Analyze voice characteristics (1-10 scale each)
   */
  private analyzeVoiceCharacteristics(text: string): VoiceCharacteristics {
    const normalizedText = text.toLowerCase();

    return {
      authority: this.scoreAuthority(normalizedText),
      urgency: this.scoreUrgency(normalizedText),
      empathy: this.scoreEmpathy(normalizedText),
      confidence: this.scoreConfidence(normalizedText),
      exclusivity: this.scoreExclusivity(normalizedText),
      warmth: this.scoreWarmth(normalizedText)
    };
  }

  /**
   * Score authority voice (expert, commanding)
   */
  private scoreAuthority(text: string): number {
    let score = 5; // Neutral baseline

    const authorityMarkers = [
      'expert', 'proven', 'research', 'study', 'data', 'statistics',
      'certified', 'professional', 'industry', 'leading', 'award',
      'years of experience', 'specialist', 'authority', 'official'
    ];

    for (const marker of authorityMarkers) {
      if (text.includes(marker)) {
        score += 0.8;
      }
    }

    // Numbers and statistics boost authority
    if (/\d+%|\d+\s*(years?|studies|experts?)/i.test(text)) {
      score += 1;
    }

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Score urgency voice (time-sensitive)
   */
  private scoreUrgency(text: string): number {
    let score = 3; // Low baseline

    const urgencyMarkers = [
      'now', 'today', 'hurry', 'fast', 'quick', 'limited', 'expires',
      'deadline', 'last chance', 'act', 'immediately', 'urgent',
      'don\'t wait', 'ending soon', 'while supplies last'
    ];

    for (const marker of urgencyMarkers) {
      if (text.includes(marker)) {
        score += 1;
      }
    }

    // Exclamation marks add urgency
    const exclamations = (text.match(/!/g) || []).length;
    score += Math.min(exclamations * 0.5, 2);

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Score empathy voice (customer-focused)
   */
  private scoreEmpathy(text: string): number {
    let score = 5; // Neutral baseline

    const empathyMarkers = [
      'you', 'your', 'understand', 'know how', 'feel', 'struggle',
      'we get it', 'been there', 'care', 'help you', 'for you',
      'support', 'together', 'listen', 'hear you'
    ];

    for (const marker of empathyMarkers) {
      if (text.includes(marker)) {
        score += 0.5;
      }
    }

    // "You" focused copy scores higher
    const youCount = (text.match(/\byou(r)?\b/gi) || []).length;
    const weCount = (text.match(/\bwe\b/gi) || []).length;
    if (youCount > weCount * 2) {
      score += 1.5;
    }

    // Questions show engagement
    const questions = (text.match(/\?/g) || []).length;
    score += Math.min(questions * 0.3, 1);

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Score confidence voice (assertive)
   */
  private scoreConfidence(text: string): number {
    let score = 5; // Neutral baseline

    const confidenceMarkers = [
      'guaranteed', 'proven', 'best', 'leading', '#1', 'top',
      'will', 'definitely', 'absolutely', 'certainly', 'always',
      'never fail', 'no doubt', 'sure', 'confident'
    ];

    const hedgingMarkers = [
      'might', 'maybe', 'perhaps', 'possibly', 'could', 'may',
      'sometimes', 'often', 'usually', 'generally', 'tend to'
    ];

    for (const marker of confidenceMarkers) {
      if (text.includes(marker)) {
        score += 0.8;
      }
    }

    for (const marker of hedgingMarkers) {
      if (text.includes(marker)) {
        score -= 0.5;
      }
    }

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Score exclusivity voice (premium vs mass market)
   */
  private scoreExclusivity(text: string): number {
    let score = 5; // Neutral baseline

    const exclusiveMarkers = [
      'exclusive', 'premium', 'luxury', 'elite', 'vip', 'select',
      'limited edition', 'members only', 'invitation', 'private',
      'bespoke', 'curated', 'handpicked', 'rare'
    ];

    const massMarketMarkers = [
      'everyone', 'anybody', 'affordable', 'budget', 'cheap',
      'for all', 'accessible', 'free', 'no cost'
    ];

    for (const marker of exclusiveMarkers) {
      if (text.includes(marker)) {
        score += 1;
      }
    }

    for (const marker of massMarketMarkers) {
      if (text.includes(marker)) {
        score -= 0.5;
      }
    }

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Score warmth voice (friendly vs distant)
   */
  private scoreWarmth(text: string): number {
    let score = 5; // Neutral baseline

    const warmthMarkers = [
      'friend', 'family', 'love', 'care', 'heart', 'warm',
      'welcome', 'happy', 'smile', 'enjoy', 'fun', 'together',
      'hey', 'hi', 'thanks', 'thank you', 'appreciate'
    ];

    const distantMarkers = [
      'hereby', 'pursuant', 'accordingly', 'therefore',
      'notwithstanding', 'whereas', 'henceforth'
    ];

    for (const marker of warmthMarkers) {
      if (text.includes(marker)) {
        score += 0.7;
      }
    }

    for (const marker of distantMarkers) {
      if (text.includes(marker)) {
        score -= 1;
      }
    }

    // Emojis add warmth
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu) || []).length;
    score += Math.min(emojiCount * 0.5, 2);

    // Contractions add warmth
    const contractionCount = (text.match(/\b\w+[']\w+\b/g) || []).length;
    score += Math.min(contractionCount * 0.2, 1);

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Detect brand personality traits
   */
  private detectBrandPersonality(text: string): {
    traits: BrandPersonalityTrait[];
    primaryTrait: BrandPersonalityTrait | null;
  } {
    const normalizedText = text.toLowerCase();
    const traitScores: Record<BrandPersonalityTrait, number> = {
      [BrandPersonalityTrait.SINCERITY]: 0,
      [BrandPersonalityTrait.EXCITEMENT]: 0,
      [BrandPersonalityTrait.COMPETENCE]: 0,
      [BrandPersonalityTrait.SOPHISTICATION]: 0,
      [BrandPersonalityTrait.RUGGEDNESS]: 0
    };

    // Score each trait
    for (const [trait, markers] of Object.entries(brandPersonalityMarkers) as [BrandPersonalityTrait, typeof brandPersonalityMarkers[BrandPersonalityTrait]][]) {
      // Check patterns
      for (const pattern of markers.patterns) {
        if (pattern.test(text)) {
          traitScores[trait] += 2;
        }
      }

      // Check keywords
      for (const keyword of markers.keywords) {
        if (normalizedText.includes(keyword)) {
          traitScores[trait] += 1;
        }
      }

      // Check voice indicators
      for (const indicator of markers.voiceIndicators) {
        if (normalizedText.includes(indicator)) {
          traitScores[trait] += 1.5;
        }
      }
    }

    // Get traits with significant scores
    const traits = Object.entries(traitScores)
      .filter(([_, score]) => score >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([trait]) => trait as BrandPersonalityTrait);

    // Primary trait is the highest scoring
    const primaryTrait = traits.length > 0 ? traits[0] : null;

    return { traits, primaryTrait };
  }

  /**
   * Generate human-readable voice summary
   */
  private generateVoiceSummary(
    formality: FormalityLevel,
    voice: VoiceCharacteristics,
    traits: BrandPersonalityTrait[],
    primaryTrait: BrandPersonalityTrait | null
  ): string {
    const parts: string[] = [];

    // Formality description
    const formalityDescriptions: Record<FormalityLevel, string> = {
      [FormalityLevel.CASUAL]: 'casual and approachable',
      [FormalityLevel.CONVERSATIONAL]: 'conversational and engaging',
      [FormalityLevel.PROFESSIONAL]: 'professional and polished',
      [FormalityLevel.FORMAL]: 'formal and authoritative'
    };
    parts.push(formalityDescriptions[formality]);

    // Key voice characteristics (top 2 highest scoring)
    const voiceEntries = Object.entries(voice).sort((a, b) => b[1] - a[1]);
    const topCharacteristics = voiceEntries.slice(0, 2).map(([name, score]) => {
      if (score >= 7) {
        return `highly ${name}`;
      } else if (score >= 5) {
        return `moderately ${name}`;
      }
      return null;
    }).filter(Boolean);

    if (topCharacteristics.length > 0) {
      parts.push(`with ${topCharacteristics.join(' and ')} tone`);
    }

    // Brand personality
    if (primaryTrait) {
      const traitDescriptions: Record<BrandPersonalityTrait, string> = {
        [BrandPersonalityTrait.SINCERITY]: 'sincere and trustworthy',
        [BrandPersonalityTrait.EXCITEMENT]: 'exciting and energetic',
        [BrandPersonalityTrait.COMPETENCE]: 'competent and reliable',
        [BrandPersonalityTrait.SOPHISTICATION]: 'sophisticated and refined',
        [BrandPersonalityTrait.RUGGEDNESS]: 'rugged and bold'
      };
      parts.push(`projecting a ${traitDescriptions[primaryTrait]} personality`);
    }

    return parts.join(', ').replace(/^./, s => s.toUpperCase()) + '.';
  }
}

/**
 * Quick tone analysis
 */
export function analyzeTone(text: string): ToneAnalysis {
  const analyzer = new ToneAnalyzer();
  return analyzer.analyze(text);
}
