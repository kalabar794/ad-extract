import { Ad } from '../types/ad';
import { CopyAnalysis } from '../types/analysis';
import { detectCTA, extractAllCTAs } from '../config/ctas';
import { createLogger } from '../utils/logger';

const logger = createLogger('copy-analyzer');

// Common stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'your', 'our', 'their'
]);

export class CopyAnalyzer {
  /**
   * Analyze copy from multiple ads
   */
  analyze(ads: Ad[]): CopyAnalysis {
    const allText = ads.map(ad => ad.primaryText).join(' ');
    const words = this.tokenize(allText);
    const filteredWords = this.removeStopWords(words);

    return {
      wordFrequency: this.getWordFrequency(filteredWords),
      topKeywords: this.getTopKeywords(filteredWords, 20),
      commonPhrases: this.extractNGrams(allText, 2, 3, 10),
      ctaDistribution: this.getCTADistribution(ads),
      avgCopyLength: this.calculateAvgCopyLength(ads),
      emojiUsage: this.extractEmojis(allText),
      readabilityScore: this.calculateReadability(allText),
      hashtagFrequency: this.getHashtagFrequency(ads)
    };
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s#@]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Remove stop words from array
   */
  private removeStopWords(words: string[]): string[] {
    return words.filter(word => !STOP_WORDS.has(word));
  }

  /**
   * Get word frequency map
   */
  private getWordFrequency(words: string[]): Map<string, number> {
    const freq = new Map<string, number>();

    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    return freq;
  }

  /**
   * Get top N keywords by frequency
   */
  private getTopKeywords(words: string[], n: number): string[] {
    const freq = this.getWordFrequency(words);
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([word]) => word);
  }

  /**
   * Extract n-grams (common phrases)
   */
  private extractNGrams(
    text: string,
    minN: number,
    maxN: number,
    topN: number
  ): string[] {
    const sentences = text.toLowerCase().split(/[.!?]+/);
    const ngramCounts = new Map<string, number>();

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);

      for (let n = minN; n <= maxN; n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const ngram = words.slice(i, i + n).join(' ');

          // Skip if contains mostly stop words
          const ngramWords = ngram.split(' ');
          const stopWordCount = ngramWords.filter(w => STOP_WORDS.has(w)).length;
          if (stopWordCount > ngramWords.length / 2) continue;

          ngramCounts.set(ngram, (ngramCounts.get(ngram) || 0) + 1);
        }
      }
    }

    return Array.from(ngramCounts.entries())
      .filter(([_, count]) => count >= 2) // Only phrases that appear 2+ times
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([phrase]) => phrase);
  }

  /**
   * Get CTA distribution across ads
   */
  private getCTADistribution(ads: Ad[]): Map<string, number> {
    const dist = new Map<string, number>();

    for (const ad of ads) {
      // Check explicit CTA field
      if (ad.cta) {
        dist.set(ad.cta, (dist.get(ad.cta) || 0) + 1);
      }

      // Also check for CTAs in text
      const textCTAs = extractAllCTAs(ad.primaryText);
      for (const { cta } of textCTAs) {
        dist.set(cta, (dist.get(cta) || 0) + 1);
      }
    }

    return dist;
  }

  /**
   * Calculate average copy length
   */
  private calculateAvgCopyLength(ads: Ad[]): number {
    if (ads.length === 0) return 0;

    const totalLength = ads.reduce((sum, ad) => sum + ad.primaryText.length, 0);
    return Math.round(totalLength / ads.length);
  }

  /**
   * Extract emojis from text
   */
  private extractEmojis(text: string): string[] {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const matches = text.match(emojiRegex) || [];
    return [...new Set(matches)];
  }

  /**
   * Calculate Flesch-Kincaid readability score
   */
  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Estimate syllable count in a word
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let count = 0;
    let prevWasVowel = false;

    for (const char of word) {
      const isVowel = vowels.includes(char);
      if (isVowel && !prevWasVowel) {
        count++;
      }
      prevWasVowel = isVowel;
    }

    // Adjust for silent e
    if (word.endsWith('e')) count--;

    // Minimum 1 syllable
    return Math.max(1, count);
  }

  /**
   * Get hashtag frequency across ads
   */
  private getHashtagFrequency(ads: Ad[]): Map<string, number> {
    const freq = new Map<string, number>();

    for (const ad of ads) {
      for (const hashtag of ad.hashtags) {
        const normalized = hashtag.toLowerCase();
        freq.set(normalized, (freq.get(normalized) || 0) + 1);
      }
    }

    return freq;
  }
}

/**
 * Quick analysis without creating instance
 */
export function analyzeCopy(ads: Ad[]): CopyAnalysis {
  const analyzer = new CopyAnalyzer();
  return analyzer.analyze(ads);
}
