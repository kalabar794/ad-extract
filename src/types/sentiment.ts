/**
 * Sentiment Analysis Types
 *
 * Comprehensive types for psychological and emotional analysis of ad copy.
 * Designed for senior marketers who need deep competitive intelligence.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Primary emotions based on Plutchik's Wheel of Emotions
 */
export enum EmotionType {
  JOY = 'joy',
  TRUST = 'trust',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  ANTICIPATION = 'anticipation',
  SADNESS = 'sadness',
  ANGER = 'anger',
  DISGUST = 'disgust'
}

/**
 * Persuasion techniques based on Cialdini's principles and marketing psychology
 */
export enum PersuasionTechnique {
  SCARCITY = 'scarcity',
  SOCIAL_PROOF = 'social_proof',
  AUTHORITY = 'authority',
  RECIPROCITY = 'reciprocity',
  COMMITMENT = 'commitment',
  LIKING = 'liking',
  URGENCY = 'urgency',
  FOMO = 'fomo',
  ANCHORING = 'anchoring',
  EXCLUSIVITY = 'exclusivity'
}

/**
 * Deep psychological triggers used in advertising
 */
export enum PsychologicalTrigger {
  IDENTITY = 'identity',
  STATUS = 'status',
  BELONGING = 'belonging',
  ACHIEVEMENT = 'achievement',
  SECURITY = 'security',
  FREEDOM = 'freedom',
  NOVELTY = 'novelty',
  NOSTALGIA = 'nostalgia',
  CURIOSITY = 'curiosity',
  SELF_IMPROVEMENT = 'self_improvement'
}

/**
 * Brand personality traits (Big Five for Brands)
 */
export enum BrandPersonalityTrait {
  SINCERITY = 'sincerity',
  EXCITEMENT = 'excitement',
  COMPETENCE = 'competence',
  SOPHISTICATION = 'sophistication',
  RUGGEDNESS = 'ruggedness'
}

/**
 * Emotional arc patterns in ad copy
 */
export enum EmotionalArc {
  PROBLEM_SOLUTION = 'problem_solution',
  ASPIRATION_ACTION = 'aspiration_action',
  FEAR_TRUST = 'fear_trust',
  CURIOSITY_SATISFACTION = 'curiosity_satisfaction',
  FLAT = 'flat'
}

/**
 * Formality levels in copy
 */
export enum FormalityLevel {
  CASUAL = 'casual',
  CONVERSATIONAL = 'conversational',
  PROFESSIONAL = 'professional',
  FORMAL = 'formal'
}

/**
 * Framing styles
 */
export enum FramingStyle {
  GAIN = 'gain',
  LOSS = 'loss',
  RISK = 'risk',
  OPPORTUNITY = 'opportunity'
}

/**
 * Competitive positioning aggressiveness
 */
export enum PositioningAggressiveness {
  PASSIVE = 'passive',
  IMPLICIT = 'implicit',
  COMPARATIVE = 'comparative',
  AGGRESSIVE = 'aggressive'
}

/**
 * Market position signals
 */
export enum MarketPosition {
  LEADER = 'leader',
  CHALLENGER = 'challenger',
  NICHE = 'niche',
  DISRUPTOR = 'disruptor',
  UNKNOWN = 'unknown'
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Voice characteristics on a 1-10 scale
 */
export interface VoiceCharacteristics {
  authority: number;    // Expert, commanding vs peer-like
  urgency: number;      // Time-sensitive vs relaxed
  empathy: number;      // Customer-focused vs feature-focused
  confidence: number;   // Assertive vs hedging
  exclusivity: number;  // Premium vs mass market
  warmth: number;       // Friendly vs professional/distant
}

/**
 * Overall sentiment classification
 */
export interface OverallSentiment {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;        // -1 to 1 scale
  confidence: number;   // 0 to 1 confidence score
}

/**
 * Detailed emotion analysis
 */
export interface EmotionAnalysis {
  primary: EmotionType;
  secondary: EmotionType[];
  intensityScore: number;  // 1-10 scale
  emotionalArc: EmotionalArc;
  emotionBreakdown: Record<EmotionType, number>;
  dominantPolarity: 'positive' | 'negative' | 'mixed';
}

/**
 * Persuasion technique analysis
 */
export interface PersuasionAnalysis {
  techniques: PersuasionTechnique[];
  intensityLevel: 'light' | 'moderate' | 'heavy';
  primaryTechnique: PersuasionTechnique | null;
  techniqueCount: number;
  pressureScore: number;  // 1-10 scale
  detectedPatterns: Array<{
    technique: PersuasionTechnique;
    match: string;
    confidence: number;
  }>;
}

/**
 * Tone and voice analysis
 */
export interface ToneAnalysis {
  formality: FormalityLevel;
  formalityScore: number;  // 1-10 scale (1=casual, 10=formal)
  voiceCharacteristics: VoiceCharacteristics;
  brandPersonality: BrandPersonalityTrait[];
  primaryPersonality: BrandPersonalityTrait | null;
  voiceSummary: string;
}

/**
 * Framing analysis
 */
export interface FramingAnalysis {
  primaryFrame: 'positive' | 'negative' | 'balanced';
  framingStyle: FramingStyle;
  timeOrientation: 'present' | 'future' | 'past';
  focusType: 'problem' | 'solution' | 'balanced';
  framingSignals: string[];
}

/**
 * Psychological trigger analysis
 */
export interface TriggerAnalysis {
  detected: PsychologicalTrigger[];
  primaryTrigger: PsychologicalTrigger | null;
  triggerIntensity: Record<PsychologicalTrigger, number>;
  triggerSignals: Array<{
    trigger: PsychologicalTrigger;
    match: string;
    strength: number;
  }>;
}

/**
 * Competitive positioning analysis
 */
export interface PositioningAnalysis {
  aggressiveness: PositioningAggressiveness;
  marketPosition: MarketPosition;
  competitiveSignals: string[];
  comparisonMentions: string[];
  positioningScore: number;  // 1-10 (1=passive, 10=aggressive)
}

/**
 * Auto-generated strategic insights
 */
export interface StrategicInsights {
  emotionalStrategy: string;
  persuasionApproach: string;
  brandVoiceSummary: string;
  competitivePosture: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  recommendations: string[];
}

/**
 * Complete sentiment analysis for a single ad
 */
export interface SentimentAnalysis {
  // Input reference
  adId?: string;
  text: string;
  analyzedAt: string;

  // Overall sentiment
  overall: OverallSentiment;

  // Emotional analysis
  emotions: EmotionAnalysis;

  // Persuasion techniques
  persuasion: PersuasionAnalysis;

  // Tone & voice
  tone: ToneAnalysis;

  // Framing
  framing: FramingAnalysis;

  // Psychological triggers
  triggers: TriggerAnalysis;

  // Competitive positioning
  positioning: PositioningAnalysis;

  // Strategic insights (auto-generated)
  strategicInsights: StrategicInsights;

  // Analysis metadata
  metadata: {
    wordCount: number;
    sentenceCount: number;
    analysisVersion: string;
    processingTimeMs: number;
  };
}

/**
 * Voice profile for aggregate analysis
 */
export interface VoiceProfile {
  personality: BrandPersonalityTrait[];
  consistencyScore: number;  // How consistent across ads (0-1)
  avgFormality: number;
  voiceDescription: string;
  dominantTraits: Array<{ trait: BrandPersonalityTrait; frequency: number }>;
}

/**
 * Competitive posture summary
 */
export interface CompetitivePosture {
  aggressivenessLevel: string;
  positioningStrategy: string;
  threatLevel: 'low' | 'medium' | 'high';
  competitiveIntensity: number;  // 1-10
}

/**
 * Strategic opportunities identified from gaps
 */
export interface StrategicOpportunities {
  emotionalGaps: string[];      // Emotions competitor doesn't use
  voiceOpportunities: string[]; // Voice differentiators
  persuasionGaps: string[];     // Unused persuasion techniques
  positioningGaps: string[];    // Positioning opportunities
}

/**
 * Aggregate sentiment summary for multiple ads
 */
export interface SentimentSummary {
  competitor: string;
  adsAnalyzed: number;
  analysisDate: string;

  // Dominant emotional patterns
  dominantEmotion: EmotionType;
  emotionDistribution: Record<EmotionType, number>;
  avgEmotionalIntensity: number;
  emotionalConsistency: number;  // 0-1, how consistent emotional approach

  // Persuasion profile
  mostUsedTechniques: PersuasionTechnique[];
  techniqueDistribution: Record<PersuasionTechnique, number>;
  avgPressureScore: number;
  persuasionStyle: string;

  // Voice profile
  brandVoiceProfile: VoiceProfile;

  // Framing patterns
  framingPatterns: {
    dominantFrame: 'positive' | 'negative' | 'balanced';
    dominantStyle: FramingStyle;
    frameDistribution: Record<string, number>;
  };

  // Psychological triggers
  dominantTriggers: PsychologicalTrigger[];
  triggerDistribution: Record<PsychologicalTrigger, number>;

  // Competitive intelligence
  competitivePosture: CompetitivePosture;

  // Strategic opportunities
  opportunities: StrategicOpportunities;

  // Overall sentiment distribution
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  avgSentimentScore: number;

  // Actionable recommendations
  recommendations: string[];

  // Top insights
  topInsights: string[];

  // Metadata
  metadata: {
    analysisVersion: string;
    totalProcessingTimeMs: number;
  };
}

/**
 * Emotion lexicon entry with intensity levels
 */
export interface EmotionLexiconEntry {
  strong: string[];
  moderate: string[];
  mild: string[];
}

/**
 * Emotion lexicon type
 */
export type EmotionLexicon = Record<EmotionType, EmotionLexiconEntry>;

/**
 * Pattern match result
 */
export interface PatternMatch {
  pattern: RegExp;
  match: string;
  index: number;
}

/**
 * Analysis configuration options
 */
export interface SentimentAnalysisOptions {
  includeStrategicInsights?: boolean;
  emotionIntensityThreshold?: number;
  persuasionConfidenceThreshold?: number;
  includeRawMatches?: boolean;
  language?: 'en';  // Currently only English supported
}
