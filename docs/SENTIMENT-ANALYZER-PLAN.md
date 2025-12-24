# Sentiment Analyzer Design Plan

## Purpose

A sophisticated sentiment and psychological analysis engine designed for **senior marketers** who need to understand not just *what* competitors are saying, but *how* they're saying it and *why* it works. Goes far beyond simple positive/negative classification to extract actionable competitive intelligence about emotional strategies, persuasion techniques, and brand voice positioning.

---

## Core Analysis Dimensions

### 1. Emotional Tone Analysis

Detect and quantify the emotional landscape of competitor advertising.

#### Primary Emotions (Plutchik's Wheel)
| Emotion | Detection Signals | Marketing Application |
|---------|-------------------|----------------------|
| **Joy** | happy, excited, amazing, love, celebrate, thrilled, delighted | Aspiration, lifestyle marketing |
| **Trust** | guaranteed, proven, certified, secure, reliable, trusted | Credibility, risk reduction |
| **Fear** | don't miss, lose, risk, problem, danger, before it's too late | FOMO, urgency, problem agitation |
| **Surprise** | introducing, announcing, new, revolutionary, breakthrough | Innovation, curiosity |
| **Anticipation** | coming soon, get ready, imagine, what if, future | Pre-launch, aspiration |
| **Sadness** | struggling, tired, frustrated, disappointed, stuck | Problem identification, empathy |
| **Anger** | fed up, sick of, enough, stop, no more | Pain point activation |
| **Disgust** | hate, terrible, awful, worst, disgusted | Competitive positioning, problem highlight |

#### Emotional Intensity Score (1-10)
- **Low (1-3)**: Subtle emotional cues, professional tone
- **Medium (4-6)**: Clear emotional engagement, balanced approach
- **High (7-10)**: Strong emotional appeals, dramatic language

#### Emotional Arc Analysis
Track how emotions flow through the ad copy:
- **Problem → Solution**: Start with pain, end with relief
- **Aspiration → Action**: Start with dream, end with CTA
- **Fear → Trust**: Start with risk, end with security
- **Curiosity → Satisfaction**: Start with question, end with answer

### 2. Persuasion Technique Detection

Identify Cialdini's principles and other persuasion frameworks in competitor ads.

#### Detected Techniques
| Technique | Signals | Example Patterns |
|-----------|---------|------------------|
| **Scarcity** | limited, only X left, last chance, expires | "Only 3 spots remaining" |
| **Social Proof** | X customers, reviews, testimonials, as seen in | "Join 50,000+ happy customers" |
| **Authority** | expert, doctor, #1, award-winning, certified | "Recommended by leading dermatologists" |
| **Reciprocity** | free, gift, bonus, complimentary | "Free consultation + bonus guide" |
| **Commitment** | step 1, start your journey, begin today | "Take the first step today" |
| **Liking** | we understand, like you, just like me | "We know how frustrating it can be" |
| **Urgency** | now, today only, act fast, limited time | "Offer expires midnight!" |
| **FOMO** | don't miss, others are, selling fast | "While supplies last" |

#### Persuasion Intensity Index
Calculate overall persuasion pressure:
- **Light**: 1-2 techniques, subtle application
- **Moderate**: 3-4 techniques, clear but not aggressive
- **Heavy**: 5+ techniques, high-pressure sales approach

### 3. Tone & Voice Analysis

Understand the brand personality conveyed through ad copy.

#### Formality Spectrum
```
Casual ←————————————→ Formal
  |                      |
"Hey there!"      "Dear valued customer"
"Check this out"  "We invite you to explore"
"Grab yours"      "Secure your acquisition"
```

#### Voice Characteristics
| Dimension | Low Score | High Score |
|-----------|-----------|------------|
| **Authority** | Peer-like, relatable | Expert, commanding |
| **Urgency** | Relaxed, no pressure | Time-sensitive, immediate |
| **Empathy** | Feature-focused | Customer-focused, understanding |
| **Confidence** | Hedging, careful | Assertive, bold claims |
| **Exclusivity** | Mass market | Premium, selective |
| **Warmth** | Professional, distant | Friendly, personal |

#### Brand Personality Traits (Big Five for Brands)
- **Sincerity**: Honest, wholesome, down-to-earth
- **Excitement**: Daring, spirited, imaginative, up-to-date
- **Competence**: Reliable, intelligent, successful
- **Sophistication**: Upper class, charming, glamorous
- **Ruggedness**: Outdoorsy, tough, strong

### 4. Framing Analysis

How competitors frame their value proposition.

#### Framing Dimensions
| Dimension | Negative Frame | Positive Frame |
|-----------|----------------|----------------|
| **Outcome** | "Stop losing money" | "Start saving more" |
| **Time** | "Don't wait another day" | "Begin your journey today" |
| **Risk** | "Avoid these mistakes" | "Make smart choices" |
| **Competition** | "Unlike other products" | "The best solution" |
| **Problem/Solution** | "Struggling with X?" | "Achieve Y effortlessly" |

#### Frame Effectiveness Indicators
- **Loss Aversion**: Emphasizes what customer might lose
- **Gain Framing**: Emphasizes what customer will gain
- **Risk Framing**: Highlights dangers/problems
- **Opportunity Framing**: Highlights possibilities/benefits

### 5. Psychological Triggers

Deep psychological appeals used in advertising.

#### Trigger Categories
| Trigger | Description | Detection Patterns |
|---------|-------------|-------------------|
| **Identity** | Appeals to who customer wants to be | "For professionals who...", "Smart people choose..." |
| **Status** | Appeals to social standing | "Premium", "exclusive", "elite", "VIP" |
| **Belonging** | Appeals to community/tribe | "Join thousands", "community", "family" |
| **Achievement** | Appeals to accomplishment | "Reach your goals", "succeed", "accomplish" |
| **Security** | Appeals to safety/stability | "Protect", "secure", "guaranteed", "safe" |
| **Freedom** | Appeals to autonomy | "Your way", "choose", "control", "flexible" |
| **Novelty** | Appeals to curiosity | "New", "discover", "first", "revolutionary" |
| **Nostalgia** | Appeals to past/tradition | "Classic", "trusted since", "traditional" |

### 6. Competitive Positioning Sentiment

How aggressively competitors position against alternatives.

#### Positioning Aggressiveness Scale
1. **Passive**: No mention of competition
2. **Implicit**: "Unlike others", "the better choice"
3. **Comparative**: "Better than X", "compared to alternatives"
4. **Aggressive**: Direct competitor callouts, attack messaging

#### Market Position Signals
- **Leader**: "The #1", "industry leader", "most trusted"
- **Challenger**: "Better alternative", "switch from X"
- **Niche**: "Specialized for", "designed specifically"
- **Disruptor**: "Revolutionary", "changing the game"

---

## Output Structure

### SentimentAnalysis Interface

```typescript
interface SentimentAnalysis {
  // Overall Sentiment
  overall: {
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number; // -1 to 1
    confidence: number;
  };

  // Emotional Analysis
  emotions: {
    primary: EmotionType;
    secondary: EmotionType[];
    intensityScore: number; // 1-10
    emotionalArc: 'problem_solution' | 'aspiration_action' | 'fear_trust' | 'curiosity_satisfaction' | 'flat';
    emotionBreakdown: Record<EmotionType, number>;
  };

  // Persuasion Techniques
  persuasion: {
    techniques: PersuasionTechnique[];
    intensityLevel: 'light' | 'moderate' | 'heavy';
    primaryTechnique: PersuasionTechnique;
    techniqueCount: number;
    pressureScore: number; // 1-10
  };

  // Tone & Voice
  tone: {
    formality: 'casual' | 'conversational' | 'professional' | 'formal';
    formalityScore: number; // 1-10
    voiceCharacteristics: {
      authority: number;
      urgency: number;
      empathy: number;
      confidence: number;
      exclusivity: number;
      warmth: number;
    };
    brandPersonality: BrandPersonalityTrait[];
    voiceSummary: string;
  };

  // Framing
  framing: {
    primaryFrame: 'positive' | 'negative' | 'balanced';
    framingStyle: 'gain' | 'loss' | 'risk' | 'opportunity';
    timeOrientation: 'present' | 'future' | 'past';
    focusType: 'problem' | 'solution' | 'balanced';
  };

  // Psychological Triggers
  triggers: {
    detected: PsychologicalTrigger[];
    primaryTrigger: PsychologicalTrigger;
    triggerIntensity: Record<PsychologicalTrigger, number>;
  };

  // Competitive Positioning
  positioning: {
    aggressiveness: 'passive' | 'implicit' | 'comparative' | 'aggressive';
    marketPosition: 'leader' | 'challenger' | 'niche' | 'disruptor' | 'unknown';
    competitiveSignals: string[];
  };

  // Strategic Insights (Auto-generated)
  strategicInsights: {
    emotionalStrategy: string;
    persuasionApproach: string;
    brandVoiceSummary: string;
    competitivePosture: string;
    recommendations: string[];
  };
}
```

### Aggregate Sentiment Summary (Multiple Ads)

```typescript
interface SentimentSummary {
  competitor: string;
  adsAnalyzed: number;
  analysisDate: string;

  // Dominant Patterns
  dominantEmotion: EmotionType;
  emotionDistribution: Record<EmotionType, number>;
  avgEmotionalIntensity: number;

  // Persuasion Profile
  mostUsedTechniques: PersuasionTechnique[];
  avgPressureScore: number;
  persuasionStyle: string;

  // Voice Profile
  brandVoiceProfile: {
    personality: BrandPersonalityTrait[];
    consistencyScore: number; // How consistent across ads
    avgFormality: number;
    voiceDescription: string;
  };

  // Competitive Intelligence
  competitivePosture: {
    aggressivenessLevel: string;
    positioningStrategy: string;
    threatLevel: 'low' | 'medium' | 'high';
  };

  // Strategic Opportunities
  opportunities: {
    emotionalGaps: string[]; // Emotions competitor doesn't use
    voiceOpportunities: string[]; // Voice differentiators
    persuasionGaps: string[]; // Unused persuasion techniques
  };

  // Actionable Recommendations
  recommendations: string[];
}
```

---

## Implementation Approach

### Phase 1: Core Emotion Detection
- Lexicon-based emotion detection using validated dictionaries (NRC, LIWC-inspired)
- Pattern matching for emotional phrases
- Intensity scoring based on modifiers (very, extremely, etc.)

### Phase 2: Persuasion Analysis
- Rule-based technique detection
- Co-occurrence patterns (multiple techniques together)
- Intensity scoring based on frequency and prominence

### Phase 3: Tone & Voice
- Formality scoring using linguistic features (contractions, sentence length, vocabulary)
- Voice characteristic detection using keyword clusters
- Brand personality classification using trait markers

### Phase 4: Advanced Analysis
- Framing detection using semantic patterns
- Psychological trigger identification
- Competitive positioning analysis

### Phase 5: Strategic Insights
- Auto-generate insights from analysis
- Identify opportunities and gaps
- Produce actionable recommendations

---

## Detection Lexicons (Partial)

### Emotion Lexicon Sample
```typescript
const emotionLexicon = {
  joy: {
    strong: ['thrilled', 'ecstatic', 'amazing', 'incredible', 'fantastic', 'wonderful'],
    moderate: ['happy', 'pleased', 'glad', 'delighted', 'excited', 'great'],
    mild: ['nice', 'good', 'fine', 'okay', 'pleasant']
  },
  fear: {
    strong: ['terrifying', 'devastating', 'catastrophic', 'crisis', 'urgent'],
    moderate: ['worried', 'concerned', 'anxious', 'risk', 'danger', 'threat'],
    mild: ['uncertain', 'unsure', 'hesitant', 'careful']
  },
  trust: {
    strong: ['guaranteed', 'proven', 'certified', 'verified', 'trusted'],
    moderate: ['reliable', 'dependable', 'secure', 'safe', 'authentic'],
    mild: ['honest', 'real', 'genuine', 'true']
  },
  // ... other emotions
};
```

### Persuasion Pattern Sample
```typescript
const persuasionPatterns = {
  scarcity: [
    /only\s*\d+\s*(left|remaining|available)/i,
    /limited\s*(time|stock|availability|spots?|seats?)/i,
    /while\s*(supplies?|stocks?)\s*last/i,
    /selling\s*(out|fast)/i,
    /last\s*chance/i,
    /ends?\s*(soon|today|tonight)/i
  ],
  socialProof: [
    /\d+[,\d]*\+?\s*(customers?|users?|clients?|people)/i,
    /join\s*\d+/i,
    /trusted\s*by/i,
    /★{3,}|⭐{3,}/,
    /as\s*seen\s*(in|on)/i,
    /rated\s*#?\d/i
  ],
  authority: [
    /\b(dr\.|doctor|expert|specialist|professional)\b/i,
    /#1|number\s*one|best[\s-]?selling/i,
    /award[\s-]?winning/i,
    /certified|accredited|licensed/i,
    /recommended\s*by/i
  ],
  // ... other techniques
};
```

---

## Value for Senior Marketers

### Strategic Questions Answered

1. **"What emotional buttons are competitors pushing?"**
   → Emotion analysis reveals primary emotional appeals

2. **"How aggressive is their sales approach?"**
   → Persuasion intensity and technique stacking analysis

3. **"What's their brand voice/personality?"**
   → Tone analysis and brand personality traits

4. **"Are they positioning against us?"**
   → Competitive positioning and aggressiveness scoring

5. **"Where are the gaps we can exploit?"**
   → Opportunity identification in unused emotions, techniques, and voice

6. **"How consistent is their messaging?"**
   → Voice consistency scoring across ad portfolio

### Report Integration

The sentiment analysis will integrate into:
- **Executive Summary**: Key emotional and persuasion insights
- **Competitor Intelligence Report**: Full sentiment breakdown
- **Opportunity Analysis**: Gaps in competitor emotional/persuasion approach
- **Creative Brief Recommendations**: Counter-positioning strategies

---

## Technical Considerations

### NLP Libraries to Leverage
- `natural` - Tokenization, stemming, sentiment basics
- `compromise` - Part-of-speech tagging, entity extraction
- Custom lexicons for marketing-specific analysis

### Performance
- Analysis should complete in < 500ms per ad
- Batch processing for portfolios of 50+ ads
- Caching of lexicon lookups

### Accuracy Goals
- Emotion detection: 80%+ agreement with human raters
- Persuasion technique detection: 85%+ precision
- Tone classification: 75%+ accuracy

---

## Future Enhancements

1. **Machine Learning Models**: Train on labeled ad datasets for improved accuracy
2. **Industry Benchmarks**: Compare sentiment to industry norms
3. **Trend Analysis**: Track emotional shifts over time
4. **A/B Insight**: Correlate sentiment patterns with ad longevity
5. **Competitive Alerts**: Notify when competitor changes emotional strategy
