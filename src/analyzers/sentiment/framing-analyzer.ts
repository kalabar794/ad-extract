/**
 * Framing Analyzer Module
 *
 * Analyzes how ad copy frames its value proposition - whether using
 * positive (gain-focused) or negative (loss-aversion) framing,
 * and the temporal orientation of the messaging.
 */

import {
  FramingAnalysis,
  FramingStyle
} from '../../types/sentiment';
import { framingPatterns } from '../../config/sentiment-lexicons';

export class FramingAnalyzer {
  private patterns = framingPatterns;

  /**
   * Analyze framing in text
   */
  analyze(text: string): FramingAnalysis {
    const normalizedText = text.toLowerCase();

    // Detect positive framing signals
    const positiveSignals = this.detectPositiveFraming(text, normalizedText);

    // Detect negative framing signals
    const negativeSignals = this.detectNegativeFraming(text, normalizedText);

    // Determine primary frame
    const primaryFrame = this.determinePrimaryFrame(positiveSignals, negativeSignals);

    // Determine framing style
    const framingStyle = this.determineFramingStyle(positiveSignals, negativeSignals);

    // Detect time orientation
    const timeOrientation = this.detectTimeOrientation(normalizedText);

    // Detect problem vs solution focus
    const focusType = this.detectFocusType(normalizedText);

    // Collect all framing signals
    const framingSignals = [
      ...positiveSignals.map(s => `[Positive] ${s}`),
      ...negativeSignals.map(s => `[Negative] ${s}`)
    ];

    return {
      primaryFrame,
      framingStyle,
      timeOrientation,
      focusType,
      framingSignals
    };
  }

  /**
   * Detect positive framing signals
   */
  private detectPositiveFraming(text: string, normalizedText: string): string[] {
    const signals: string[] = [];

    // Check gain framing patterns
    for (const pattern of this.patterns.positive.gain) {
      const match = text.match(pattern);
      if (match) {
        signals.push(`Gain: "${match[0]}"`);
      }
    }

    // Check opportunity framing patterns
    for (const pattern of this.patterns.positive.opportunity) {
      const match = text.match(pattern);
      if (match) {
        signals.push(`Opportunity: "${match[0]}"`);
      }
    }

    // Additional positive framing indicators
    const positiveIndicators = [
      { pattern: /\bwin\b|\bwinning\b/i, label: 'Win framing' },
      { pattern: /\bsuccess(ful)?\b/i, label: 'Success framing' },
      { pattern: /\bachieve\b|\baccomplish\b/i, label: 'Achievement framing' },
      { pattern: /\bgrow(th)?\b/i, label: 'Growth framing' },
      { pattern: /\bpositive\b|\boptimistic\b/i, label: 'Positive outlook' },
      { pattern: /\bbenefit(s)?\b/i, label: 'Benefit-focused' },
      { pattern: /\badvantage(s)?\b/i, label: 'Advantage-focused' }
    ];

    for (const { pattern, label } of positiveIndicators) {
      if (pattern.test(text)) {
        signals.push(label);
      }
    }

    return signals;
  }

  /**
   * Detect negative framing signals
   */
  private detectNegativeFraming(text: string, normalizedText: string): string[] {
    const signals: string[] = [];

    // Check loss framing patterns
    for (const pattern of this.patterns.negative.loss) {
      const match = text.match(pattern);
      if (match) {
        signals.push(`Loss: "${match[0]}"`);
      }
    }

    // Check risk framing patterns
    for (const pattern of this.patterns.negative.risk) {
      const match = text.match(pattern);
      if (match) {
        signals.push(`Risk: "${match[0]}"`);
      }
    }

    // Additional negative framing indicators
    const negativeIndicators = [
      { pattern: /\bfail(ure|ing|ed)?\b/i, label: 'Failure framing' },
      { pattern: /\bmistake(s)?\b/i, label: 'Mistake framing' },
      { pattern: /\berror(s)?\b/i, label: 'Error framing' },
      { pattern: /\bproblem(s)?\b/i, label: 'Problem framing' },
      { pattern: /\bpain\s*point(s)?\b/i, label: 'Pain point focus' },
      { pattern: /\bstruggl(e|ing)\b/i, label: 'Struggle framing' },
      { pattern: /\bfrustrat(ed|ing|ion)\b/i, label: 'Frustration framing' },
      { pattern: /\bwarn(ing)?\b/i, label: 'Warning framing' }
    ];

    for (const { pattern, label } of negativeIndicators) {
      if (pattern.test(text)) {
        signals.push(label);
      }
    }

    return signals;
  }

  /**
   * Determine primary frame (positive, negative, or balanced)
   */
  private determinePrimaryFrame(
    positiveSignals: string[],
    negativeSignals: string[]
  ): 'positive' | 'negative' | 'balanced' {
    const positiveScore = positiveSignals.length;
    const negativeScore = negativeSignals.length;

    if (positiveScore > negativeScore * 1.5) {
      return 'positive';
    } else if (negativeScore > positiveScore * 1.5) {
      return 'negative';
    }
    return 'balanced';
  }

  /**
   * Determine framing style
   */
  private determineFramingStyle(
    positiveSignals: string[],
    negativeSignals: string[]
  ): FramingStyle {
    // Count specific framing types
    const gainCount = positiveSignals.filter(s => s.includes('Gain') || s.includes('Win') || s.includes('Success')).length;
    const opportunityCount = positiveSignals.filter(s => s.includes('Opportunity') || s.includes('Growth')).length;
    const lossCount = negativeSignals.filter(s => s.includes('Loss') || s.includes('Fail')).length;
    const riskCount = negativeSignals.filter(s => s.includes('Risk') || s.includes('Problem') || s.includes('Warn')).length;

    const scores = {
      [FramingStyle.GAIN]: gainCount,
      [FramingStyle.OPPORTUNITY]: opportunityCount,
      [FramingStyle.LOSS]: lossCount,
      [FramingStyle.RISK]: riskCount
    };

    // Return highest scoring style
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return sorted[0][0] as FramingStyle;
  }

  /**
   * Detect time orientation
   */
  private detectTimeOrientation(text: string): 'present' | 'future' | 'past' {
    const presentIndicators = [
      'now', 'today', 'currently', 'right now', 'at this moment',
      'are you', 'do you', 'is your', 'this is'
    ];

    const futureIndicators = [
      'will', 'going to', 'soon', 'tomorrow', 'next', 'future',
      'imagine', 'picture', 'envision', 'become', 'achieve',
      'start your', 'begin your', 'unlock', 'discover'
    ];

    const pastIndicators = [
      'was', 'were', 'had', 'did', 'used to', 'before',
      'remember', 'back when', 'traditionally', 'since', 'established'
    ];

    let presentScore = 0;
    let futureScore = 0;
    let pastScore = 0;

    for (const indicator of presentIndicators) {
      if (text.includes(indicator)) presentScore++;
    }

    for (const indicator of futureIndicators) {
      if (text.includes(indicator)) futureScore++;
    }

    for (const indicator of pastIndicators) {
      if (text.includes(indicator)) pastScore++;
    }

    if (futureScore > presentScore && futureScore > pastScore) {
      return 'future';
    } else if (pastScore > presentScore && pastScore > futureScore) {
      return 'past';
    }
    return 'present';
  }

  /**
   * Detect problem vs solution focus
   */
  private detectFocusType(text: string): 'problem' | 'solution' | 'balanced' {
    const problemIndicators = [
      'problem', 'issue', 'challenge', 'struggle', 'frustrated',
      'tired of', 'sick of', 'fed up', 'annoyed', 'difficult',
      'hard to', 'can\'t', 'unable', 'failing', 'losing'
    ];

    const solutionIndicators = [
      'solution', 'solve', 'fix', 'answer', 'help', 'easy',
      'simple', 'effortless', 'finally', 'introducing', 'discover',
      'works', 'effective', 'proven', 'transform', 'achieve'
    ];

    let problemScore = 0;
    let solutionScore = 0;

    for (const indicator of problemIndicators) {
      if (text.includes(indicator)) problemScore++;
    }

    for (const indicator of solutionIndicators) {
      if (text.includes(indicator)) solutionScore++;
    }

    if (problemScore > solutionScore * 1.5) {
      return 'problem';
    } else if (solutionScore > problemScore * 1.5) {
      return 'solution';
    }
    return 'balanced';
  }

  /**
   * Get framing effectiveness indicators
   */
  static getFramingDescription(style: FramingStyle): string {
    const descriptions: Record<FramingStyle, string> = {
      [FramingStyle.GAIN]: 'Emphasizes what the customer will gain or achieve',
      [FramingStyle.LOSS]: 'Emphasizes what the customer might lose or miss',
      [FramingStyle.RISK]: 'Highlights dangers, problems, or risks to avoid',
      [FramingStyle.OPPORTUNITY]: 'Focuses on possibilities and potential benefits'
    };
    return descriptions[style];
  }
}

/**
 * Quick framing analysis
 */
export function analyzeFraming(text: string): FramingAnalysis {
  const analyzer = new FramingAnalyzer();
  return analyzer.analyze(text);
}
