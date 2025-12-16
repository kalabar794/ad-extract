/**
 * Ad categorization rules and patterns
 */

import { AdCategory } from '../types/ad';

export interface CategoryRule {
  category: AdCategory;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}

export const categoryRules: CategoryRule[] = [
  {
    category: AdCategory.TESTIMONIAL,
    patterns: [
      /[""].*[""]/,  // Quoted text
      /⭐|★|stars?|rating/i,
      /\d+\s*(out of|\/)\s*\d+/i,  // X out of Y ratings
      /verified\s*(buyer|customer|review)/i
    ],
    keywords: [
      'testimonial', 'review', 'experience', 'customer story',
      'client says', 'patient says', 'what they say',
      'loved it', 'changed my life', 'highly recommend',
      'real results', 'success story', 'case study'
    ],
    weight: 1.5
  },
  {
    category: AdCategory.OFFER_PROMO,
    patterns: [
      /\d+%\s*off/i,
      /\$\d+/,
      /save\s*\$?\d+/i,
      /free\s+(shipping|delivery|trial|consultation)/i,
      /bogo|buy\s*\d+\s*get/i,
      /limited\s*(time|offer|availability)/i,
      /ends?\s*(soon|today|tomorrow|\d)/i,
      /code:?\s*\w+/i  // Promo codes
    ],
    keywords: [
      'discount', 'sale', 'deal', 'offer', 'promo', 'special',
      'savings', 'clearance', 'markdown', 'reduced',
      'flash sale', 'exclusive offer', 'member discount',
      'today only', 'act now', 'hurry', 'while supplies last'
    ],
    weight: 1.5
  },
  {
    category: AdCategory.EDUCATIONAL,
    patterns: [
      /how\s+to/i,
      /\d+\s*(tips?|ways?|steps?|secrets?)/i,
      /learn\s+(how|about|more)/i,
      /guide\s+to/i,
      /what\s+(is|are|you\s+need)/i
    ],
    keywords: [
      'learn', 'discover', 'understand', 'education', 'training',
      'tutorial', 'guide', 'tips', 'advice', 'how-to',
      'masterclass', 'webinar', 'workshop', 'course',
      'did you know', 'myth', 'fact', 'truth about'
    ],
    weight: 1.2
  },
  {
    category: AdCategory.PRODUCT_FEATURE,
    patterns: [
      /introducing|new\s+(feature|product|release)/i,
      /now\s+(available|with)/i,
      /features?:|includes?:/i,
      /built[\s-]*(in|with)/i
    ],
    keywords: [
      'feature', 'specification', 'capability', 'functionality',
      'performance', 'design', 'technology', 'innovation',
      'upgrade', 'enhanced', 'improved', 'advanced',
      'powerful', 'premium', 'professional', 'enterprise'
    ],
    weight: 1.0
  },
  {
    category: AdCategory.BRAND_AWARENESS,
    patterns: [
      /who\s+we\s+are/i,
      /our\s+(mission|story|values)/i,
      /since\s+\d{4}/i,
      /trusted\s+by/i
    ],
    keywords: [
      'brand', 'company', 'about us', 'our story', 'mission',
      'vision', 'values', 'trusted', 'established', 'founded',
      'industry leader', 'award-winning', 'recognized',
      'commitment', 'dedicated', 'passionate'
    ],
    weight: 0.8
  },
  {
    category: AdCategory.EVENT,
    patterns: [
      /join\s+us\s+(for|at)/i,
      /register\s+(now|today|for)/i,
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,  // Date patterns
      /(virtual|live|in-person)\s+(event|webinar|conference)/i,
      /save\s+the\s+date/i
    ],
    keywords: [
      'event', 'webinar', 'conference', 'summit', 'meetup',
      'workshop', 'seminar', 'expo', 'trade show',
      'register', 'rsvp', 'attend', 'join us',
      'happening', 'live', 'virtual', 'in-person'
    ],
    weight: 1.3
  },
  {
    category: AdCategory.HIRING,
    patterns: [
      /we['']?re\s+hiring/i,
      /join\s+(our|the)\s+team/i,
      /career\s+(opportunity|opportunities)/i,
      /now\s+hiring/i,
      /apply\s+(now|today)/i
    ],
    keywords: [
      'hiring', 'job', 'career', 'position', 'opening',
      'opportunity', 'recruit', 'employment', 'work with us',
      'team', 'talent', 'candidate', 'apply',
      'benefits', 'salary', 'remote', 'hybrid'
    ],
    weight: 1.5
  },
  {
    category: AdCategory.URGENCY_SCARCITY,
    patterns: [
      /ends?\s*(soon|today|tomorrow|tonight|midnight)/i,
      /last\s*(chance|call|day|hours?)/i,
      /only\s*\d+\s*(left|remaining|available|spots?|seats?)/i,
      /limited\s*(time|stock|availability|quantities?|spots?)/i,
      /\d+\s*(hours?|days?|minutes?)\s*(left|remaining)/i,
      /while\s*(supplies?|stocks?)\s*last/i,
      /selling\s*(out|fast)/i,
      /don['']?t\s+miss\s+(out|this)/i,
      /before\s+it['']?s\s+gone/i,
      /closing\s+soon/i,
      /final\s*(hours?|days?|chance|call)/i,
      /expires?\s*(soon|today|\d)/i,
      /countdown|timer|deadline/i
    ],
    keywords: [
      'hurry', 'rush', 'urgent', 'now', 'immediately', 'instant',
      'today only', 'tonight only', 'this week only', 'this weekend',
      'act fast', 'act now', 'quick', 'fast', 'asap',
      'running out', 'almost gone', 'few left', 'selling fast',
      'exclusive', 'rare', 'scarce', 'limited edition',
      'once in a lifetime', 'never again', 'one-time',
      'expiring', 'deadline', 'cutoff', 'final',
      'waitlist', 'sold out soon', 'high demand'
    ],
    weight: 1.6
  },
  {
    category: AdCategory.PROBLEM_SOLUTION,
    patterns: [
      /tired\s+of/i,
      /sick\s+(of|and\s+tired)/i,
      /struggling\s+(with|to)/i,
      /frustrated\s+(with|by)/i,
      /fed\s+up\s+(with|of)/i,
      /having\s+trouble/i,
      /can['']?t\s+seem\s+to/i,
      /finally\s+(a\s+)?(solution|answer|way)/i,
      /say\s+goodbye\s+to/i,
      /no\s+more\s+\w+ing/i,
      /stop\s+\w+ing/i,
      /end\s+(your|the)\s+\w+/i,
      /eliminate\s+(your)?/i,
      /solve\s+(your|the)/i,
      /fix\s+(your|the)/i,
      /get\s+rid\s+of/i,
      /without\s+(the\s+)?(hassle|worry|stress|pain)/i,
      /never\s+(again|worry)/i,
      /imagine\s+(if|a\s+world|life)/i,
      /what\s+if\s+(you|there)/i
    ],
    keywords: [
      'problem', 'solution', 'solve', 'fix', 'resolve', 'overcome',
      'struggle', 'challenge', 'difficulty', 'issue', 'pain point',
      'frustrated', 'annoyed', 'tired', 'exhausted', 'overwhelmed',
      'finally', 'at last', 'no more', 'goodbye', 'end',
      'relief', 'freedom', 'escape', 'break free',
      'transform', 'change', 'improve', 'upgrade',
      'hassle-free', 'worry-free', 'stress-free', 'pain-free',
      'effortless', 'seamless', 'simple', 'easy',
      'breakthrough', 'game-changer', 'revolutionary'
    ],
    weight: 1.4
  },
  {
    category: AdCategory.COMPARISON,
    patterns: [
      /\bvs\.?\b/i,
      /\bversus\b/i,
      /compared\s+to/i,
      /unlike\s+(other|the|most)/i,
      /better\s+than/i,
      /faster\s+than/i,
      /cheaper\s+than/i,
      /more\s+\w+\s+than/i,
      /switch\s+(from|to)/i,
      /alternative\s+to/i,
      /instead\s+of/i,
      /why\s+(choose|pick|select)/i,
      /what\s+makes\s+us\s+different/i,
      /stand\s+out\s+from/i,
      /not\s+your\s+(average|typical|ordinary)/i,
      /forget\s+(about\s+)?(other|everything)/i,
      /the\s+only\s+\w+\s+that/i,
      /\#1|\bno\.\s*1\b|number\s+one/i,
      /leading|best-in-class|top-rated/i
    ],
    keywords: [
      'vs', 'versus', 'compare', 'comparison', 'alternative',
      'better', 'best', 'superior', 'premium', 'leading',
      'unlike', 'different', 'unique', 'only', 'exclusive',
      'switch', 'upgrade', 'replace', 'ditch', 'dump',
      'competitor', 'competition', 'other brands', 'others',
      'outperform', 'outshine', 'beat', 'win', 'dominate',
      'why us', 'why choose', 'difference', 'advantage',
      'stand out', 'set apart', 'distinguish',
      'first', 'original', 'pioneer', 'innovator'
    ],
    weight: 1.3
  }
];

/**
 * Get rules for a specific category
 */
export function getRulesForCategory(category: AdCategory): CategoryRule | undefined {
  return categoryRules.find(rule => rule.category === category);
}

/**
 * Get all category keywords as a flat array
 */
export function getAllKeywords(): string[] {
  return categoryRules.flatMap(rule => rule.keywords);
}
