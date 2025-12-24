/**
 * Emotion Analyzer Module
 *
 * Detects and quantifies emotions in ad copy using Plutchik's Wheel of Emotions.
 * Returns primary/secondary emotions, intensity scores, and emotional arc patterns.
 */

import {
  EmotionType,
  EmotionAnalysis,
  EmotionalArc,
  EmotionLexiconEntry
} from '../../types/sentiment';
import {
  emotionLexicon,
  intensityModifiers,
  sentimentWeights
} from '../../config/sentiment-lexicons';

// Emotion polarity classification
const POSITIVE_EMOTIONS = [EmotionType.JOY, EmotionType.TRUST, EmotionType.ANTICIPATION];
const NEGATIVE_EMOTIONS = [EmotionType.FEAR, EmotionType.SADNESS, EmotionType.ANGER, EmotionType.DISGUST];
const NEUTRAL_EMOTIONS = [EmotionType.SURPRISE];

export class EmotionAnalyzer {
  private lexicon = emotionLexicon;

  /**
   * Analyze emotions in text
   */
  analyze(text: string): EmotionAnalysis {
    const normalizedText = this.normalizeText(text);
    const words = this.tokenize(normalizedText);
    const sentences = this.splitSentences(text);

    // Score each emotion
    const emotionScores = this.scoreEmotions(normalizedText, words);

    // Determine primary and secondary emotions
    const sortedEmotions = this.getSortedEmotions(emotionScores);
    const primary = sortedEmotions[0]?.emotion || EmotionType.TRUST;
    const secondary = sortedEmotions
      .slice(1, 3)
      .filter(e => e.score > 0)
      .map(e => e.emotion);

    // Calculate intensity
    const intensityScore = this.calculateIntensity(normalizedText, words, emotionScores);

    // Detect emotional arc
    const emotionalArc = this.detectEmotionalArc(sentences);

    // Determine dominant polarity
    const dominantPolarity = this.getDominantPolarity(emotionScores);

    // Build emotion breakdown as percentages
    const totalScore = Object.values(emotionScores).reduce((a, b) => a + b, 0) || 1;
    const emotionBreakdown = Object.fromEntries(
      Object.entries(emotionScores).map(([emotion, score]) => [
        emotion as EmotionType,
        Math.round((score / totalScore) * 100) / 100
      ])
    ) as Record<EmotionType, number>;

    return {
      primary,
      secondary,
      intensityScore,
      emotionalArc,
      emotionBreakdown,
      dominantPolarity
    };
  }

  /**
   * Normalize text for analysis
   */
  private normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^\w\s''-]/g, ' ');
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(word => word.length > 0);
  }

  /**
   * Split text into sentences
   */
  private splitSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  /**
   * Score each emotion based on lexicon matches
   */
  private scoreEmotions(text: string, words: string[]): Record<EmotionType, number> {
    const scores: Record<EmotionType, number> = {
      [EmotionType.JOY]: 0,
      [EmotionType.TRUST]: 0,
      [EmotionType.FEAR]: 0,
      [EmotionType.SURPRISE]: 0,
      [EmotionType.ANTICIPATION]: 0,
      [EmotionType.SADNESS]: 0,
      [EmotionType.ANGER]: 0,
      [EmotionType.DISGUST]: 0
    };

    // Check each emotion's lexicon
    for (const [emotion, lexiconEntry] of Object.entries(this.lexicon) as [EmotionType, EmotionLexiconEntry][]) {
      // Strong words (3 points)
      for (const word of lexiconEntry.strong) {
        if (this.containsWord(text, word)) {
          scores[emotion] += sentimentWeights.emotion.strong;
        }
      }

      // Moderate words (2 points)
      for (const word of lexiconEntry.moderate) {
        if (this.containsWord(text, word)) {
          scores[emotion] += sentimentWeights.emotion.moderate;
        }
      }

      // Mild words (1 point)
      for (const word of lexiconEntry.mild) {
        if (this.containsWord(text, word)) {
          scores[emotion] += sentimentWeights.emotion.mild;
        }
      }
    }

    // Apply intensity modifiers
    this.applyIntensityModifiers(text, scores);

    return scores;
  }

  /**
   * Check if text contains a word (with word boundaries)
   */
  private containsWord(text: string, word: string): boolean {
    const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
    return regex.test(text);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Apply intensity modifiers (amplifiers increase scores, downtoners decrease)
   */
  private applyIntensityModifiers(text: string, scores: Record<EmotionType, number>): void {
    const hasAmplifier = intensityModifiers.amplifiers.some(amp =>
      this.containsWord(text, amp)
    );
    const hasDowntoner = intensityModifiers.downtoners.some(down =>
      this.containsWord(text, down)
    );

    if (hasAmplifier) {
      for (const emotion of Object.keys(scores) as EmotionType[]) {
        scores[emotion] *= sentimentWeights.intensity.amplifier;
      }
    }

    if (hasDowntoner) {
      for (const emotion of Object.keys(scores) as EmotionType[]) {
        scores[emotion] *= sentimentWeights.intensity.downtoner;
      }
    }
  }

  /**
   * Get emotions sorted by score (descending)
   */
  private getSortedEmotions(scores: Record<EmotionType, number>): Array<{ emotion: EmotionType; score: number }> {
    return Object.entries(scores)
      .map(([emotion, score]) => ({ emotion: emotion as EmotionType, score }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate overall emotional intensity (1-10 scale)
   */
  private calculateIntensity(
    text: string,
    words: string[],
    scores: Record<EmotionType, number>
  ): number {
    // Base intensity from total emotion score
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const wordCount = words.length || 1;
    const normalizedScore = totalScore / wordCount;

    // Check for intensity markers
    let intensityBoost = 0;

    // Exclamation marks
    const exclamationCount = (text.match(/!/g) || []).length;
    intensityBoost += Math.min(exclamationCount * 0.5, 2);

    // ALL CAPS words
    const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
    intensityBoost += Math.min(capsWords * 0.3, 1.5);

    // Amplifiers
    const amplifierCount = intensityModifiers.amplifiers.filter(amp =>
      this.containsWord(text.toLowerCase(), amp)
    ).length;
    intensityBoost += amplifierCount * 0.5;

    // Calculate final intensity (1-10 scale)
    const rawIntensity = (normalizedScore * 10) + intensityBoost;
    return Math.max(1, Math.min(10, Math.round(rawIntensity * 10) / 10));
  }

  /**
   * Detect the emotional arc pattern in the text
   */
  private detectEmotionalArc(sentences: string[]): EmotionalArc {
    if (sentences.length < 2) {
      return EmotionalArc.FLAT;
    }

    // Analyze emotion in first half vs second half
    const midpoint = Math.floor(sentences.length / 2);
    const firstHalf = sentences.slice(0, midpoint).join(' ');
    const secondHalf = sentences.slice(midpoint).join(' ');

    const firstScores = this.scoreEmotions(
      this.normalizeText(firstHalf),
      this.tokenize(this.normalizeText(firstHalf))
    );
    const secondScores = this.scoreEmotions(
      this.normalizeText(secondHalf),
      this.tokenize(this.normalizeText(secondHalf))
    );

    const firstPolarity = this.calculatePolarity(firstScores);
    const secondPolarity = this.calculatePolarity(secondScores);

    // Detect arc patterns
    const firstHasNegative = this.hasSignificantNegative(firstScores);
    const secondHasPositive = this.hasSignificantPositive(secondScores);
    const firstHasFear = firstScores[EmotionType.FEAR] > 2;
    const secondHasTrust = secondScores[EmotionType.TRUST] > 2;
    const firstHasSurprise = firstScores[EmotionType.SURPRISE] > 2;
    const secondHasJoy = secondScores[EmotionType.JOY] > 2;

    // Problem -> Solution: Starts negative (sadness/anger/fear), ends positive (joy/trust)
    if (firstHasNegative && secondHasPositive) {
      return EmotionalArc.PROBLEM_SOLUTION;
    }

    // Fear -> Trust: Starts with fear, ends with trust
    if (firstHasFear && secondHasTrust) {
      return EmotionalArc.FEAR_TRUST;
    }

    // Curiosity -> Satisfaction: Starts with surprise/anticipation, ends with joy
    if (firstHasSurprise && secondHasJoy) {
      return EmotionalArc.CURIOSITY_SATISFACTION;
    }

    // Aspiration -> Action: Starts positive (anticipation/joy), stays positive
    const firstHasAnticipation = firstScores[EmotionType.ANTICIPATION] > 2;
    if (firstHasAnticipation && secondHasPositive) {
      return EmotionalArc.ASPIRATION_ACTION;
    }

    return EmotionalArc.FLAT;
  }

  /**
   * Calculate overall polarity score
   */
  private calculatePolarity(scores: Record<EmotionType, number>): number {
    const positiveScore = POSITIVE_EMOTIONS.reduce((sum, e) => sum + scores[e], 0);
    const negativeScore = NEGATIVE_EMOTIONS.reduce((sum, e) => sum + scores[e], 0);
    return positiveScore - negativeScore;
  }

  /**
   * Check if there's significant negative emotion
   */
  private hasSignificantNegative(scores: Record<EmotionType, number>): boolean {
    return NEGATIVE_EMOTIONS.some(e => scores[e] > 2);
  }

  /**
   * Check if there's significant positive emotion
   */
  private hasSignificantPositive(scores: Record<EmotionType, number>): boolean {
    return POSITIVE_EMOTIONS.some(e => scores[e] > 2);
  }

  /**
   * Determine dominant polarity
   */
  private getDominantPolarity(scores: Record<EmotionType, number>): 'positive' | 'negative' | 'mixed' {
    const positiveScore = POSITIVE_EMOTIONS.reduce((sum, e) => sum + scores[e], 0);
    const negativeScore = NEGATIVE_EMOTIONS.reduce((sum, e) => sum + scores[e], 0);

    if (positiveScore > negativeScore * 1.5) {
      return 'positive';
    } else if (negativeScore > positiveScore * 1.5) {
      return 'negative';
    }
    return 'mixed';
  }
}

/**
 * Quick emotion analysis
 */
export function analyzeEmotions(text: string): EmotionAnalysis {
  const analyzer = new EmotionAnalyzer();
  return analyzer.analyze(text);
}
