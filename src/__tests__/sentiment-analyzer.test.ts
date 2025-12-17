/**
 * Tests for Sentiment Analyzer
 *
 * Comprehensive tests for emotional, persuasion, tone, framing,
 * psychological trigger, and positioning analysis.
 */

import {
  SentimentAnalyzer,
  analyzeSentiment,
  analyzeAdsSentiment,
  analyzeCompetitorSentiment,
  EmotionAnalyzer,
  PersuasionAnalyzer,
  ToneAnalyzer,
  FramingAnalyzer,
  TriggerAnalyzer,
  PositioningAnalyzer
} from '../analyzers/sentiment';
import { Ad } from '../types/ad';
import {
  EmotionType,
  PersuasionTechnique,
  PsychologicalTrigger,
  BrandPersonalityTrait,
  FormalityLevel,
  PositioningAggressiveness,
  MarketPosition
} from '../types/sentiment';

// Helper to create mock ads
function createMockAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: `ad-${Math.random().toString(36).substr(2, 9)}`,
    competitor: 'Test Company',
    platform: 'meta',
    extractedAt: new Date().toISOString(),
    primaryText: 'Test ad copy',
    hashtags: [],
    ...overrides
  };
}

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer;

  beforeEach(() => {
    analyzer = new SentimentAnalyzer();
  });

  describe('analyze()', () => {
    it('should return complete analysis for valid text', () => {
      const text = 'Amazing product! Get 50% off today. Join thousands of happy customers.';
      const result = analyzer.analyze(text);

      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
      expect(result.emotions).toBeDefined();
      expect(result.persuasion).toBeDefined();
      expect(result.tone).toBeDefined();
      expect(result.framing).toBeDefined();
      expect(result.triggers).toBeDefined();
      expect(result.positioning).toBeDefined();
      expect(result.strategicInsights).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle empty text gracefully', () => {
      const result = analyzer.analyze('');

      expect(result).toBeDefined();
      expect(result.overall.sentiment).toBe('neutral');
    });

    it('should handle very short text gracefully', () => {
      const result = analyzer.analyze('Hi');

      expect(result).toBeDefined();
      expect(result.overall.sentiment).toBe('neutral');
    });

    it('should include processing time in metadata', () => {
      const text = 'This is a test advertisement with some content.';
      const result = analyzer.analyze(text);

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.analysisVersion).toBeDefined();
    });

    it('should correctly count words and sentences', () => {
      const text = 'This is a test. It has two sentences.';
      const result = analyzer.analyze(text);

      expect(result.metadata.wordCount).toBe(8);
      expect(result.metadata.sentenceCount).toBe(2);
    });
  });

  describe('analyzeAd()', () => {
    it('should analyze a full ad object', () => {
      const ad = createMockAd({
        primaryText: 'Discover our amazing product!',
        headline: 'Transform Your Life',
        description: 'Join millions of satisfied customers.'
      });

      const result = analyzer.analyzeAd(ad);

      expect(result).toBeDefined();
      expect(result.adId).toBe(ad.id);
    });

    it('should combine all text fields for analysis', () => {
      const ad = createMockAd({
        primaryText: 'Amazing',
        headline: 'Incredible',
        description: 'Fantastic',
        cta: 'Buy Now'
      });

      const result = analyzer.analyzeAd(ad);

      // Should have analyzed combined text
      expect(result.text).toContain('Amazing');
    });
  });

  describe('analyzeCompetitor()', () => {
    it('should return both individual analyses and summary', () => {
      const ads = [
        createMockAd({ primaryText: 'Amazing product! Limited time offer!' }),
        createMockAd({ primaryText: 'Join thousands of happy customers!' }),
        createMockAd({ primaryText: 'Proven results guaranteed!' })
      ];

      const { analyses, summary } = analyzer.analyzeCompetitor('Test Co', ads);

      expect(analyses).toHaveLength(3);
      expect(summary).toBeDefined();
      expect(summary.competitor).toBe('Test Co');
      expect(summary.adsAnalyzed).toBe(3);
    });

    it('should calculate emotion distribution correctly', () => {
      const ads = [
        createMockAd({ primaryText: 'Thrilled! Excited! Amazing!' }), // Joy
        createMockAd({ primaryText: 'Guaranteed! Proven! Certified!' }), // Trust
        createMockAd({ primaryText: 'Warning! Risk! Danger!' }) // Fear
      ];

      const { summary } = analyzer.analyzeCompetitor('Test Co', ads);

      expect(summary.emotionDistribution).toBeDefined();
      expect(typeof summary.avgEmotionalIntensity).toBe('number');
    });

    it('should handle empty ad array', () => {
      const { analyses, summary } = analyzer.analyzeCompetitor('Test Co', []);

      expect(analyses).toHaveLength(0);
      expect(summary.adsAnalyzed).toBe(0);
    });

    it('should identify strategic opportunities', () => {
      const ads = [
        createMockAd({ primaryText: 'Great product. Simple and easy.' })
      ];

      const { summary } = analyzer.analyzeCompetitor('Test Co', ads);

      expect(summary.opportunities).toBeDefined();
      expect(Array.isArray(summary.opportunities.emotionalGaps)).toBe(true);
      expect(Array.isArray(summary.opportunities.persuasionGaps)).toBe(true);
    });

    it('should generate recommendations', () => {
      const ads = [
        createMockAd({ primaryText: 'Check out our product.' })
      ];

      const { summary } = analyzer.analyzeCompetitor('Test Co', ads);

      expect(Array.isArray(summary.recommendations)).toBe(true);
    });
  });
});

describe('EmotionAnalyzer', () => {
  let analyzer: EmotionAnalyzer;

  beforeEach(() => {
    analyzer = new EmotionAnalyzer();
  });

  it('should detect joy emotions', () => {
    const result = analyzer.analyze('Amazing! Thrilled! Fantastic! We are so excited!');

    expect(result.primary).toBe(EmotionType.JOY);
    expect(result.emotionBreakdown[EmotionType.JOY]).toBeGreaterThan(0);
  });

  it('should detect trust emotions', () => {
    const result = analyzer.analyze('Guaranteed results. Proven. Certified experts. Trusted by millions.');

    expect(result.primary).toBe(EmotionType.TRUST);
  });

  it('should detect fear emotions', () => {
    const result = analyzer.analyze('Warning! Danger ahead. Risk of losing everything. Urgent crisis!');

    expect(result.primary).toBe(EmotionType.FEAR);
  });

  it('should detect anticipation emotions', () => {
    const result = analyzer.analyze('Coming soon! Get ready! Imagine the possibilities. Can\'t wait!');

    expect([EmotionType.ANTICIPATION, EmotionType.SURPRISE]).toContain(result.primary);
  });

  it('should calculate emotional intensity', () => {
    const lowIntensity = analyzer.analyze('Nice product. Good quality.');
    const highIntensity = analyzer.analyze('AMAZING!!! INCREDIBLE!!! FANTASTIC!!! WOW!!!');

    expect(highIntensity.intensityScore).toBeGreaterThan(lowIntensity.intensityScore);
  });

  it('should detect emotional arc patterns', () => {
    // Problem -> Solution arc
    const problemSolution = analyzer.analyze(
      'Struggling with poor results? Frustrated with failure? Finally, a solution that works!'
    );

    expect(problemSolution.emotionalArc).toBeDefined();
  });

  it('should determine dominant polarity', () => {
    const positiveText = analyzer.analyze('Happy! Joyful! Excited! Amazing!');
    const negativeText = analyzer.analyze('Angry. Frustrated. Disgusted. Terrible.');

    expect(positiveText.dominantPolarity).toBe('positive');
    expect(negativeText.dominantPolarity).toBe('negative');
  });
});

describe('PersuasionAnalyzer', () => {
  let analyzer: PersuasionAnalyzer;

  beforeEach(() => {
    analyzer = new PersuasionAnalyzer();
  });

  it('should detect scarcity technique', () => {
    const result = analyzer.analyze('Only 3 left! Limited time offer. While supplies last.');

    expect(result.techniques).toContain(PersuasionTechnique.SCARCITY);
  });

  it('should detect social proof technique', () => {
    const result = analyzer.analyze('Join 50,000+ happy customers. Rated 5 stars. As seen on Forbes.');

    expect(result.techniques).toContain(PersuasionTechnique.SOCIAL_PROOF);
  });

  it('should detect authority technique', () => {
    const result = analyzer.analyze('Dr. Smith recommends. Award-winning. #1 rated. Industry leading.');

    expect(result.techniques).toContain(PersuasionTechnique.AUTHORITY);
  });

  it('should detect urgency technique', () => {
    const result = analyzer.analyze('Act now! Today only! Hurry! Don\'t wait!');

    expect(result.techniques).toContain(PersuasionTechnique.URGENCY);
  });

  it('should detect FOMO technique', () => {
    const result = analyzer.analyze('Don\'t miss out! Others are already getting results. Selling fast!');

    expect(result.techniques).toContain(PersuasionTechnique.FOMO);
  });

  it('should detect reciprocity technique', () => {
    const result = analyzer.analyze('Free guide included! Complimentary consultation. Bonus gift with purchase.');

    expect(result.techniques).toContain(PersuasionTechnique.RECIPROCITY);
  });

  it('should calculate pressure score', () => {
    const lowPressure = analyzer.analyze('Check out our product.');
    const highPressure = analyzer.analyze(
      'LAST CHANCE! Only 2 left! 50,000+ customers! Act NOW! Limited time! Don\'t miss out!'
    );

    expect(highPressure.pressureScore).toBeGreaterThan(lowPressure.pressureScore);
  });

  it('should determine intensity level', () => {
    const result = analyzer.analyze(
      'Limited time! Join 10,000+ customers! Expert recommended! Act now!'
    );

    expect(['light', 'moderate', 'heavy']).toContain(result.intensityLevel);
  });

  it('should identify primary technique', () => {
    const result = analyzer.analyze(
      'Only 3 left! Last few remaining! Limited stock! Selling out fast!'
    );

    expect(result.primaryTechnique).toBe(PersuasionTechnique.SCARCITY);
  });
});

describe('ToneAnalyzer', () => {
  let analyzer: ToneAnalyzer;

  beforeEach(() => {
    analyzer = new ToneAnalyzer();
  });

  it('should detect casual formality', () => {
    const result = analyzer.analyze('Hey! Check this out! It\'s totally awesome! LOL 😀');

    expect(result.formality).toBe(FormalityLevel.CASUAL);
    expect(result.formalityScore).toBeLessThan(5);
  });

  it('should detect formal formality', () => {
    const result = analyzer.analyze(
      'We would like to inform you of our services. Pursuant to our agreement, we hereby offer.'
    );

    expect([FormalityLevel.FORMAL, FormalityLevel.PROFESSIONAL]).toContain(result.formality);
  });

  it('should analyze voice characteristics', () => {
    const result = analyzer.analyze('Guaranteed proven results from our expert team.');

    expect(result.voiceCharacteristics).toBeDefined();
    expect(typeof result.voiceCharacteristics.authority).toBe('number');
    expect(typeof result.voiceCharacteristics.empathy).toBe('number');
    expect(typeof result.voiceCharacteristics.confidence).toBe('number');
  });

  it('should detect brand personality traits', () => {
    const excitementText = analyzer.analyze('Exciting! Thrilling! Bold adventure awaits! 🔥');
    expect(excitementText.brandPersonality).toContain(BrandPersonalityTrait.EXCITEMENT);

    const competenceText = analyzer.analyze('Professional, reliable, proven expertise. Quality assured.');
    expect(competenceText.brandPersonality).toContain(BrandPersonalityTrait.COMPETENCE);
  });

  it('should generate voice summary', () => {
    const result = analyzer.analyze('We understand your needs. Our caring team is here to help.');

    expect(result.voiceSummary).toBeDefined();
    expect(typeof result.voiceSummary).toBe('string');
    expect(result.voiceSummary.length).toBeGreaterThan(0);
  });

  it('should score empathy correctly', () => {
    const empathetic = analyzer.analyze(
      'We understand your struggles. We\'ve been there. We hear you. Let us help.'
    );
    const notEmpathetic = analyzer.analyze('Product features: fast, reliable, efficient.');

    expect(empathetic.voiceCharacteristics.empathy)
      .toBeGreaterThan(notEmpathetic.voiceCharacteristics.empathy);
  });
});

describe('FramingAnalyzer', () => {
  let analyzer: FramingAnalyzer;

  beforeEach(() => {
    analyzer = new FramingAnalyzer();
  });

  it('should detect positive framing', () => {
    const result = analyzer.analyze('Gain more. Achieve success. Win big. Grow your business.');

    expect(result.primaryFrame).toBe('positive');
  });

  it('should detect negative framing', () => {
    const result = analyzer.analyze('Stop losing money. Don\'t miss out. Avoid mistakes. Prevent failure.');

    expect(result.primaryFrame).toBe('negative');
  });

  it('should determine framing style', () => {
    const gainFocused = analyzer.analyze('Get more. Earn more. Win more. Achieve more.');
    expect(gainFocused.framingStyle).toBeDefined();

    const lossFocused = analyzer.analyze('Stop losing. Don\'t waste. Avoid missing. Prevent loss.');
    expect(lossFocused.framingStyle).toBeDefined();
  });

  it('should detect time orientation', () => {
    const futureOriented = analyzer.analyze('Imagine the future. Soon you will. Picture yourself tomorrow.');
    expect(futureOriented.timeOrientation).toBe('future');

    const presentOriented = analyzer.analyze('Get it now. Today is the day. Right now, you can.');
    expect(presentOriented.timeOrientation).toBe('present');
  });

  it('should detect problem vs solution focus', () => {
    const problemFocused = analyzer.analyze(
      'Struggling? Frustrated? Tired of problems? Fed up with issues?'
    );
    expect(problemFocused.focusType).toBe('problem');

    const solutionFocused = analyzer.analyze(
      'Easy solution. Simple fix. Help is here. Problem solved.'
    );
    expect(solutionFocused.focusType).toBe('solution');
  });

  it('should collect framing signals', () => {
    const result = analyzer.analyze('Don\'t miss this opportunity to gain more success.');

    expect(result.framingSignals).toBeDefined();
    expect(Array.isArray(result.framingSignals)).toBe(true);
  });
});

describe('TriggerAnalyzer', () => {
  let analyzer: TriggerAnalyzer;

  beforeEach(() => {
    analyzer = new TriggerAnalyzer();
  });

  it('should detect identity trigger', () => {
    const result = analyzer.analyze(
      'For smart professionals who want more. Successful entrepreneurs choose us.'
    );

    expect(result.detected).toContain(PsychologicalTrigger.IDENTITY);
  });

  it('should detect belonging trigger', () => {
    const result = analyzer.analyze(
      'Join our community. Be part of something bigger. Together we grow.'
    );

    expect(result.detected).toContain(PsychologicalTrigger.BELONGING);
  });

  it('should detect achievement trigger', () => {
    const result = analyzer.analyze(
      'Reach your goals. Achieve success. Unlock your potential. Transform your results.'
    );

    expect(result.detected).toContain(PsychologicalTrigger.ACHIEVEMENT);
  });

  it('should detect security trigger', () => {
    const result = analyzer.analyze(
      'Protected. Secure. Guaranteed. Peace of mind. Risk-free.'
    );

    expect(result.detected).toContain(PsychologicalTrigger.SECURITY);
  });

  it('should detect novelty trigger', () => {
    const result = analyzer.analyze(
      'New! Revolutionary! Discover the breakthrough. First-ever innovation.'
    );

    expect(result.detected).toContain(PsychologicalTrigger.NOVELTY);
  });

  it('should detect curiosity trigger', () => {
    const result = analyzer.analyze(
      'Discover the secret. Find out the hidden truth. What if you could...?'
    );

    expect(result.detected).toContain(PsychologicalTrigger.CURIOSITY);
  });

  it('should identify primary trigger', () => {
    const result = analyzer.analyze(
      'Join our community. Part of the family. Together. Belong with us.'
    );

    expect(result.primaryTrigger).toBe(PsychologicalTrigger.BELONGING);
  });

  it('should track trigger intensity', () => {
    const result = analyzer.analyze('Security. Protected. Safe. Guaranteed. Secure.');

    expect(result.triggerIntensity[PsychologicalTrigger.SECURITY]).toBeGreaterThan(0);
  });
});

describe('PositioningAnalyzer', () => {
  let analyzer: PositioningAnalyzer;

  beforeEach(() => {
    analyzer = new PositioningAnalyzer();
  });

  it('should detect leader positioning', () => {
    const result = analyzer.analyze(
      '#1 rated. Market leader. Most trusted. Industry leading. The best.'
    );

    expect(result.marketPosition).toBe(MarketPosition.LEADER);
  });

  it('should detect challenger positioning', () => {
    const result = analyzer.analyze(
      'Better than the rest. Switch from competitors. Unlike other brands. The alternative.'
    );

    expect(result.marketPosition).toBe(MarketPosition.CHALLENGER);
  });

  it('should detect disruptor positioning', () => {
    const result = analyzer.analyze(
      'Revolutionary! Game-changing! The future of. Reinventing the industry. World\'s first.'
    );

    expect(result.marketPosition).toBe(MarketPosition.DISRUPTOR);
  });

  it('should detect niche positioning', () => {
    const result = analyzer.analyze(
      'Designed specifically for dentists. Built for healthcare professionals. The only tool for lawyers.'
    );

    expect(result.marketPosition).toBe(MarketPosition.NICHE);
  });

  it('should determine aggressiveness level', () => {
    const passive = analyzer.analyze('Great product. Quality service.');
    expect(passive.aggressiveness).toBe(PositioningAggressiveness.PASSIVE);

    const aggressive = analyzer.analyze(
      'Better than Brand X. Forget Competitor Y. Switch from Z to us. We beat them all.'
    );
    expect([
      PositioningAggressiveness.COMPARATIVE,
      PositioningAggressiveness.AGGRESSIVE
    ]).toContain(aggressive.aggressiveness);
  });

  it('should detect comparison mentions', () => {
    const result = analyzer.analyze(
      'Better than Brand X. Unlike others. Switch from Y. vs. competitors.'
    );

    expect(result.comparisonMentions.length).toBeGreaterThan(0);
  });

  it('should calculate positioning score', () => {
    const mild = analyzer.analyze('Great product.');
    const strong = analyzer.analyze(
      '#1 choice. Better than all. Industry leader. Beat the competition.'
    );

    expect(strong.positioningScore).toBeGreaterThan(mild.positioningScore);
  });
});

describe('Convenience functions', () => {
  it('analyzeSentiment should work', () => {
    const result = analyzeSentiment('Amazing product! Buy now!');

    expect(result).toBeDefined();
    expect(result.overall).toBeDefined();
  });

  it('analyzeAdsSentiment should work', () => {
    const ads = [
      createMockAd({ primaryText: 'Great product!' }),
      createMockAd({ primaryText: 'Amazing service!' })
    ];

    const results = analyzeAdsSentiment(ads);

    expect(results).toHaveLength(2);
  });

  it('analyzeCompetitorSentiment should work', () => {
    const ads = [
      createMockAd({ primaryText: 'Great product!' })
    ];

    const { analyses, summary } = analyzeCompetitorSentiment('Test', ads);

    expect(analyses).toHaveLength(1);
    expect(summary.competitor).toBe('Test');
  });
});

describe('Integration', () => {
  it('should handle real-world ad copy', () => {
    const realAdCopy = `
      🔥 LIMITED TIME OFFER! 🔥

      Struggling to grow your business? Tired of poor results?

      Join 50,000+ successful entrepreneurs who transformed their lives with our proven system!

      ✅ Guaranteed results
      ✅ Expert support 24/7
      ✅ Risk-free trial

      "This changed everything for me!" - Sarah M. ⭐⭐⭐⭐⭐

      Don't miss out! Only 5 spots left at this price.

      👉 Click now to get started
    `;

    const result = analyzeSentiment(realAdCopy);

    // Should detect multiple elements
    expect(result.emotions.intensityScore).toBeGreaterThan(3);
    expect(result.persuasion.techniques.length).toBeGreaterThan(2);
    expect(result.triggers.detected.length).toBeGreaterThan(0);
    expect(result.strategicInsights.recommendations.length).toBeGreaterThan(0);
  });

  it('should handle minimal professional copy', () => {
    const minimalCopy = 'Learn more about our enterprise solutions.';

    const result = analyzeSentiment(minimalCopy);

    expect(result).toBeDefined();
    expect(result.persuasion.pressureScore).toBeLessThan(5);
  });

  it('should provide consistent results for same input', () => {
    const text = 'Amazing product! Limited time offer! Join thousands!';

    const result1 = analyzeSentiment(text);
    const result2 = analyzeSentiment(text);

    expect(result1.overall.sentiment).toBe(result2.overall.sentiment);
    expect(result1.emotions.primary).toBe(result2.emotions.primary);
    expect(result1.persuasion.techniques).toEqual(result2.persuasion.techniques);
  });
});
