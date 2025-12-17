/**
 * Competitive Positioning Analyzer Module
 *
 * Analyzes how aggressively competitors position against alternatives
 * and what market position they claim.
 */

import {
  PositioningAnalysis,
  PositioningAggressiveness,
  MarketPosition
} from '../../types/sentiment';
import { positioningPatterns } from '../../config/sentiment-lexicons';

export class PositioningAnalyzer {
  private patterns = positioningPatterns;

  /**
   * Analyze competitive positioning in text
   */
  analyze(text: string): PositioningAnalysis {
    const normalizedText = text.toLowerCase();

    // Detect positioning signals
    const { signals, comparisonMentions, positionSignals } = this.detectPositioningSignals(text);

    // Determine aggressiveness
    const aggressiveness = this.determineAggressiveness(signals, comparisonMentions);

    // Determine market position
    const marketPosition = this.determineMarketPosition(positionSignals);

    // Calculate positioning score (1-10)
    const positioningScore = this.calculatePositioningScore(signals, aggressiveness);

    return {
      aggressiveness,
      marketPosition,
      competitiveSignals: signals,
      comparisonMentions,
      positioningScore
    };
  }

  /**
   * Detect all positioning signals in text
   */
  private detectPositioningSignals(text: string): {
    signals: string[];
    comparisonMentions: string[];
    positionSignals: { position: MarketPosition; matches: string[] }[];
  } {
    const signals: string[] = [];
    const comparisonMentions: string[] = [];
    const positionSignals: { position: MarketPosition; matches: string[] }[] = [];

    // Check leader positioning
    const leaderMatches: string[] = [];
    for (const pattern of this.patterns.leader) {
      const match = text.match(pattern);
      if (match) {
        signals.push(`Leader positioning: "${match[0]}"`);
        leaderMatches.push(match[0]);
      }
    }
    if (leaderMatches.length > 0) {
      positionSignals.push({ position: MarketPosition.LEADER, matches: leaderMatches });
    }

    // Check challenger positioning
    const challengerMatches: string[] = [];
    for (const pattern of this.patterns.challenger) {
      const match = text.match(pattern);
      if (match) {
        signals.push(`Challenger positioning: "${match[0]}"`);
        challengerMatches.push(match[0]);
        comparisonMentions.push(match[0]);
      }
    }
    if (challengerMatches.length > 0) {
      positionSignals.push({ position: MarketPosition.CHALLENGER, matches: challengerMatches });
    }

    // Check niche positioning
    const nicheMatches: string[] = [];
    for (const pattern of this.patterns.niche) {
      const match = text.match(pattern);
      if (match) {
        signals.push(`Niche positioning: "${match[0]}"`);
        nicheMatches.push(match[0]);
      }
    }
    if (nicheMatches.length > 0) {
      positionSignals.push({ position: MarketPosition.NICHE, matches: nicheMatches });
    }

    // Check disruptor positioning
    const disruptorMatches: string[] = [];
    for (const pattern of this.patterns.disruptor) {
      const match = text.match(pattern);
      if (match) {
        signals.push(`Disruptor positioning: "${match[0]}"`);
        disruptorMatches.push(match[0]);
      }
    }
    if (disruptorMatches.length > 0) {
      positionSignals.push({ position: MarketPosition.DISRUPTOR, matches: disruptorMatches });
    }

    // Additional competitive comparison detection
    const comparisonPatterns = [
      /\bvs\.?\s+\w+/gi,
      /\bversus\s+\w+/gi,
      /unlike\s+\w+/gi,
      /better\s+than\s+\w+/gi,
      /switch\s+from\s+\w+/gi,
      /alternative\s+to\s+\w+/gi,
      /compared\s+to\s+\w+/gi,
      /instead\s+of\s+\w+/gi
    ];

    for (const pattern of comparisonPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        comparisonMentions.push(...matches);
      }
    }

    return { signals, comparisonMentions, positionSignals };
  }

  /**
   * Determine positioning aggressiveness
   */
  private determineAggressiveness(
    signals: string[],
    comparisonMentions: string[]
  ): PositioningAggressiveness {
    // No positioning signals = passive
    if (signals.length === 0 && comparisonMentions.length === 0) {
      return PositioningAggressiveness.PASSIVE;
    }

    // Count different types of signals
    const hasLeader = signals.some(s => s.includes('Leader'));
    const hasChallenger = signals.some(s => s.includes('Challenger'));
    const hasDisruptor = signals.some(s => s.includes('Disruptor'));
    const hasDirectComparison = comparisonMentions.length > 0;

    // Multiple comparison mentions or explicit competitor callouts = aggressive
    if (comparisonMentions.length >= 2 || (hasChallenger && hasDirectComparison)) {
      return PositioningAggressiveness.AGGRESSIVE;
    }

    // Direct comparisons without naming competitors = comparative
    if (hasDirectComparison || hasChallenger || hasDisruptor) {
      return PositioningAggressiveness.COMPARATIVE;
    }

    // Just claiming leadership or differentiation = implicit
    if (hasLeader || signals.length > 0) {
      return PositioningAggressiveness.IMPLICIT;
    }

    return PositioningAggressiveness.PASSIVE;
  }

  /**
   * Determine claimed market position
   */
  private determineMarketPosition(
    positionSignals: { position: MarketPosition; matches: string[] }[]
  ): MarketPosition {
    if (positionSignals.length === 0) {
      return MarketPosition.UNKNOWN;
    }

    // Sort by number of matches
    const sorted = positionSignals.sort((a, b) => b.matches.length - a.matches.length);
    return sorted[0].position;
  }

  /**
   * Calculate positioning score (1-10)
   * Higher score = more aggressive/pronounced positioning
   */
  private calculatePositioningScore(
    signals: string[],
    aggressiveness: PositioningAggressiveness
  ): number {
    // Base score from aggressiveness level
    const baseScores: Record<PositioningAggressiveness, number> = {
      [PositioningAggressiveness.PASSIVE]: 1,
      [PositioningAggressiveness.IMPLICIT]: 3,
      [PositioningAggressiveness.COMPARATIVE]: 6,
      [PositioningAggressiveness.AGGRESSIVE]: 8
    };

    let score = baseScores[aggressiveness];

    // Add points for number of positioning signals
    score += Math.min(signals.length * 0.5, 2);

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Get aggressiveness description
   */
  static getAggressivenessDescription(level: PositioningAggressiveness): string {
    const descriptions: Record<PositioningAggressiveness, string> = {
      [PositioningAggressiveness.PASSIVE]: 'No direct competitive positioning; focuses purely on own value',
      [PositioningAggressiveness.IMPLICIT]: 'Subtly positions against alternatives without naming them',
      [PositioningAggressiveness.COMPARATIVE]: 'Makes direct comparisons to competitor categories or unnamed alternatives',
      [PositioningAggressiveness.AGGRESSIVE]: 'Directly challenges competitors by name or with explicit attack messaging'
    };
    return descriptions[level];
  }

  /**
   * Get market position description
   */
  static getMarketPositionDescription(position: MarketPosition): string {
    const descriptions: Record<MarketPosition, string> = {
      [MarketPosition.LEADER]: 'Claims market leadership; positions as #1 or most trusted choice',
      [MarketPosition.CHALLENGER]: 'Positions as the better alternative to established players',
      [MarketPosition.NICHE]: 'Specializes for a specific audience or use case',
      [MarketPosition.DISRUPTOR]: 'Claims to be changing the game or revolutionizing the industry',
      [MarketPosition.UNKNOWN]: 'No clear market position signals detected'
    };
    return descriptions[position];
  }
}

/**
 * Quick positioning analysis
 */
export function analyzePositioning(text: string): PositioningAnalysis {
  const analyzer = new PositioningAnalyzer();
  return analyzer.analyze(text);
}
