/**
 * Persuasion Analyzer Module
 *
 * Detects persuasion techniques based on Cialdini's principles and
 * marketing psychology patterns in ad copy.
 */

import {
  PersuasionTechnique,
  PersuasionAnalysis
} from '../../types/sentiment';
import { persuasionPatterns } from '../../config/sentiment-lexicons';

export class PersuasionAnalyzer {
  private patterns = persuasionPatterns;

  /**
   * Analyze persuasion techniques in text
   */
  analyze(text: string): PersuasionAnalysis {
    const detectedPatterns: PersuasionAnalysis['detectedPatterns'] = [];
    const techniqueCounts: Partial<Record<PersuasionTechnique, number>> = {};

    // Check each technique's patterns
    for (const [technique, patterns] of Object.entries(this.patterns) as [PersuasionTechnique, RegExp[]][]) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const confidence = this.calculateConfidence(match[0], text);

          detectedPatterns.push({
            technique,
            match: match[0],
            confidence
          });

          techniqueCounts[technique] = (techniqueCounts[technique] || 0) + 1;
        }
      }
    }

    // Get unique techniques detected
    const techniques = [...new Set(detectedPatterns.map(p => p.technique))];

    // Determine primary technique (most matches)
    const primaryTechnique = this.getPrimaryTechnique(techniqueCounts);

    // Calculate pressure score (1-10)
    const pressureScore = this.calculatePressureScore(detectedPatterns, techniques);

    // Determine intensity level
    const intensityLevel = this.getIntensityLevel(techniques.length, pressureScore);

    return {
      techniques,
      intensityLevel,
      primaryTechnique,
      techniqueCount: techniques.length,
      pressureScore,
      detectedPatterns
    };
  }

  /**
   * Calculate confidence for a match
   */
  private calculateConfidence(match: string, fullText: string): number {
    // Base confidence on match length relative to typical marketing phrases
    const matchLength = match.length;
    let confidence = 0.5;

    // Longer, more specific matches = higher confidence
    if (matchLength > 20) {
      confidence += 0.3;
    } else if (matchLength > 10) {
      confidence += 0.2;
    }

    // Multiple exclamation marks or ALL CAPS in match = higher confidence
    if (/!{2,}/.test(match) || /[A-Z]{3,}/.test(match)) {
      confidence += 0.1;
    }

    // Numbers in match (e.g., "50% off", "100+ customers") = higher confidence
    if (/\d+/.test(match)) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Get the primary (most used) technique
   */
  private getPrimaryTechnique(counts: Partial<Record<PersuasionTechnique, number>>): PersuasionTechnique | null {
    const entries = Object.entries(counts) as [PersuasionTechnique, number][];
    if (entries.length === 0) return null;

    const sorted = entries.sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  /**
   * Calculate overall pressure score (1-10)
   */
  private calculatePressureScore(
    patterns: PersuasionAnalysis['detectedPatterns'],
    techniques: PersuasionTechnique[]
  ): number {
    // Base score from technique count
    let score = techniques.length * 1.5;

    // High-pressure techniques add more
    const highPressureTechniques = [
      PersuasionTechnique.SCARCITY,
      PersuasionTechnique.URGENCY,
      PersuasionTechnique.FOMO
    ];

    for (const technique of techniques) {
      if (highPressureTechniques.includes(technique)) {
        score += 1;
      }
    }

    // More matches of same technique = more pressure
    const matchCount = patterns.length;
    if (matchCount > 5) {
      score += 2;
    } else if (matchCount > 3) {
      score += 1;
    }

    // Average confidence adds to score
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / (patterns.length || 1);
    score += avgConfidence * 2;

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  /**
   * Get intensity level based on technique count and pressure
   */
  private getIntensityLevel(techniqueCount: number, pressureScore: number): 'light' | 'moderate' | 'heavy' {
    const combinedScore = (techniqueCount * 2) + pressureScore;

    if (combinedScore <= 5) {
      return 'light';
    } else if (combinedScore <= 12) {
      return 'moderate';
    }
    return 'heavy';
  }

  /**
   * Get technique description for reporting
   */
  static getTechniqueDescription(technique: PersuasionTechnique): string {
    const descriptions: Record<PersuasionTechnique, string> = {
      [PersuasionTechnique.SCARCITY]: 'Creates urgency through limited availability',
      [PersuasionTechnique.SOCIAL_PROOF]: 'Leverages crowd behavior and testimonials',
      [PersuasionTechnique.AUTHORITY]: 'Uses expert endorsement and credentials',
      [PersuasionTechnique.RECIPROCITY]: 'Offers value first to encourage return action',
      [PersuasionTechnique.COMMITMENT]: 'Encourages small steps toward larger commitment',
      [PersuasionTechnique.LIKING]: 'Builds rapport and relatability',
      [PersuasionTechnique.URGENCY]: 'Creates time pressure for immediate action',
      [PersuasionTechnique.FOMO]: 'Fear of missing out on opportunity',
      [PersuasionTechnique.ANCHORING]: 'Sets price/value reference points',
      [PersuasionTechnique.EXCLUSIVITY]: 'Appeals to desire for special access'
    };
    return descriptions[technique];
  }
}

/**
 * Quick persuasion analysis
 */
export function analyzePersuasion(text: string): PersuasionAnalysis {
  const analyzer = new PersuasionAnalyzer();
  return analyzer.analyze(text);
}
