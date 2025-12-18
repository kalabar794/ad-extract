/**
 * Psychological Trigger Analyzer Module
 *
 * Identifies deep psychological appeals used in advertising,
 * beyond surface-level persuasion techniques.
 */

import {
  PsychologicalTrigger,
  TriggerAnalysis
} from '../../types/sentiment';
import { triggerPatterns } from '../../config/sentiment-lexicons';

export class TriggerAnalyzer {
  private patterns = triggerPatterns;

  /**
   * Analyze psychological triggers in text
   */
  analyze(text: string): TriggerAnalysis {
    const normalizedText = text.toLowerCase();
    const triggerSignals: TriggerAnalysis['triggerSignals'] = [];
    const triggerIntensity: Record<PsychologicalTrigger, number> = {
      [PsychologicalTrigger.IDENTITY]: 0,
      [PsychologicalTrigger.STATUS]: 0,
      [PsychologicalTrigger.BELONGING]: 0,
      [PsychologicalTrigger.ACHIEVEMENT]: 0,
      [PsychologicalTrigger.SECURITY]: 0,
      [PsychologicalTrigger.FREEDOM]: 0,
      [PsychologicalTrigger.NOVELTY]: 0,
      [PsychologicalTrigger.NOSTALGIA]: 0,
      [PsychologicalTrigger.CURIOSITY]: 0,
      [PsychologicalTrigger.SELF_IMPROVEMENT]: 0
    };

    // Analyze each trigger type
    for (const [trigger, { patterns, keywords }] of Object.entries(this.patterns) as [PsychologicalTrigger, typeof this.patterns[PsychologicalTrigger]][]) {
      // Check patterns (higher weight)
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const strength = this.calculateMatchStrength(match[0], text);
          triggerIntensity[trigger] += strength * 2;
          triggerSignals.push({
            trigger,
            match: match[0],
            strength
          });
        }
      }

      // Check keywords (lower weight)
      for (const keyword of keywords) {
        if (this.containsWord(normalizedText, keyword)) {
          triggerIntensity[trigger] += 0.5;
        }
      }
    }

    // Get detected triggers (those with significant intensity)
    const detected = Object.entries(triggerIntensity)
      .filter(([_, score]) => score >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([trigger]) => trigger as PsychologicalTrigger);

    // Primary trigger is the highest scoring
    const primaryTrigger = detected.length > 0 ? detected[0] : null;

    return {
      detected,
      primaryTrigger,
      triggerIntensity,
      triggerSignals
    };
  }

  /**
   * Check if text contains a word (with word boundaries)
   */
  private containsWord(text: string, word: string): boolean {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(text);
  }

  /**
   * Calculate match strength based on various factors
   */
  private calculateMatchStrength(match: string, fullText: string): number {
    let strength = 1;

    // Longer matches are stronger
    if (match.length > 30) {
      strength += 0.5;
    } else if (match.length > 15) {
      strength += 0.25;
    }

    // Match at the beginning of text is stronger (headlines)
    if (fullText.toLowerCase().indexOf(match.toLowerCase()) < 50) {
      strength += 0.3;
    }

    // Match with numbers is often stronger (specificity)
    if (/\d+/.test(match)) {
      strength += 0.2;
    }

    // Emphasized (caps, exclamation) is stronger
    if (/[A-Z]{2,}/.test(match) || /!/.test(match)) {
      strength += 0.2;
    }

    return Math.min(2, strength);
  }

  /**
   * Get trigger descriptions for reporting
   */
  static getTriggerDescription(trigger: PsychologicalTrigger): string {
    const descriptions: Record<PsychologicalTrigger, string> = {
      [PsychologicalTrigger.IDENTITY]: 'Appeals to who the customer wants to be or identifies as',
      [PsychologicalTrigger.STATUS]: 'Appeals to social standing and prestige',
      [PsychologicalTrigger.BELONGING]: 'Appeals to community, tribe, and social connection',
      [PsychologicalTrigger.ACHIEVEMENT]: 'Appeals to accomplishment and goal attainment',
      [PsychologicalTrigger.SECURITY]: 'Appeals to safety, stability, and peace of mind',
      [PsychologicalTrigger.FREEDOM]: 'Appeals to autonomy, choice, and independence',
      [PsychologicalTrigger.NOVELTY]: 'Appeals to curiosity and desire for new experiences',
      [PsychologicalTrigger.NOSTALGIA]: 'Appeals to past experiences and tradition',
      [PsychologicalTrigger.CURIOSITY]: 'Creates intrigue and desire to learn more',
      [PsychologicalTrigger.SELF_IMPROVEMENT]: 'Appeals to desire for personal growth and betterment'
    };
    return descriptions[trigger];
  }

  /**
   * Get trigger marketing applications
   */
  static getTriggerApplication(trigger: PsychologicalTrigger): string {
    const applications: Record<PsychologicalTrigger, string> = {
      [PsychologicalTrigger.IDENTITY]: 'Target messaging to specific personas and aspirational identities',
      [PsychologicalTrigger.STATUS]: 'Position as premium or exclusive offering',
      [PsychologicalTrigger.BELONGING]: 'Build community and emphasize shared experiences',
      [PsychologicalTrigger.ACHIEVEMENT]: 'Focus on results, goals, and success stories',
      [PsychologicalTrigger.SECURITY]: 'Emphasize guarantees, trust signals, and risk reduction',
      [PsychologicalTrigger.FREEDOM]: 'Highlight flexibility, choice, and lack of constraints',
      [PsychologicalTrigger.NOVELTY]: 'Lead with innovation, newness, and discovery',
      [PsychologicalTrigger.NOSTALGIA]: 'Reference heritage, tradition, and timeless values',
      [PsychologicalTrigger.CURIOSITY]: 'Use hooks, teasers, and partial information reveals',
      [PsychologicalTrigger.SELF_IMPROVEMENT]: 'Focus on transformation and personal development'
    };
    return applications[trigger];
  }
}

/**
 * Quick trigger analysis
 */
export function analyzeTriggers(text: string): TriggerAnalysis {
  const analyzer = new TriggerAnalyzer();
  return analyzer.analyze(text);
}
