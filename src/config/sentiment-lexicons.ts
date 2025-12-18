/**
 * Sentiment Analysis Lexicons and Patterns
 *
 * Comprehensive lexicons for emotion detection, persuasion technique identification,
 * tone analysis, and psychological trigger detection in advertising copy.
 */

import {
  EmotionType,
  PersuasionTechnique,
  PsychologicalTrigger,
  BrandPersonalityTrait,
  EmotionLexicon
} from '../types/sentiment';

// ============================================================================
// Emotion Lexicons (Plutchik's Wheel)
// ============================================================================

export const emotionLexicon: EmotionLexicon = {
  [EmotionType.JOY]: {
    strong: [
      'thrilled', 'ecstatic', 'amazing', 'incredible', 'fantastic', 'wonderful',
      'extraordinary', 'phenomenal', 'spectacular', 'magnificent', 'brilliant',
      'overjoyed', 'elated', 'euphoric', 'exhilarated', 'blissful', 'jubilant',
      'celebrate', 'celebration', 'triumph', 'victorious'
    ],
    moderate: [
      'happy', 'pleased', 'glad', 'delighted', 'excited', 'great', 'excellent',
      'awesome', 'perfect', 'love', 'loving', 'enjoy', 'enjoying', 'fun',
      'joyful', 'cheerful', 'grateful', 'thankful', 'satisfied', 'content',
      'proud', 'accomplished', 'successful', 'winning', 'best'
    ],
    mild: [
      'nice', 'good', 'fine', 'okay', 'pleasant', 'positive', 'better',
      'improved', 'comfortable', 'relaxed', 'calm', 'peaceful', 'easy',
      'smooth', 'simple', 'convenient', 'helpful', 'useful', 'valuable'
    ]
  },

  [EmotionType.TRUST]: {
    strong: [
      'guaranteed', 'proven', 'certified', 'verified', 'trusted', 'authentic',
      'legitimate', 'accredited', 'endorsed', 'backed', 'insured', 'bonded',
      'licensed', 'registered', 'official', 'authorized', 'approved',
      'award-winning', 'industry-leading', 'world-class'
    ],
    moderate: [
      'reliable', 'dependable', 'secure', 'safe', 'protected', 'confident',
      'assured', 'certain', 'established', 'reputable', 'professional',
      'experienced', 'expert', 'specialist', 'qualified', 'trained',
      'dedicated', 'committed', 'transparent', 'honest'
    ],
    mild: [
      'real', 'genuine', 'true', 'actual', 'valid', 'legit', 'solid',
      'consistent', 'stable', 'steady', 'responsible', 'accountable',
      'fair', 'ethical', 'credible', 'believable', 'reasonable'
    ]
  },

  [EmotionType.FEAR]: {
    strong: [
      'terrifying', 'devastating', 'catastrophic', 'crisis', 'disaster',
      'emergency', 'critical', 'dangerous', 'deadly', 'fatal', 'severe',
      'extreme', 'urgent', 'dire', 'alarming', 'shocking', 'horrifying',
      'nightmare', 'threat', 'threatened'
    ],
    moderate: [
      'worried', 'concerned', 'anxious', 'risk', 'risky', 'danger', 'harmful',
      'warning', 'caution', 'careful', 'alert', 'vulnerable', 'exposed',
      'uncertain', 'unstable', 'precarious', 'fragile', 'at risk',
      'in danger', 'jeopardize', 'compromise'
    ],
    mild: [
      'unsure', 'hesitant', 'doubtful', 'skeptical', 'nervous', 'uneasy',
      'uncomfortable', 'wary', 'cautious', 'careful', 'watchful', 'mindful',
      'aware', 'conscious', 'vigilant', 'guarded', 'reserved'
    ]
  },

  [EmotionType.SURPRISE]: {
    strong: [
      'revolutionary', 'breakthrough', 'groundbreaking', 'game-changing',
      'unprecedented', 'unbelievable', 'mind-blowing', 'jaw-dropping',
      'stunning', 'astonishing', 'astounding', 'remarkable', 'extraordinary',
      'unheard-of', 'once-in-a-lifetime', 'world-first'
    ],
    moderate: [
      'introducing', 'announcing', 'new', 'discover', 'revealing', 'unveiled',
      'surprise', 'surprising', 'unexpected', 'suddenly', 'just launched',
      'just released', 'brand new', 'fresh', 'latest', 'cutting-edge',
      'innovative', 'novel', 'original', 'unique'
    ],
    mild: [
      'interesting', 'curious', 'intriguing', 'different', 'unusual', 'rare',
      'uncommon', 'distinctive', 'special', 'notable', 'noteworthy',
      'remarkable', 'worth noting', 'eye-opening', 'enlightening'
    ]
  },

  [EmotionType.ANTICIPATION]: {
    strong: [
      'can\'t wait', 'dying to', 'countdown', 'launching soon', 'coming soon',
      'get ready', 'prepare yourself', 'brace yourself', 'mark your calendar',
      'save the date', 'highly anticipated', 'most awaited', 'exciting news'
    ],
    moderate: [
      'coming', 'upcoming', 'future', 'soon', 'imagine', 'picture', 'envision',
      'dream', 'what if', 'possibility', 'potential', 'opportunity',
      'looking forward', 'expecting', 'waiting', 'hoping', 'planning'
    ],
    mild: [
      'next', 'later', 'eventually', 'someday', 'one day', 'in time',
      'when you\'re ready', 'whenever', 'available soon', 'stay tuned',
      'watch this space', 'more to come', 'updates coming'
    ]
  },

  [EmotionType.SADNESS]: {
    strong: [
      'devastating', 'heartbreaking', 'tragic', 'miserable', 'suffering',
      'painful', 'agonizing', 'tormented', 'desperate', 'hopeless',
      'crushed', 'shattered', 'broken', 'ruined', 'destroyed'
    ],
    moderate: [
      'struggling', 'tired', 'exhausted', 'frustrated', 'disappointed',
      'stuck', 'trapped', 'overwhelmed', 'stressed', 'anxious',
      'worried', 'concerned', 'troubled', 'bothered', 'upset',
      'unhappy', 'dissatisfied', 'discouraged', 'defeated'
    ],
    mild: [
      'difficult', 'hard', 'challenging', 'tough', 'rough', 'complicated',
      'confusing', 'unclear', 'uncertain', 'inconvenient', 'annoying',
      'bothersome', 'tedious', 'boring', 'dull', 'mundane'
    ]
  },

  [EmotionType.ANGER]: {
    strong: [
      'outrageous', 'furious', 'enraged', 'infuriated', 'livid', 'seething',
      'disgusted', 'appalled', 'horrified', 'scandalized', 'unacceptable',
      'intolerable', 'inexcusable', 'ridiculous', 'absurd'
    ],
    moderate: [
      'fed up', 'sick of', 'enough', 'stop', 'no more', 'tired of',
      'annoyed', 'irritated', 'bothered', 'frustrated', 'aggravated',
      'angry', 'mad', 'upset', 'resentful', 'bitter'
    ],
    mild: [
      'disappointed', 'let down', 'dissatisfied', 'unhappy', 'displeased',
      'unimpressed', 'skeptical', 'doubtful', 'questioning', 'critical',
      'concerned', 'worried', 'bothered', 'troubled'
    ]
  },

  [EmotionType.DISGUST]: {
    strong: [
      'disgusting', 'revolting', 'repulsive', 'vile', 'horrible', 'terrible',
      'awful', 'dreadful', 'hideous', 'nasty', 'gross', 'sickening',
      'nauseating', 'offensive', 'appalling', 'atrocious'
    ],
    moderate: [
      'hate', 'despise', 'loathe', 'detest', 'can\'t stand', 'worst',
      'bad', 'poor', 'inferior', 'subpar', 'mediocre', 'inadequate',
      'disappointing', 'unsatisfactory', 'unacceptable', 'shameful'
    ],
    mild: [
      'dislike', 'don\'t like', 'not a fan', 'prefer not', 'rather not',
      'avoid', 'skip', 'pass on', 'not for me', 'not my thing',
      'questionable', 'suspicious', 'sketchy', 'dubious'
    ]
  }
};

// ============================================================================
// Persuasion Technique Patterns
// ============================================================================

export const persuasionPatterns: Record<PersuasionTechnique, RegExp[]> = {
  [PersuasionTechnique.SCARCITY]: [
    /only\s*\d+\s*(left|remaining|available|spots?|seats?|items?)/i,
    /limited\s*(time|stock|availability|quantities?|spots?|seats?|edition)/i,
    /while\s*(supplies?|stocks?)\s*last/i,
    /selling\s*(out|fast)/i,
    /last\s*(chance|call|opportunity|few)/i,
    /ends?\s*(soon|today|tonight|tomorrow|\d)/i,
    /running\s*(out|low)/i,
    /almost\s*(gone|sold\s*out)/i,
    /few\s*(left|remaining|available)/i,
    /(rare|scarce|exclusive)\s*(opportunity|offer|chance)/i
  ],

  [PersuasionTechnique.SOCIAL_PROOF]: [
    /\d+[,\d]*\+?\s*(customers?|users?|clients?|people|members?|subscribers?|downloads?)/i,
    /join\s*\d+[,\d]*/i,
    /trusted\s*by\s*\d+/i,
    /★{3,}|⭐{3,}/,
    /\d+(\.\d+)?\s*(out\s*of\s*5|stars?|star\s*rating)/i,
    /as\s*seen\s*(in|on)\s*(the\s*)?\w+/i,
    /rated\s*#?\d/i,
    /\d+[,\d]*\+?\s*reviews?/i,
    /(best[\s-]?seller|top[\s-]?rated|most\s*popular|fan\s*favorite)/i,
    /loved\s*by\s*(thousands|millions|customers)/i,
    /featured\s*(in|on|by)/i,
    /(testimonial|success\s*stor|case\s*stud)/i
  ],

  [PersuasionTechnique.AUTHORITY]: [
    /\b(dr\.|doctor|expert|specialist|professional|professor)\b/i,
    /#1|number\s*one|best[\s-]?selling|top[\s-]?rated/i,
    /award[\s-]?winning/i,
    /certified|accredited|licensed|registered/i,
    /recommended\s*by/i,
    /industry[\s-]?leading|market[\s-]?leading/i,
    /\d+\s*(years?|decades?)\s*(of\s*)?(experience|expertise)/i,
    /backed\s*by\s*(science|research|studies)/i,
    /clinically\s*(proven|tested|studied)/i,
    /patent(ed)?|proprietary/i,
    /official|authorized|endorsed/i,
    /(fda|usda|iso|gmp)\s*(approved|certified|compliant)/i
  ],

  [PersuasionTechnique.RECIPROCITY]: [
    /free\s+(gift|bonus|guide|ebook|trial|sample|consultation|shipping|download)/i,
    /complimentary/i,
    /no[\s-]?cost|at\s*no\s*cost/i,
    /on\s*(the\s*)?house/i,
    /bonus\s*(included|gift|offer)/i,
    /added\s*value/i,
    /extra\s*(free|bonus|gift)/i,
    /gift\s*(with\s*purchase|included|for\s*you)/i,
    /we('ll)?\s*(give|send|include)/i,
    /yours\s*(free|to\s*keep)/i
  ],

  [PersuasionTechnique.COMMITMENT]: [
    /step\s*(1|one|first)/i,
    /start\s*(your|the)\s*(journey|path|transformation)/i,
    /begin\s*(today|now|your)/i,
    /take\s*the\s*(first|next)\s*step/i,
    /get\s*started/i,
    /sign\s*up\s*(now|today|free)/i,
    /join\s*(now|today|us|free)/i,
    /commit\s*(to|yourself)/i,
    /invest\s*in\s*(yourself|your)/i,
    /make\s*(the\s*)?change/i,
    /ready\s*to\s*(start|begin|change|transform)/i
  ],

  [PersuasionTechnique.LIKING]: [
    /we\s*(understand|know|get\s*it)/i,
    /just\s*like\s*(you|me|us)/i,
    /we('ve)?\s*(been\s*there|felt\s*that)/i,
    /you('re)?\s*not\s*alone/i,
    /we\s*hear\s*you/i,
    /for\s*(people|folks)\s*like\s*(you|us)/i,
    /made\s*(for|by)\s*(people\s*like\s*)?(you|us)/i,
    /our\s*community/i,
    /fellow\s*\w+/i,
    /friend|family|partner/i,
    /we\s*care\s*(about|for)/i,
    /your\s*success\s*is\s*our/i
  ],

  [PersuasionTechnique.URGENCY]: [
    /now|today(\s*only)?|tonight|immediately|instant(ly)?/i,
    /act\s*(fast|now|quickly|today)/i,
    /don('|')t\s*(wait|delay|miss)/i,
    /hurry|rush|quick|fast/i,
    /right\s*now|right\s*away/i,
    /asap|a\.s\.a\.p\./i,
    /time[\s-]?sensitive/i,
    /limited[\s-]?time/i,
    /before\s*(it('|')s\s*)?too\s*late/i,
    /while\s*(you|it)\s*(still\s*)?(can|last)/i,
    /deadline|expires?|expiring/i,
    /\d+\s*(hours?|minutes?|days?)\s*(left|remaining|only)/i
  ],

  [PersuasionTechnique.FOMO]: [
    /don('|')t\s*miss\s*(out|this)/i,
    /missing\s*out/i,
    /everyone('s|\s*is)\s*(talking|using|loving)/i,
    /others\s*are\s*(already|getting)/i,
    /selling\s*fast/i,
    /while\s*(supplies?|stocks?)\s*last/i,
    /before\s*(it('|')s\s*)?(gone|too\s*late)/i,
    /join\s*(the\s*)?(thousands|millions|others)/i,
    /people\s*are\s*(already|loving|using)/i,
    /be\s*(the\s*)?(first|among)/i,
    /get\s*(in\s*)?(early|ahead)/i,
    /exclusive\s*access/i,
    /waitlist|waiting\s*list/i
  ],

  [PersuasionTechnique.ANCHORING]: [
    /was\s*\$?\d+[,\d]*(\.\d{2})?\s*(,?\s*)now\s*\$?\d+/i,
    /regular(ly)?\s*\$?\d+/i,
    /value(d)?\s*(at|of)\s*\$?\d+/i,
    /save\s*\$?\d+/i,
    /\d+%\s*off/i,
    /compare\s*(at|to)\s*\$?\d+/i,
    /retail\s*(price|value)\s*\$?\d+/i,
    /originally\s*\$?\d+/i,
    /marked\s*down\s*from/i,
    /reduced\s*from/i,
    /worth\s*\$?\d+/i
  ],

  [PersuasionTechnique.EXCLUSIVITY]: [
    /exclusive|exclusively/i,
    /vip|v\.i\.p\./i,
    /members?[\s-]?only/i,
    /private|invitation[\s-]?only/i,
    /limited\s*(edition|release|access)/i,
    /select\s*(few|group|members)/i,
    /premium|elite|luxury/i,
    /insider|inner\s*circle/i,
    /not\s*(available\s*)?(everywhere|to\s*everyone)/i,
    /by\s*invitation/i,
    /early\s*access/i,
    /first\s*(access|look|dibs)/i
  ]
};

// ============================================================================
// Psychological Trigger Patterns
// ============================================================================

export const triggerPatterns: Record<PsychologicalTrigger, {
  patterns: RegExp[];
  keywords: string[];
}> = {
  [PsychologicalTrigger.IDENTITY]: {
    patterns: [
      /for\s*(smart|savvy|busy|successful|ambitious|modern)\s*(people|professionals?|entrepreneurs?)/i,
      /(smart|savvy|successful)\s*(people|professionals?|parents?|entrepreneurs?)\s*(choose|use|prefer)/i,
      /are\s*you\s*(a|the\s*kind\s*of)/i,
      /if\s*you('re|'re|\s*are)\s*(a|the)/i,
      /designed\s*for\s*(people|professionals?|those)\s*who/i,
      /made\s*for\s*\w+\s*who/i,
      /the\s*\w+('s|'s)?\s*(choice|pick|preference)/i
    ],
    keywords: [
      'professional', 'entrepreneur', 'leader', 'expert', 'innovator',
      'visionary', 'go-getter', 'achiever', 'high-performer', 'champion',
      'winner', 'success-minded', 'forward-thinking', 'discerning'
    ]
  },

  [PsychologicalTrigger.STATUS]: {
    patterns: [
      /(premium|luxury|exclusive|elite|vip|first[\s-]?class)/i,
      /status|prestige|prestigious/i,
      /high[\s-]?end|upscale|upmarket/i,
      /as\s*seen\s*(with|on)\s*(celebrities?|influencers?)/i,
      /\w+\s*(of\s*the\s*)?(rich|wealthy|successful|elite)/i
    ],
    keywords: [
      'premium', 'luxury', 'exclusive', 'elite', 'vip', 'prestigious',
      'high-end', 'upscale', 'sophisticated', 'refined', 'distinguished',
      'world-class', 'first-class', 'top-tier', 'best-in-class'
    ]
  },

  [PsychologicalTrigger.BELONGING]: {
    patterns: [
      /join\s*(our|the)\s*(community|family|tribe|movement|team)/i,
      /part\s*of\s*(something|a\s*community|the\s*\w+)/i,
      /\d+[,\d]*\+?\s*(members?|community|people|users?)/i,
      /together|community|belong|tribe|family/i,
      /be\s*part\s*of/i,
      /you('re|'re|\s*are)\s*(one\s*of\s*us|not\s*alone)/i
    ],
    keywords: [
      'community', 'family', 'tribe', 'movement', 'team', 'group',
      'together', 'belong', 'member', 'join', 'welcome', 'inclusive',
      'shared', 'collective', 'united', 'connection'
    ]
  },

  [PsychologicalTrigger.ACHIEVEMENT]: {
    patterns: [
      /reach\s*(your|the)?\s*(goals?|potential|dreams?)/i,
      /achieve\s*(your|more|success|greatness)/i,
      /unlock\s*(your|the)?\s*(potential|success|results)/i,
      /level[\s-]?up/i,
      /success(ful)?|accomplish(ment)?|achieve(ment)?/i,
      /results|outcomes|wins?|victory|victories/i,
      /transform(ation)?|breakthrough/i
    ],
    keywords: [
      'success', 'achieve', 'accomplish', 'goal', 'milestone', 'win',
      'victory', 'results', 'outcome', 'progress', 'growth', 'improve',
      'advance', 'excel', 'master', 'conquer', 'dominate'
    ]
  },

  [PsychologicalTrigger.SECURITY]: {
    patterns: [
      /protect(ed|ion)?|secure|security|safe(ty)?/i,
      /peace\s*of\s*mind/i,
      /worry[\s-]?free|stress[\s-]?free|risk[\s-]?free/i,
      /guarante(e|ed)|warranty|insure(d|ance)?/i,
      /money[\s-]?back|refund/i,
      /no[\s-]?risk|low[\s-]?risk/i,
      /backed\s*by|covered\s*by/i
    ],
    keywords: [
      'protect', 'secure', 'safe', 'safety', 'security', 'guarantee',
      'warranty', 'insured', 'covered', 'backed', 'certified', 'verified',
      'trusted', 'reliable', 'dependable', 'stable', 'peace of mind'
    ]
  },

  [PsychologicalTrigger.FREEDOM]: {
    patterns: [
      /your\s*(way|choice|terms|schedule)/i,
      /freedom|free(dom)?\s*to/i,
      /no\s*(strings|contracts?|commitments?|obligations?)/i,
      /flexible|flexibility/i,
      /on\s*your\s*(own\s*)?(terms|time|schedule)/i,
      /break\s*(free|away)/i,
      /escape|liberate/i,
      /control\s*(your|over)/i
    ],
    keywords: [
      'freedom', 'free', 'flexible', 'choice', 'control', 'independence',
      'autonomous', 'liberate', 'escape', 'unrestricted', 'unlimited',
      'on your terms', 'your way', 'no strings', 'no commitment'
    ]
  },

  [PsychologicalTrigger.NOVELTY]: {
    patterns: [
      /new|newest|brand[\s-]?new|all[\s-]?new/i,
      /introduc(e|ing)|announc(e|ing)|reveal(ing)?|launch(ing)?/i,
      /discover|first[\s-]?(ever|time|look)/i,
      /revolutionary|breakthrough|cutting[\s-]?edge/i,
      /never\s*(before|seen)|unprecedented/i,
      /innovation|innovative/i,
      /latest|newest|most\s*recent/i
    ],
    keywords: [
      'new', 'discover', 'innovative', 'revolutionary', 'breakthrough',
      'cutting-edge', 'latest', 'fresh', 'modern', 'advanced', 'next-gen',
      'pioneering', 'groundbreaking', 'first', 'original', 'unique'
    ]
  },

  [PsychologicalTrigger.NOSTALGIA]: {
    patterns: [
      /classic|traditional|timeless|heritage/i,
      /trusted\s*(for|since)\s*\d+\s*(years|decades|generations)/i,
      /since\s*\d{4}/i,
      /\d+\s*(years?|decades?|generations?)\s*(of|in)/i,
      /remember\s*when|back\s*(in\s*)?the\s*day/i,
      /like\s*(mom|grandma|they)\s*(used\s*to\s*)?(made?|do)/i,
      /original|authentic|genuine|real/i
    ],
    keywords: [
      'classic', 'traditional', 'heritage', 'timeless', 'trusted',
      'established', 'original', 'authentic', 'genuine', 'old-fashioned',
      'vintage', 'retro', 'legacy', 'generations', 'time-tested'
    ]
  },

  [PsychologicalTrigger.CURIOSITY]: {
    patterns: [
      /discover|find\s*out|learn\s*(how|why|what)/i,
      /secret(s)?|hidden|little[\s-]?known/i,
      /what\s*(if|makes?|causes?|happens?)/i,
      /have\s*you\s*(ever\s*)?(wondered|thought|asked)/i,
      /did\s*you\s*know/i,
      /the\s*(truth|real\s*reason|surprising|shocking)\s*(about|behind)/i,
      /why\s*(most|many|people)\s*(fail|don('|')t|struggle)/i,
      /mystery|mysterious|reveal(ed|ing)?/i
    ],
    keywords: [
      'discover', 'secret', 'hidden', 'reveal', 'uncover', 'mystery',
      'curious', 'wonder', 'find out', 'learn', 'truth', 'surprising',
      'shocking', 'unexpected', 'little-known', 'insider'
    ]
  },

  [PsychologicalTrigger.SELF_IMPROVEMENT]: {
    patterns: [
      /better\s*(version|you|yourself|life)/i,
      /improve\s*(your|yourself)/i,
      /transform(ation)?|upgrade|level[\s-]?up/i,
      /grow(th)?|develop(ment)?|evolve/i,
      /become\s*(the\s*best|better|stronger|smarter)/i,
      /unlock\s*(your|the)\s*(potential|best|power)/i,
      /invest\s*in\s*(yourself|your)/i,
      /self[\s-]?(improvement|development|care|growth)/i
    ],
    keywords: [
      'improve', 'better', 'transform', 'upgrade', 'grow', 'develop',
      'evolve', 'enhance', 'optimize', 'maximize', 'unlock', 'potential',
      'self-improvement', 'personal growth', 'level up', 'become'
    ]
  }
};

// ============================================================================
// Brand Personality Trait Markers
// ============================================================================

export const brandPersonalityMarkers: Record<BrandPersonalityTrait, {
  patterns: RegExp[];
  keywords: string[];
  voiceIndicators: string[];
}> = {
  [BrandPersonalityTrait.SINCERITY]: {
    patterns: [
      /honest(ly)?|genuine(ly)?|authentic(ally)?/i,
      /real|true|truth/i,
      /we\s*(really|truly|genuinely)\s*(care|believe)/i,
      /from\s*(the\s*)?heart/i,
      /no\s*(bs|bull|nonsense|gimmicks?)/i
    ],
    keywords: [
      'honest', 'genuine', 'authentic', 'real', 'true', 'sincere',
      'wholesome', 'down-to-earth', 'friendly', 'caring', 'thoughtful',
      'helpful', 'family', 'community', 'trust', 'reliable'
    ],
    voiceIndicators: [
      'we care', 'we believe', 'our promise', 'from our family',
      'thank you', 'grateful', 'appreciate', 'means a lot'
    ]
  },

  [BrandPersonalityTrait.EXCITEMENT]: {
    patterns: [
      /exciting|thrilling|amazing|incredible|awesome/i,
      /adventure|wild|bold|daring|fearless/i,
      /!{2,}/,
      /🔥|💥|⚡|🚀|💪/,
      /let('|')s\s*go|ready\s*to\s*roll/i
    ],
    keywords: [
      'exciting', 'thrilling', 'amazing', 'incredible', 'awesome',
      'daring', 'bold', 'adventurous', 'spirited', 'energetic',
      'dynamic', 'vibrant', 'fresh', 'trendy', 'cool', 'hot'
    ],
    voiceIndicators: [
      'get pumped', 'let\'s go', 'ready to rock', 'game on',
      'bring it', 'fired up', 'stoked', 'hyped'
    ]
  },

  [BrandPersonalityTrait.COMPETENCE]: {
    patterns: [
      /expert|professional|specialist|leading/i,
      /proven|tested|verified|certified/i,
      /\d+\s*(years?|decades?)\s*(of\s*)?(experience|expertise)/i,
      /industry[\s-]?leading|best[\s-]?in[\s-]?class/i,
      /trusted\s*by\s*(professionals?|experts?|leaders?)/i
    ],
    keywords: [
      'expert', 'professional', 'reliable', 'intelligent', 'successful',
      'efficient', 'effective', 'proven', 'tested', 'certified',
      'quality', 'precision', 'accurate', 'thorough', 'meticulous'
    ],
    voiceIndicators: [
      'our research shows', 'data indicates', 'studies prove',
      'engineered for', 'designed by experts', 'precision-crafted'
    ]
  },

  [BrandPersonalityTrait.SOPHISTICATION]: {
    patterns: [
      /luxury|luxurious|elegant|sophisticated/i,
      /premium|exclusive|elite|refined/i,
      /artisan|crafted|curated|bespoke/i,
      /timeless|classic|heritage/i,
      /world[\s-]?class|first[\s-]?class/i
    ],
    keywords: [
      'luxury', 'elegant', 'sophisticated', 'refined', 'premium',
      'exclusive', 'glamorous', 'charming', 'stylish', 'chic',
      'fashionable', 'upscale', 'prestigious', 'distinguished'
    ],
    voiceIndicators: [
      'exquisite', 'impeccable', 'unparalleled', 'extraordinary',
      'finest', 'curated', 'artfully', 'meticulously'
    ]
  },

  [BrandPersonalityTrait.RUGGEDNESS]: {
    patterns: [
      /tough|rugged|durable|strong|powerful/i,
      /built\s*(to\s*)?(last|endure|withstand)/i,
      /outdoor|adventure|wild|nature/i,
      /heavy[\s-]?duty|industrial[\s-]?strength/i,
      /withstand|endure|survive/i
    ],
    keywords: [
      'tough', 'rugged', 'durable', 'strong', 'powerful', 'robust',
      'sturdy', 'solid', 'reliable', 'outdoor', 'adventurous',
      'masculine', 'bold', 'fearless', 'resilient'
    ],
    voiceIndicators: [
      'built to last', 'takes a beating', 'ready for anything',
      'no excuses', 'get it done', 'push through'
    ]
  }
};

// ============================================================================
// Formality Markers
// ============================================================================

export const formalityMarkers = {
  casual: {
    patterns: [
      /hey|hi|yo|sup|what('|')s\s*up/i,
      /gonna|wanna|gotta|kinda|sorta/i,
      /awesome|cool|sweet|sick|dope|lit/i,
      /lol|omg|btw|fyi|tbh|imo/i,
      /!{2,}|\.{3,}/,
      /😀|😂|🤣|👍|🙌|💯|🔥/
    ],
    keywords: [
      'hey', 'hi', 'awesome', 'cool', 'amazing', 'check out',
      'grab', 'snag', 'score', 'totally', 'super', 'pretty'
    ],
    contractions: true,
    shortSentences: true
  },

  conversational: {
    patterns: [
      /you('|')ll|we('|')ll|it('|')s|that('|')s|here('|')s/i,
      /let('|')s|don('|')t|can('|')t|won('|')t/i,
      /you\s*(know|see|get)/i,
      /right\?|isn('|')t\s*it\?/i
    ],
    keywords: [
      'you', 'your', 'let\'s', 'here\'s', 'it\'s', 'we\'re',
      'imagine', 'picture', 'think about', 'consider'
    ],
    contractions: true,
    directAddress: true
  },

  professional: {
    patterns: [
      /we\s*(offer|provide|deliver|ensure)/i,
      /our\s*(solution|service|product|team)/i,
      /designed\s*(to|for)|built\s*(to|for)/i,
      /effective|efficient|reliable|comprehensive/i
    ],
    keywords: [
      'solution', 'service', 'provide', 'deliver', 'ensure',
      'comprehensive', 'effective', 'efficient', 'optimize'
    ],
    contractions: false,
    technicalTerms: true
  },

  formal: {
    patterns: [
      /we\s*would\s*like\s*to/i,
      /it\s*is\s*our\s*pleasure/i,
      /please\s*do\s*not\s*hesitate/i,
      /we\s*cordially|respectfully/i,
      /herein|thereof|whereby|pursuant/i
    ],
    keywords: [
      'furthermore', 'moreover', 'therefore', 'consequently',
      'accordingly', 'subsequently', 'henceforth', 'notwithstanding'
    ],
    contractions: false,
    passiveVoice: true
  }
};

// ============================================================================
// Framing Patterns
// ============================================================================

export const framingPatterns = {
  positive: {
    gain: [
      /get|gain|achieve|earn|win|receive|enjoy/i,
      /increase|boost|improve|enhance|maximize/i,
      /save|benefit|profit|grow|build/i,
      /start\s*(saving|earning|growing|building)/i,
      /more\s*(money|time|freedom|success)/i
    ],
    opportunity: [
      /opportunity|chance|possibility|potential/i,
      /discover|unlock|access|open/i,
      /imagine|picture|envision/i,
      /what\s*if\s*you\s*(could|were\s*able)/i,
      /ready\s*to|prepared\s*to|able\s*to/i
    ]
  },

  negative: {
    loss: [
      /lose|losing|lost|miss|missing|missed/i,
      /waste|wasting|wasted/i,
      /cost|costing|costly/i,
      /don('|')t\s*(miss|lose|waste)/i,
      /stop\s*(losing|wasting|missing)/i
    ],
    risk: [
      /risk|danger|threat|problem|issue/i,
      /avoid|prevent|protect|stop/i,
      /before\s*(it('|')s\s*)?too\s*late/i,
      /without\s*(the\s*)?(risk|worry|stress|hassle)/i,
      /eliminate|reduce|minimize/i
    ]
  }
};

// ============================================================================
// Competitive Positioning Patterns
// ============================================================================

export const positioningPatterns = {
  leader: [
    /#1|number\s*(one|1)|the\s*best/i,
    /leading|leader|top|premier|foremost/i,
    /most\s*(trusted|popular|recommended|used)/i,
    /industry[\s-]?(standard|leader|leading)/i,
    /market[\s-]?leader|market[\s-]?leading/i,
    /trusted\s*by\s*(millions|thousands|fortune\s*\d+)/i
  ],

  challenger: [
    /better\s*(than|alternative)/i,
    /switch\s*(from|to)|switching/i,
    /unlike\s*(other|traditional|typical)/i,
    /why\s*(settle|choose|switch)/i,
    /upgrade\s*(from|to)/i,
    /alternative\s*to/i,
    /compared\s*to/i,
    /vs\.?|versus/i
  ],

  niche: [
    /specialized|specializing/i,
    /designed\s*(specifically|exclusively)\s*(for|to)/i,
    /built\s*for\s*\w+\s*who/i,
    /the\s*only\s*\w+\s*(for|that)/i,
    /perfect\s*for|made\s*for/i,
    /focused\s*(on|exclusively)/i
  ],

  disruptor: [
    /revolutionary|disrupting|game[\s-]?changing/i,
    /reinventing|reimagining|rethinking/i,
    /the\s*future\s*of/i,
    /forget\s*(everything|what\s*you)/i,
    /new\s*way\s*(to|of)/i,
    /changing\s*the\s*(game|way|industry)/i,
    /never\s*before|first[\s-]?ever|world('|')s\s*first/i
  ]
};

// ============================================================================
// Intensity Modifiers
// ============================================================================

export const intensityModifiers = {
  amplifiers: [
    'very', 'extremely', 'incredibly', 'absolutely', 'completely',
    'totally', 'utterly', 'highly', 'deeply', 'truly', 'really',
    'especially', 'particularly', 'remarkably', 'exceptionally',
    'extraordinarily', 'immensely', 'vastly', 'enormously'
  ],

  downtoners: [
    'slightly', 'somewhat', 'fairly', 'rather', 'quite', 'pretty',
    'a bit', 'a little', 'kind of', 'sort of', 'mildly', 'moderately',
    'partially', 'partly', 'to some extent', 'to a degree'
  ],

  negators: [
    'not', 'never', 'no', 'none', 'neither', 'nor', 'nothing',
    'nobody', 'nowhere', 'hardly', 'barely', 'scarcely', 'seldom',
    'rarely', 'without', 'lack', 'lacking', 'absent', 'free from'
  ]
};

// ============================================================================
// Sentiment Scoring Weights
// ============================================================================

export const sentimentWeights = {
  emotion: {
    strong: 3,
    moderate: 2,
    mild: 1
  },
  persuasion: {
    patternMatch: 2,
    keywordMatch: 1
  },
  intensity: {
    amplifier: 1.5,
    downtoner: 0.5,
    negator: -1
  }
};
