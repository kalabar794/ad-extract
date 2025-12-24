/**
 * Strategic Insights Generator Module
 *
 * Auto-generates strategic insights and actionable recommendations
 * from sentiment analysis results.
 */

import {
  EmotionType,
  PersuasionTechnique,
  PsychologicalTrigger,
  BrandPersonalityTrait,
  FormalityLevel,
  FramingStyle,
  PositioningAggressiveness,
  MarketPosition,
  EmotionalArc,
  StrategicInsights,
  EmotionAnalysis,
  PersuasionAnalysis,
  ToneAnalysis,
  FramingAnalysis,
  TriggerAnalysis,
  PositioningAnalysis
} from '../../types/sentiment';

export class InsightsGenerator {
  /**
   * Generate strategic insights from all analysis components
   */
  generate(
    emotions: EmotionAnalysis,
    persuasion: PersuasionAnalysis,
    tone: ToneAnalysis,
    framing: FramingAnalysis,
    triggers: TriggerAnalysis,
    positioning: PositioningAnalysis
  ): StrategicInsights {
    return {
      emotionalStrategy: this.generateEmotionalStrategy(emotions),
      persuasionApproach: this.generatePersuasionApproach(persuasion),
      brandVoiceSummary: this.generateBrandVoiceSummary(tone),
      competitivePosture: this.generateCompetitivePosture(positioning),
      keyStrengths: this.identifyStrengths(emotions, persuasion, tone, framing, triggers, positioning),
      keyWeaknesses: this.identifyWeaknesses(emotions, persuasion, tone, framing, triggers, positioning),
      recommendations: this.generateRecommendations(emotions, persuasion, tone, framing, triggers, positioning)
    };
  }

  /**
   * Generate emotional strategy insight
   */
  private generateEmotionalStrategy(emotions: EmotionAnalysis): string {
    const { primary, secondary, intensityScore, emotionalArc, dominantPolarity } = emotions;

    const emotionNames: Record<EmotionType, string> = {
      [EmotionType.JOY]: 'joy and positivity',
      [EmotionType.TRUST]: 'trust and credibility',
      [EmotionType.FEAR]: 'fear and urgency',
      [EmotionType.SURPRISE]: 'surprise and novelty',
      [EmotionType.ANTICIPATION]: 'anticipation and excitement',
      [EmotionType.SADNESS]: 'empathy and pain points',
      [EmotionType.ANGER]: 'frustration and dissatisfaction',
      [EmotionType.DISGUST]: 'rejection of alternatives'
    };

    const arcDescriptions: Record<EmotionalArc, string> = {
      [EmotionalArc.PROBLEM_SOLUTION]: 'following a problem-solution arc that agitates pain before offering relief',
      [EmotionalArc.ASPIRATION_ACTION]: 'following an aspiration-action arc that paints a desirable future',
      [EmotionalArc.FEAR_TRUST]: 'following a fear-trust arc that establishes risk before providing security',
      [EmotionalArc.CURIOSITY_SATISFACTION]: 'following a curiosity-satisfaction arc that hooks with intrigue',
      [EmotionalArc.FLAT]: 'maintaining consistent emotional tone throughout'
    };

    const intensityLabel = intensityScore >= 7 ? 'high-intensity' :
      intensityScore >= 4 ? 'moderate-intensity' : 'low-intensity';

    let strategy = `Leads with ${emotionNames[primary]} using ${intensityLabel} emotional appeals`;

    if (secondary.length > 0) {
      strategy += `, supported by ${emotionNames[secondary[0]]}`;
    }

    strategy += `, ${arcDescriptions[emotionalArc]}`;

    if (dominantPolarity === 'negative') {
      strategy += '. Uses negative emotional triggers to drive action.';
    } else if (dominantPolarity === 'positive') {
      strategy += '. Maintains positive emotional framing throughout.';
    } else {
      strategy += '. Balances positive and negative emotions for impact.';
    }

    return strategy;
  }

  /**
   * Generate persuasion approach insight
   */
  private generatePersuasionApproach(persuasion: PersuasionAnalysis): string {
    const { techniques, intensityLevel, primaryTechnique, pressureScore } = persuasion;

    if (techniques.length === 0) {
      return 'Uses minimal overt persuasion techniques, relying on straightforward value communication.';
    }

    const techniqueNames: Record<PersuasionTechnique, string> = {
      [PersuasionTechnique.SCARCITY]: 'scarcity',
      [PersuasionTechnique.SOCIAL_PROOF]: 'social proof',
      [PersuasionTechnique.AUTHORITY]: 'authority',
      [PersuasionTechnique.RECIPROCITY]: 'reciprocity',
      [PersuasionTechnique.COMMITMENT]: 'commitment/consistency',
      [PersuasionTechnique.LIKING]: 'liking/rapport',
      [PersuasionTechnique.URGENCY]: 'urgency',
      [PersuasionTechnique.FOMO]: 'FOMO',
      [PersuasionTechnique.ANCHORING]: 'price anchoring',
      [PersuasionTechnique.EXCLUSIVITY]: 'exclusivity'
    };

    const intensityDescriptions = {
      light: 'with a light touch',
      moderate: 'with moderate emphasis',
      heavy: 'with heavy emphasis'
    };

    let approach = `Employs ${techniques.length} persuasion technique${techniques.length > 1 ? 's' : ''} ${intensityDescriptions[intensityLevel]}`;

    if (primaryTechnique) {
      approach += `. Primary technique is ${techniqueNames[primaryTechnique]}`;
    }

    if (techniques.length > 1) {
      const otherTechniques = techniques
        .filter(t => t !== primaryTechnique)
        .slice(0, 2)
        .map(t => techniqueNames[t])
        .join(' and ');
      approach += `, combined with ${otherTechniques}`;
    }

    if (pressureScore >= 7) {
      approach += '. High-pressure sales approach that may feel pushy to some audiences.';
    } else if (pressureScore >= 4) {
      approach += '. Balanced approach that motivates without overwhelming.';
    } else {
      approach += '. Soft-sell approach that builds interest without pressure.';
    }

    return approach;
  }

  /**
   * Generate brand voice summary
   */
  private generateBrandVoiceSummary(tone: ToneAnalysis): string {
    const { formality, voiceCharacteristics, brandPersonality, primaryPersonality } = tone;

    const formalityDescriptions: Record<FormalityLevel, string> = {
      [FormalityLevel.CASUAL]: 'casual, friendly',
      [FormalityLevel.CONVERSATIONAL]: 'conversational, approachable',
      [FormalityLevel.PROFESSIONAL]: 'professional, polished',
      [FormalityLevel.FORMAL]: 'formal, authoritative'
    };

    const personalityDescriptions: Record<BrandPersonalityTrait, string> = {
      [BrandPersonalityTrait.SINCERITY]: 'genuine and trustworthy',
      [BrandPersonalityTrait.EXCITEMENT]: 'energetic and dynamic',
      [BrandPersonalityTrait.COMPETENCE]: 'capable and reliable',
      [BrandPersonalityTrait.SOPHISTICATION]: 'refined and elegant',
      [BrandPersonalityTrait.RUGGEDNESS]: 'bold and resilient'
    };

    let summary = `${formalityDescriptions[formality].charAt(0).toUpperCase() + formalityDescriptions[formality].slice(1)} voice`;

    // Add dominant voice characteristics
    const topCharacteristics = Object.entries(voiceCharacteristics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .filter(([_, score]) => score >= 6);

    if (topCharacteristics.length > 0) {
      const charDescriptions = topCharacteristics.map(([char, _]) => {
        const labels: Record<string, string> = {
          authority: 'authoritative',
          urgency: 'urgent',
          empathy: 'empathetic',
          confidence: 'confident',
          exclusivity: 'exclusive',
          warmth: 'warm'
        };
        return labels[char] || char;
      });
      summary += ` with ${charDescriptions.join(' and ')} undertones`;
    }

    if (primaryPersonality) {
      summary += `. Projects a ${personalityDescriptions[primaryPersonality]} brand personality`;
    }

    return summary + '.';
  }

  /**
   * Generate competitive posture insight
   */
  private generateCompetitivePosture(positioning: PositioningAnalysis): string {
    const { aggressiveness, marketPosition, positioningScore, comparisonMentions } = positioning;

    const aggressivenessDescriptions: Record<PositioningAggressiveness, string> = {
      [PositioningAggressiveness.PASSIVE]: 'Takes a non-competitive stance, focusing purely on own value proposition without referencing alternatives',
      [PositioningAggressiveness.IMPLICIT]: 'Subtly differentiates from competitors without direct comparison, suggesting superiority through implication',
      [PositioningAggressiveness.COMPARATIVE]: 'Actively compares against alternatives and competitor categories, positioning as the better choice',
      [PositioningAggressiveness.AGGRESSIVE]: 'Directly challenges competitors with explicit comparison messaging and attack positioning'
    };

    const positionDescriptions: Record<MarketPosition, string> = {
      [MarketPosition.LEADER]: 'claiming market leadership',
      [MarketPosition.CHALLENGER]: 'positioning as the superior alternative',
      [MarketPosition.NICHE]: 'owning a specialized niche',
      [MarketPosition.DISRUPTOR]: 'disrupting the status quo',
      [MarketPosition.UNKNOWN]: 'without clear market position signals'
    };

    let posture = aggressivenessDescriptions[aggressiveness];

    if (marketPosition !== MarketPosition.UNKNOWN) {
      posture += `, ${positionDescriptions[marketPosition]}`;
    }

    if (comparisonMentions.length > 0) {
      posture += `. Makes ${comparisonMentions.length} explicit comparison reference${comparisonMentions.length > 1 ? 's' : ''}`;
    }

    return posture + '.';
  }

  /**
   * Identify strategic strengths
   */
  private identifyStrengths(
    emotions: EmotionAnalysis,
    persuasion: PersuasionAnalysis,
    tone: ToneAnalysis,
    framing: FramingAnalysis,
    triggers: TriggerAnalysis,
    positioning: PositioningAnalysis
  ): string[] {
    const strengths: string[] = [];

    // Emotional strengths
    if (emotions.intensityScore >= 7) {
      strengths.push('Strong emotional resonance that captures attention');
    }
    if (emotions.emotionalArc !== EmotionalArc.FLAT) {
      strengths.push('Effective emotional storytelling with clear narrative arc');
    }
    if (emotions.primary === EmotionType.TRUST) {
      strengths.push('Leads with trust, building credibility from the start');
    }

    // Persuasion strengths
    if (persuasion.techniques.includes(PersuasionTechnique.SOCIAL_PROOF)) {
      strengths.push('Leverages social proof to build credibility');
    }
    if (persuasion.techniques.includes(PersuasionTechnique.AUTHORITY)) {
      strengths.push('Establishes authority and expertise');
    }
    if (persuasion.techniques.length >= 3 && persuasion.intensityLevel !== 'heavy') {
      strengths.push('Well-balanced multi-technique persuasion approach');
    }

    // Tone strengths
    if (tone.voiceCharacteristics.empathy >= 7) {
      strengths.push('Highly empathetic, customer-centric messaging');
    }
    if (tone.voiceCharacteristics.confidence >= 7) {
      strengths.push('Confident, assertive value communication');
    }
    if (tone.brandPersonality.length >= 2) {
      strengths.push('Strong, distinctive brand personality');
    }

    // Framing strengths
    if (framing.framingStyle === FramingStyle.GAIN && framing.focusType === 'solution') {
      strengths.push('Positive, solution-focused framing that inspires action');
    }

    // Trigger strengths
    if (triggers.detected.length >= 3) {
      strengths.push('Taps into multiple psychological motivators');
    }
    if (triggers.detected.includes(PsychologicalTrigger.ACHIEVEMENT)) {
      strengths.push('Appeals to desire for success and accomplishment');
    }

    // Positioning strengths
    if (positioning.marketPosition === MarketPosition.LEADER) {
      strengths.push('Clear leadership positioning that builds confidence');
    }
    if (positioning.marketPosition === MarketPosition.DISRUPTOR) {
      strengths.push('Bold disruptor positioning that creates differentiation');
    }

    return strengths.slice(0, 5); // Return top 5 strengths
  }

  /**
   * Identify strategic weaknesses
   */
  private identifyWeaknesses(
    emotions: EmotionAnalysis,
    persuasion: PersuasionAnalysis,
    tone: ToneAnalysis,
    framing: FramingAnalysis,
    triggers: TriggerAnalysis,
    positioning: PositioningAnalysis
  ): string[] {
    const weaknesses: string[] = [];

    // Emotional weaknesses
    if (emotions.intensityScore <= 3) {
      weaknesses.push('Low emotional intensity may fail to capture attention');
    }
    if (emotions.dominantPolarity === 'negative' && emotions.emotionalArc === EmotionalArc.FLAT) {
      weaknesses.push('Negative emotional focus without resolution can feel draining');
    }
    if (emotions.emotionalArc === EmotionalArc.FLAT && emotions.intensityScore < 5) {
      weaknesses.push('Flat emotional arc lacks compelling narrative structure');
    }

    // Persuasion weaknesses
    if (persuasion.pressureScore >= 8) {
      weaknesses.push('High-pressure tactics may alienate sophisticated buyers');
    }
    if (persuasion.techniques.length === 0) {
      weaknesses.push('Lacks persuasion techniques that motivate action');
    }
    if (persuasion.techniques.length === 1) {
      weaknesses.push('Over-reliance on single persuasion technique');
    }

    // Tone weaknesses
    if (tone.voiceCharacteristics.empathy <= 3) {
      weaknesses.push('Low empathy may feel disconnected from customer needs');
    }
    if (tone.voiceCharacteristics.warmth <= 3 && tone.formality === FormalityLevel.FORMAL) {
      weaknesses.push('Cold, formal tone may hinder emotional connection');
    }
    if (tone.brandPersonality.length === 0) {
      weaknesses.push('Lacks distinctive brand personality');
    }

    // Framing weaknesses
    if (framing.focusType === 'problem' && framing.primaryFrame === 'negative') {
      weaknesses.push('Heavy problem focus without clear solution presentation');
    }

    // Trigger weaknesses
    if (triggers.detected.length === 0) {
      weaknesses.push('Misses psychological trigger opportunities');
    }

    // Positioning weaknesses
    if (positioning.marketPosition === MarketPosition.UNKNOWN) {
      weaknesses.push('Unclear market positioning leaves differentiation ambiguous');
    }
    if (positioning.aggressiveness === PositioningAggressiveness.AGGRESSIVE) {
      weaknesses.push('Aggressive positioning may appear insecure or desperate');
    }

    return weaknesses.slice(0, 5); // Return top 5 weaknesses
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    emotions: EmotionAnalysis,
    persuasion: PersuasionAnalysis,
    tone: ToneAnalysis,
    framing: FramingAnalysis,
    triggers: TriggerAnalysis,
    positioning: PositioningAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Emotional recommendations
    if (emotions.intensityScore <= 4) {
      recommendations.push('Increase emotional intensity with stronger language and more vivid imagery');
    }
    if (emotions.emotionalArc === EmotionalArc.FLAT) {
      recommendations.push('Create a problem-solution emotional arc to drive engagement');
    }
    if (!emotions.secondary.includes(EmotionType.TRUST) && emotions.primary !== EmotionType.TRUST) {
      recommendations.push('Add trust-building elements (testimonials, credentials) to strengthen credibility');
    }

    // Persuasion recommendations
    if (!persuasion.techniques.includes(PersuasionTechnique.SOCIAL_PROOF)) {
      recommendations.push('Add social proof elements (customer counts, reviews, logos) to build credibility');
    }
    if (!persuasion.techniques.includes(PersuasionTechnique.URGENCY) && !persuasion.techniques.includes(PersuasionTechnique.SCARCITY)) {
      recommendations.push('Consider adding urgency or scarcity elements to drive immediate action');
    }
    if (persuasion.pressureScore >= 8) {
      recommendations.push('Reduce pressure intensity to avoid alienating discerning buyers');
    }

    // Tone recommendations
    if (tone.voiceCharacteristics.empathy <= 4) {
      recommendations.push('Increase empathy by addressing customer pain points and showing understanding');
    }
    if (tone.voiceCharacteristics.exclusivity <= 3 && positioning.marketPosition !== MarketPosition.NICHE) {
      recommendations.push('Consider adding exclusivity elements to increase perceived value');
    }

    // Framing recommendations
    if (framing.focusType === 'problem') {
      recommendations.push('Balance problem agitation with clear solution presentation');
    }
    if (framing.timeOrientation === 'past') {
      recommendations.push('Shift time orientation to future benefits to inspire action');
    }

    // Trigger recommendations
    const missingHighImpactTriggers = [
      PsychologicalTrigger.ACHIEVEMENT,
      PsychologicalTrigger.BELONGING,
      PsychologicalTrigger.SECURITY
    ].filter(t => !triggers.detected.includes(t));

    if (missingHighImpactTriggers.length > 0) {
      const triggerNames: Record<PsychologicalTrigger, string> = {
        [PsychologicalTrigger.IDENTITY]: 'identity',
        [PsychologicalTrigger.STATUS]: 'status',
        [PsychologicalTrigger.BELONGING]: 'belonging',
        [PsychologicalTrigger.ACHIEVEMENT]: 'achievement',
        [PsychologicalTrigger.SECURITY]: 'security',
        [PsychologicalTrigger.FREEDOM]: 'freedom',
        [PsychologicalTrigger.NOVELTY]: 'novelty',
        [PsychologicalTrigger.NOSTALGIA]: 'nostalgia',
        [PsychologicalTrigger.CURIOSITY]: 'curiosity',
        [PsychologicalTrigger.SELF_IMPROVEMENT]: 'self-improvement'
      };
      recommendations.push(`Consider tapping into ${triggerNames[missingHighImpactTriggers[0]]} psychological trigger for deeper resonance`);
    }

    // Positioning recommendations
    if (positioning.marketPosition === MarketPosition.UNKNOWN) {
      recommendations.push('Clarify market positioning to strengthen differentiation');
    }
    if (positioning.aggressiveness === PositioningAggressiveness.PASSIVE && positioning.comparisonMentions.length === 0) {
      recommendations.push('Consider implicit differentiation to highlight unique value vs alternatives');
    }

    return recommendations.slice(0, 6); // Return top 6 recommendations
  }
}

/**
 * Quick insights generation
 */
export function generateInsights(
  emotions: EmotionAnalysis,
  persuasion: PersuasionAnalysis,
  tone: ToneAnalysis,
  framing: FramingAnalysis,
  triggers: TriggerAnalysis,
  positioning: PositioningAnalysis
): StrategicInsights {
  const generator = new InsightsGenerator();
  return generator.generate(emotions, persuasion, tone, framing, triggers, positioning);
}
