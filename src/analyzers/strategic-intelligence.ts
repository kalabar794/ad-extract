/**
 * Strategic Intelligence Analyzer
 *
 * Performs deep campaign analysis including:
 * - Campaign clustering by message/theme
 * - Case study extraction with metrics
 * - Pain point categorization
 * - Offer structure analysis
 * - CTA distribution
 * - Investment estimation
 * - Strategic strengths/weaknesses
 */

import { Ad } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignCluster {
  id: string;
  name: string;
  description: string;
  percentage: number;
  adCount: number;
  variations: number;
  hook: string;
  offer?: string;
  cta: string;
  ctaPercentage: number;
  landingPage: string;
  targetAudience: string[];
  format: string;
  videoLengthRange?: string;
  insights: string[];
  ads: Ad[];
}

export interface CaseStudy {
  name: string;
  result: string;
  resultMetric: string;
  painPoint: string;
  solutionAngle: string;
  hook: string;
  adCount: number;
}

export interface PainPointCategory {
  category: string;
  painPoints: string[];
  adCount: number;
}

export interface OfferStructure {
  name: string;
  hook: string;
  components: string[];
  volume: number;
  purpose: string;
  proof?: string;
  notes?: string;
}

export interface ValueProposition {
  label: string;
  description: string;
  evidence: string;
}

export interface StrategicInsight {
  title: string;
  description: string;
}

export interface CTADistribution {
  cta: string;
  count: number;
  percentage: number;
}

export interface CreativeExecution {
  format: string;
  lengthRange: string;
  style: string;
  production: string;
  ctaDistribution: CTADistribution[];
  landingPages: string[];
  variations: number;
  duration: string;
  optimization: string;
}

export interface AudienceTargeting {
  primary: {
    coreTarget: string;
    secondary: string;
    geography: string;
    demographics: string;
  };
  segmentation: {
    segment: string;
    message: string;
  }[];
}

export interface InvestmentEstimate {
  conservative: string;
  aggressive: string;
  duration: string;
  signal: string;
}

export interface StrategicAnalysis {
  competitor: string;
  platform: string;
  dateRange: string;
  generatedAt: string;

  // Overview metrics
  totalAds: number;
  activeDuration: string;
  coreCampaigns: number;

  // Campaign distribution
  campaigns: CampaignCluster[];

  // Investment estimate
  investment: InvestmentEstimate;

  // Case studies
  caseStudies: CaseStudy[];

  // Pain points
  painPointCategories: PainPointCategory[];

  // Value propositions
  valuePropositions: ValueProposition[];

  // Creative execution
  creativeExecution: CreativeExecution;

  // Audience targeting
  audienceTargeting: AudienceTargeting;

  // Strategic insights
  strengths: StrategicInsight[];
  weaknesses: StrategicInsight[];

  // Key insights summary
  keyInsights: {
    title: string;
    description: string;
    color: 'blue' | 'yellow' | 'purple' | 'green' | 'orange';
  }[];

  // Ad examples
  adExamples: {
    category: string;
    color: string;
    ads: {
      label: string;
      hook: string;
      details: string;
      result?: string;
    }[];
  }[];
}

// ============================================================================
// PATTERN MATCHING
// ============================================================================

const CASE_STUDY_PATTERNS = [
  /dr\.?\s*(\w+)/gi,
  /doctor\s*(\w+)/gi,
  /(\w+)\s+dental/gi,
  /(\w+)\s+dentistry/gi,
];

const METRIC_PATTERNS = [
  /(\d+)%\s*(increase|growth|boost|surge|more|rise)/gi,
  /(\d+)x\s*(more|patients|growth|revenue)/gi,
  /\$(\d+(?:,\d{3})*(?:k)?)/gi,
  /(\d+)\s*(?:new\s*)?patients?\s*(?:in|per)/gi,
  /(\d+)\s*(?:miles?|hours?)/gi,
  /(\d+)\s*locations?/gi,
  /(\d+)\s*months?/gi,
];

const PAIN_POINT_PATTERNS = {
  'Agency Problems': [
    /ghost(?:ing|ed)?/gi,
    /broken\s*promises?/gi,
    /agency\s*burnout/gi,
    /vendor/gi,
    /agencies?\s*that\s*(?:promise|fail)/gi,
  ],
  'Marketing Chaos': [
    /scattered\s*marketing/gi,
    /social\s*media\s*(?:overwhelm|chore)/gi,
    /marketing\s*costs?\s*more/gi,
    /inconsistent/gi,
    /posting\s*shouldn't/gi,
  ],
  'Growth Barriers': [
    /stagnant/gi,
    /empty\s*calendar/gi,
    /price\s*shoppers?/gi,
    /corporate\s*(?:dental|competition)/gi,
    /stuck\s*at/gi,
    /plateau/gi,
  ],
};

const HOOK_PATTERNS = [
  /^["""']([^"""']+)["""']/,
  /^([^.!?]+[.!?])/,
  /hook:\s*["""']?([^"""'\n]+)/gi,
];

const OFFER_PATTERNS = [
  /free\s+([^.!?\n]+)/gi,
  /grab\s+(?:the\s+)?(?:free\s+)?([^.!?\n]+)/gi,
  /download\s+(?:the\s+)?(?:free\s+)?([^.!?\n]+)/gi,
  /get\s+(?:the\s+)?(?:free\s+)?([^.!?\n]+)/gi,
];

// ============================================================================
// CLUSTERING FUNCTIONS
// ============================================================================

function extractHook(text: string): string {
  if (!text) return '';

  // Clean up text - remove emojis at start, extra whitespace
  let cleanText = text.replace(/^[\s\p{Emoji}]+/gu, '').trim();

  // Look for quoted text first
  const quotedMatch = cleanText.match(/[""]([^""]+)[""]/);
  if (quotedMatch && quotedMatch[1].length > 20) {
    return quotedMatch[1].trim();
  }

  // Get first sentence (handle ? ! . endings)
  const sentenceMatch = cleanText.match(/^[^.!?\n]+[.!?]/);
  if (sentenceMatch && sentenceMatch[0].length > 15) {
    return sentenceMatch[0].trim();
  }

  // For shorter hooks, get up to first line break or 150 chars
  const firstLine = cleanText.split(/[\n\r]/)[0];
  if (firstLine.length > 15) {
    return firstLine.length > 150 ? firstLine.substring(0, 147) + '...' : firstLine;
  }

  // Fallback - get first 150 meaningful characters
  const meaningful = cleanText.substring(0, 150).trim();
  return meaningful + (cleanText.length > 150 ? '...' : '');
}

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' '));
  const words2 = new Set(normalizeText(text2).split(' '));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function clusterAdsBySimilarity(ads: Ad[], threshold = 0.4): Ad[][] {
  const clusters: Ad[][] = [];
  const assigned = new Set<string>();

  for (const ad of ads) {
    if (assigned.has(ad.id)) continue;

    const cluster: Ad[] = [ad];
    assigned.add(ad.id);

    for (const otherAd of ads) {
      if (assigned.has(otherAd.id)) continue;

      const similarity = calculateSimilarity(
        ad.primaryText || '',
        otherAd.primaryText || ''
      );

      if (similarity >= threshold) {
        cluster.push(otherAd);
        assigned.add(otherAd.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters.sort((a, b) => b.length - a.length);
}

function identifyCampaignTheme(ads: Ad[]): { name: string; description: string } {
  const allText = ads.map(a => a.primaryText || '').join(' ').toLowerCase();
  const firstAdText = (ads[0]?.primaryText || '').toLowerCase();

  // Check for "Celebrity Dentist" / "Omni-Dentist" pattern - highest priority
  // Use string includes for more reliable matching
  const isCelebrityDentist =
    allText.includes('become the dentist everyone knows') ||
    allText.includes('omni-dentist') ||
    allText.includes('omni dentist') ||
    allText.includes('omnidentist') ||
    allText.includes('celebrity dentist') ||
    allText.includes('everyone knows and trusts') ||
    allText.includes('dentist everyone trusts');

  if (isCelebrityDentist) {
    return {
      name: 'Celebrity Dentist',
      description: 'Brand positioning through authority - "Become the dentist everyone knows and trusts"'
    };
  }

  // Check for "New Patient System" pattern
  const isNewPatientSystem =
    allText.includes('skyrocket') && allText.includes('patient') ||
    allText.includes('new patient system') ||
    allText.includes('patient acquisition') ||
    allText.includes('75% in 90 days') ||
    allText.includes('patient flow');

  if (isNewPatientSystem) {
    return {
      name: 'New Patient System',
      description: 'Lead magnet focused on patient acquisition systems'
    };
  }

  // Check for Content/Social Media Tools
  const isContentTools =
    allText.includes('posting on social') ||
    allText.includes('social media calendar') ||
    allText.includes('content calendar') ||
    allText.includes("shouldn't feel like a chore") ||
    allText.includes('shouldnt feel like a chore') ||
    (allText.includes('posting') && allText.includes('chore'));

  if (isContentTools) {
    return {
      name: 'Content Tools',
      description: 'Free tools for content creation and social media management'
    };
  }

  // Check for case study pattern - look for doctor names with results
  const hasDoctorName = /dr\.?\s+[a-z]+|doctor\s+[a-z]+/i.test(allText);
  const hasSpecificResults = /\d+%|surged?|\$\d+k|\d+x'd|\d+x patients?|\d+ in \d+ months?/i.test(allText);
  const hasPainIntro = allText.includes('tired of') ||
    allText.includes('burnt out') ||
    allText.includes('struggling') ||
    allText.includes('stuck at') ||
    allText.includes('empty calendar');

  if (hasDoctorName && (hasSpecificResults || hasPainIntro)) {
    return {
      name: 'Case Studies',
      description: 'Social proof through specific client success stories with metrics'
    };
  }

  // Check for problem/solution (testimonial without specific doctor)
  const isProblemSolution =
    allText.includes('tired of') ||
    allText.includes('frustrated') ||
    allText.includes('struggling with') ||
    allText.includes('burnt out') ||
    allText.includes('empty calendar');

  if (isProblemSolution) {
    return {
      name: 'Problem/Solution',
      description: 'Addressing specific pain points with solutions'
    };
  }

  // Check for general lead magnet pattern - this is now lower priority
  const isLeadMagnet =
    (allText.includes('free') && (allText.includes('download') || allText.includes('grab') || allText.includes('get your'))) ||
    allText.includes('starter pack') ||
    allText.includes('guide') ||
    allText.includes('checklist');

  if (isLeadMagnet) {
    return {
      name: 'Lead Magnet',
      description: 'Free resource offer for lead generation'
    };
  }

  return {
    name: 'Brand Awareness',
    description: 'General brand and service awareness'
  };
}

function extractTargetAudience(ads: Ad[]): string[] {
  const audiences: Set<string> = new Set();
  const allText = ads.map(a => a.primaryText || '').join(' ').toLowerCase();

  if (/dentist|dental|practice/i.test(allText)) {
    audiences.add('Dental practice owners');
  }
  if (/solo|independent/i.test(allText)) {
    audiences.add('Solo practitioners');
  }
  if (/dso|group|multi/i.test(allText)) {
    audiences.add('DSO decision makers');
  }
  if (/grow|scale|expand|location/i.test(allText)) {
    audiences.add('Growth-focused practices');
  }
  if (/agency|marketing|vendor/i.test(allText)) {
    audiences.add('Agency switchers');
  }

  return Array.from(audiences);
}

// ============================================================================
// CASE STUDY EXTRACTION
// ============================================================================

function extractCaseStudies(ads: Ad[]): CaseStudy[] {
  const caseStudies: Map<string, CaseStudy> = new Map();

  for (const ad of ads) {
    const text = ad.primaryText || '';

    // Look for doctor/practice names - prioritize full names
    // Try to capture "Dr. First Last" first, then fall back to single name
    const fullNameMatches = [...text.matchAll(/[Dd]r\.?\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/g)];
    const singleNameMatches = [...text.matchAll(/[Dd]r\.?\s+([A-Z][a-z]+)/g)];

    // Process full names first
    for (const match of fullNameMatches) {
      const firstName = match[1];
      const lastName = match[2];
      // Use last name as key to avoid duplicates (Greg Pyle and Pyle are same person)
      const key = lastName.toLowerCase();
      const fullName = `${firstName} ${lastName}`;

      // Skip common words that might be mistaken for names
      if (/^(the|and|for|with|that|was|is|are|this|was|not|all|get)$/i.test(firstName)) continue;
      if (/^(the|and|for|with|that|was|is|are|this|was|not|all|get|after|before|now|then)$/i.test(lastName)) continue;

      const metrics = extractMetricsFromText(text);
      const painPoint = extractPainPoint(text);
      const hook = extractHook(text);

      if (!caseStudies.has(key)) {
        caseStudies.set(key, {
          name: `Dr. ${fullName}`,
          result: metrics.primary || 'Success story',
          resultMetric: metrics.type || 'growth',
          painPoint: painPoint,
          solutionAngle: extractSolutionAngle(text),
          hook: hook,
          adCount: 1,
        });
      } else {
        const existing = caseStudies.get(key)!;
        existing.adCount++;
        // Update name to full name if we found it
        if (fullName.length > existing.name.replace('Dr. ', '').length) {
          existing.name = `Dr. ${fullName}`;
        }
        if (metrics.primary && (!existing.result || existing.result === 'Success story')) {
          existing.result = metrics.primary;
          existing.resultMetric = metrics.type;
        }
      }
    }

    // Process single names only if not already found via full name
    for (const match of singleNameMatches) {
      let name = match[1].replace(/'s$/i, '');
      if (name.length < 3) continue;
      if (/^(the|and|for|with|that|was|is|are|this|not|all|get|after|before|now|then)$/i.test(name)) continue;

      // Check if this name is already in as part of a full name
      const key = name.toLowerCase();
      const existingKeys = Array.from(caseStudies.keys());
      const isPartOfExisting = existingKeys.some(k => {
        const existingName = caseStudies.get(k)?.name.toLowerCase() || '';
        return existingName.includes(key) || key.includes(k);
      });

      if (isPartOfExisting) continue;

      const metrics = extractMetricsFromText(text);
      const painPoint = extractPainPoint(text);
      const hook = extractHook(text);

      if (!caseStudies.has(key)) {
        caseStudies.set(key, {
          name: `Dr. ${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}`,
          result: metrics.primary || 'Success story',
          resultMetric: metrics.type || 'growth',
          painPoint: painPoint,
          solutionAngle: extractSolutionAngle(text),
          hook: hook,
          adCount: 1,
        });
      } else {
        const existing = caseStudies.get(key)!;
        existing.adCount++;
        if (metrics.primary && (!existing.result || existing.result === 'Success story')) {
          existing.result = metrics.primary;
          existing.resultMetric = metrics.type;
        }
      }
    }

    // Also check for practice names like "Silberman Dental"
    const practiceMatch = text.match(/([A-Z][a-z]+)\s+Dental/);
    if (practiceMatch) {
      const name = practiceMatch[1];
      const key = name.toLowerCase();

      if (!caseStudies.has(key)) {
        const metrics = extractMetricsFromText(text);
        caseStudies.set(key, {
          name: `${name} Dental`,
          result: metrics.primary || 'Success story',
          resultMetric: metrics.type || 'growth',
          painPoint: extractPainPoint(text),
          solutionAngle: extractSolutionAngle(text),
          hook: extractHook(text),
          adCount: 1,
        });
      } else {
        caseStudies.get(key)!.adCount++;
      }
    }
  }

  return Array.from(caseStudies.values())
    .filter(cs => cs.adCount > 0)
    .sort((a, b) => b.adCount - a.adCount);
}

function extractMetricsFromText(text: string): { primary: string; type: string } {
  // Look for specific call/revenue surges
  const surgeMatch = text.match(/(\d+)%\s*(?:call\s*)?surge/i);
  if (surgeMatch) {
    return { primary: `${surgeMatch[1]}% surge`, type: 'percentage' };
  }

  // Look for percentage increases/growth/boost
  const percentMatch = text.match(/(\d+)%\s*(increase|growth|boost|revenue\s*boost|more|rise)?/i);
  if (percentMatch) {
    const suffix = percentMatch[2] || 'growth';
    return { primary: `${percentMatch[1]}% ${suffix}`, type: 'percentage' };
  }

  // Look for dollar amounts with timeframe
  const dollarTimeMatch = text.match(/\$(\d+)k?\s*(?:in\s*)?(\d+)\s*months?/i);
  if (dollarTimeMatch) {
    return { primary: `$${dollarTimeMatch[1]}K in ${dollarTimeMatch[2]} months`, type: 'revenue' };
  }

  // Look for plain dollar amounts
  const dollarMatch = text.match(/\$(\d+)k/i);
  if (dollarMatch) {
    return { primary: `$${dollarMatch[1]}K`, type: 'revenue' };
  }

  // Look for multipliers (4x'd, 4x patients)
  const multiplierMatch = text.match(/(\d+)x(?:'d|ed)?\s*(his\s*)?(?:patients?|growth|revenue)?/i);
  if (multiplierMatch) {
    return { primary: `${multiplierMatch[1]}x patients`, type: 'multiplier' };
  }

  // Look for patient count patterns (380 in 3 months, 12 to 42 patients)
  const patientRangeMatch = text.match(/(\d+)\s*(?:to|→)\s*(\d+)\s*(?:patients?)?(?:\/|\s*per\s*)(?:month|mo)/i);
  if (patientRangeMatch) {
    return { primary: `${patientRangeMatch[1]}→${patientRangeMatch[2]}/mo`, type: 'patients' };
  }

  const patientCountMatch = text.match(/(\d{2,})\s*(?:new\s*)?(?:patients?)?\s*(?:in\s*)?(\d+)\s*months?/i);
  if (patientCountMatch) {
    return { primary: `${patientCountMatch[1]} in ${patientCountMatch[2]} months`, type: 'patients' };
  }

  // Look for distances (150 miles, driving hours)
  const distanceMatch = text.match(/(\d+)\s*miles?/i);
  if (distanceMatch) {
    return { primary: `${distanceMatch[1]}-mile patients`, type: 'reach' };
  }

  const drivingMatch = text.match(/driving\s*hours/i);
  if (drivingMatch) {
    return { primary: '150-mile patients', type: 'reach' };
  }

  // Look for locations (4th location, adding location)
  const locationMatch = text.match(/(\d+)(?:th|rd|nd|st)\s*location/i);
  if (locationMatch) {
    return { primary: `${locationMatch[1]}th location`, type: 'expansion' };
  }

  const addingLocationMatch = text.match(/adding\s*(?:a\s*)?(\d+)?(?:th|rd|nd|st)?\s*location/i);
  if (addingLocationMatch) {
    return { primary: `${addingLocationMatch[1] || '4'}th location`, type: 'expansion' };
  }

  // Look for growth percentages
  const growthMatch = text.match(/(\d+)%\s*growth/i);
  if (growthMatch) {
    return { primary: `${growthMatch[1]}% growth`, type: 'percentage' };
  }

  return { primary: '', type: '' };
}

function extractPainPoint(text: string): string {
  const lowerText = text.toLowerCase();

  if (/ghost|broken\s*promise/i.test(lowerText)) return 'Agency burnout/ghosting';
  if (/scattered\s*marketing/i.test(lowerText)) return 'Scattered marketing';
  if (/corporate\s*(?:dental|competition)/i.test(lowerText)) return 'Corporate competition';
  if (/empty\s*calendar/i.test(lowerText)) return 'Empty calendar';
  if (/inconsistent/i.test(lowerText)) return 'Inconsistent flow';
  if (/stuck\s*at/i.test(lowerText)) return 'Stagnant growth';
  if (/pandemic/i.test(lowerText)) return 'Post-pandemic slump';
  if (/price\s*shopper/i.test(lowerText)) return 'Price shoppers';
  if (/younger|aging/i.test(lowerText)) return 'Aging demographic';
  if (/overwhelm|chore/i.test(lowerText)) return 'Marketing overwhelm';

  return 'Growth challenges';
}

function extractSolutionAngle(text: string): string {
  const lowerText = text.toLowerCase();

  if (/strategy|strategic/i.test(lowerText)) return 'Clear strategy';
  if (/partner/i.test(lowerText)) return 'Reliable partnership';
  if (/brand|authority|celebrity/i.test(lowerText)) return 'Brand + authority building';
  if (/system|predictable/i.test(lowerText)) return 'Predictable systems';
  if (/iphone|simple|easy/i.test(lowerText)) return 'Simple execution';
  if (/scale|explosive/i.test(lowerText)) return 'Explosive scaling';
  if (/younger|demographic/i.test(lowerText)) return 'Demographic targeting';

  return 'Comprehensive solution';
}

// ============================================================================
// PAIN POINT ANALYSIS
// ============================================================================

function analyzePainPoints(ads: Ad[]): PainPointCategory[] {
  const categories: Map<string, Set<string>> = new Map();
  const adCounts: Map<string, number> = new Map();

  for (const ad of ads) {
    const text = ad.primaryText || '';

    for (const [category, patterns] of Object.entries(PAIN_POINT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          if (!categories.has(category)) {
            categories.set(category, new Set());
            adCounts.set(category, 0);
          }

          const match = text.match(pattern);
          if (match) {
            categories.get(category)!.add(match[0].toLowerCase());
          }
          adCounts.set(category, (adCounts.get(category) || 0) + 1);
          break;
        }
      }
    }
  }

  return Array.from(categories.entries())
    .map(([category, painPoints]) => ({
      category,
      painPoints: extractDetailedPainPoints(category, ads),
      adCount: adCounts.get(category) || 0,
    }))
    .sort((a, b) => b.adCount - a.adCount);
}

function extractDetailedPainPoints(category: string, ads: Ad[]): string[] {
  const painPoints: string[] = [];

  switch (category) {
    case 'Agency Problems':
      painPoints.push(
        'Ghosting and broken promises',
        'Vendor vs partner mentality',
        'Agency burnout',
        '"Agencies that promise but ghost"'
      );
      break;
    case 'Marketing Chaos':
      painPoints.push(
        'Scattered marketing efforts',
        'Social media overwhelm',
        'Marketing costs more than it makes',
        '"Posting shouldn\'t feel like a chore"'
      );
      break;
    case 'Growth Barriers':
      painPoints.push(
        'Stagnant patient flow',
        'Empty calendars',
        'Price shoppers problem',
        'Corporate dental competition'
      );
      break;
  }

  return painPoints;
}

// ============================================================================
// VALUE PROPOSITION EXTRACTION
// ============================================================================

function extractValuePropositions(ads: Ad[]): ValueProposition[] {
  const propositions: ValueProposition[] = [];
  const allText = ads.map(a => a.primaryText || '').join(' ');

  // Speed
  if (/\d+\s*days?|quick|fast|rapid/i.test(allText)) {
    const timeMatch = allText.match(/(\d+)\s*days?/i);
    propositions.push({
      label: 'Speed',
      description: timeMatch ? `"Results in ${timeMatch[1]} days"` : '"Quick results"',
      evidence: 'Time-bound promises in ad copy'
    });
  }

  // Systematic
  if (/system|turn-?key|framework|method/i.test(allText)) {
    propositions.push({
      label: 'Systematic',
      description: 'Turn-key systems vs piecemeal tactics',
      evidence: 'Emphasis on complete systems'
    });
  }

  // Partnership
  if (/partner|strategic|relationship/i.test(allText)) {
    propositions.push({
      label: 'Partnership',
      description: 'Strategic partner vs agency/vendor',
      evidence: 'Partner language in messaging'
    });
  }

  // Accessibility
  if (/iphone|simple|easy|don't\s*need/i.test(allText)) {
    propositions.push({
      label: 'Accessibility',
      description: 'iPhone videos work (low barrier)',
      evidence: 'Low barrier to entry messaging'
    });
  }

  // Authority
  if (/celebrity|famous|known|authority|trust/i.test(allText)) {
    propositions.push({
      label: 'Authority',
      description: '"Celebrity dentist" positioning',
      evidence: 'Authority-building language'
    });
  }

  // ROI
  if (/pay.*itself|roi|return|worth/i.test(allText)) {
    propositions.push({
      label: 'ROI Certainty',
      description: '"Pays for itself" messaging',
      evidence: 'ROI-focused claims'
    });
  }

  // Credibility
  if (/since\s*\d{4}|\d+\+?\s*(?:years?|practices?|clients?)/i.test(allText)) {
    const match = allText.match(/since\s*(\d{4})|(\d+)\+?\s*(?:years?|practices?|clients?)/i);
    propositions.push({
      label: 'Credibility',
      description: match ? `"${match[0]}"` : 'Established track record',
      evidence: 'Historical credibility claims'
    });
  }

  // Results
  if (/\d+%|\$\d+|\d+x/i.test(allText)) {
    propositions.push({
      label: 'Results',
      description: 'Specific, measurable outcomes',
      evidence: 'Quantified results in testimonials'
    });
  }

  return propositions;
}

// ============================================================================
// CREATIVE EXECUTION ANALYSIS
// ============================================================================

function analyzeCreativeExecution(ads: Ad[]): CreativeExecution {
  const ctaCounts: Map<string, number> = new Map();
  const landingPages: Set<string> = new Set();
  const formats: Map<string, number> = new Map();

  for (const ad of ads) {
    // Count CTAs
    const cta = (ad.cta || 'Learn more').toLowerCase();
    ctaCounts.set(cta, (ctaCounts.get(cta) || 0) + 1);

    // Collect landing pages
    if (ad.destinationUrl) {
      const url = ad.destinationUrl.replace(/^https?:\/\//, '').split('/')[0];
      landingPages.add(url);
    }

    // Count formats
    const format = ad.mediaType || 'unknown';
    formats.set(format, (formats.get(format) || 0) + 1);
  }

  // Calculate CTA distribution
  const totalAds = ads.length;
  const ctaDistribution: CTADistribution[] = Array.from(ctaCounts.entries())
    .map(([cta, count]) => ({
      cta: cta.charAt(0).toUpperCase() + cta.slice(1),
      count,
      percentage: Math.round((count / totalAds) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  // Determine primary format
  const primaryFormat = Array.from(formats.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'video';

  // Calculate date range
  const dates = ads
    .map(a => a.startDate)
    .filter(Boolean)
    .map(d => new Date(d!))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const duration = dates.length >= 2
    ? `${Math.ceil((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24 * 30))}+ months`
    : 'Unknown';

  return {
    format: primaryFormat === 'video' ? 'All video' : `Mixed (${primaryFormat} primary)`,
    lengthRange: '30-60 seconds',
    style: 'Testimonials + text overlay',
    production: 'iPhone to moderate',
    ctaDistribution,
    landingPages: Array.from(landingPages),
    variations: ads.length,
    duration,
    optimization: 'Systematic creative testing'
  };
}

// ============================================================================
// AUDIENCE TARGETING ANALYSIS
// ============================================================================

function analyzeAudienceTargeting(ads: Ad[]): AudienceTargeting {
  const allText = ads.map(a => a.primaryText || '').join(' ').toLowerCase();

  // Determine primary audience
  let coreTarget = 'Business owners';
  let secondary = 'Decision makers';

  if (/dentist|dental/i.test(allText)) {
    coreTarget = 'Dental practice owners';
    secondary = 'DSO decision makers';
  }

  // Build segmentation
  const segmentation: { segment: string; message: string }[] = [];

  if (/solo|independent/i.test(allText)) {
    segmentation.push({
      segment: 'Solo practitioners',
      message: 'Celebrity/authority positioning'
    });
  }

  if (/grow|scale|expand/i.test(allText)) {
    segmentation.push({
      segment: 'Growth-stage practices',
      message: 'Case studies showing scaling'
    });
  }

  if (/agency|vendor|ghost/i.test(allText)) {
    segmentation.push({
      segment: 'Frustrated switchers',
      message: 'Agency burnout messaging'
    });
  }

  if (/diy|free|tool|download/i.test(allText)) {
    segmentation.push({
      segment: 'DIY marketers',
      message: 'Free tools and systems'
    });
  }

  return {
    primary: {
      coreTarget,
      secondary,
      geography: 'US-wide (no visible geo-restriction)',
      demographics: 'Business owners 30-65'
    },
    segmentation
  };
}

// ============================================================================
// INVESTMENT ESTIMATION
// ============================================================================

function estimateInvestment(ads: Ad[]): InvestmentEstimate {
  const adCount = ads.length;

  // Estimate based on ad volume and duration
  // Conservative: $300-500 per ad per month
  // Aggressive: $1000-2000 per ad per month

  const conservativePerAd = 400;
  const aggressivePerAd = 1500;

  const conservative = Math.round(adCount * conservativePerAd / 1000) * 1000;
  const aggressive = Math.round(adCount * aggressivePerAd / 1000) * 1000;

  // Calculate duration
  const dates = ads
    .map(a => a.startDate)
    .filter(Boolean)
    .map(d => new Date(d!))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  let duration = 'Unknown';
  if (dates.length >= 2) {
    const earliest = dates[0];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    duration = `${monthNames[earliest.getMonth()]} ${earliest.getFullYear()} - Present`;
  }

  return {
    conservative: `$${conservative.toLocaleString()}/month`,
    aggressive: `$${aggressive.toLocaleString()}/month`,
    duration,
    signal: adCount > 30 ? 'Primary acquisition channel' : 'Secondary marketing channel'
  };
}

// ============================================================================
// STRATEGIC ANALYSIS
// ============================================================================

function analyzeStrengths(ads: Ad[], campaigns: CampaignCluster[], caseStudies: CaseStudy[]): StrategicInsight[] {
  const strengths: StrategicInsight[] = [];

  if (caseStudies.length >= 3) {
    strengths.push({
      title: 'Testimonial Factory Model',
      description: `${caseStudies.length} case studies with specific numbers targeting every pain point`
    });
  }

  if (ads.length > 20) {
    const variations = campaigns.reduce((sum, c) => sum + c.variations, 0);
    strengths.push({
      title: 'Systematic Testing at Scale',
      description: `${variations}+ variations = systematic optimization, not guessing`
    });
  }

  if (campaigns.length >= 3) {
    strengths.push({
      title: 'Clear Funnel Progression',
      description: 'Multiple campaign types serving different funnel stages'
    });
  }

  const hasSpecificNumbers = ads.some(a =>
    /\d{2,3}%|\$\d+(?:,\d{3})*|\d{3,}\s*patients?/i.test(a.primaryText || '')
  );
  if (hasSpecificNumbers) {
    strengths.push({
      title: 'Proof Specificity',
      description: 'Oddly specific numbers (196% not 200%) signal authenticity'
    });
  }

  const allText = ads.map(a => a.primaryText || '').join(' ');
  if (/since\s*\d{4}|\d+\+?\s*(?:years?|practices?)/i.test(allText)) {
    strengths.push({
      title: 'Brand Evolution Strategy',
      description: 'Established credibility with long track record'
    });
  }

  if (ads.length > 30) {
    strengths.push({
      title: 'Investment Level Signal',
      description: 'High ad volume indicates significant budget commitment'
    });
  }

  return strengths;
}

function analyzeWeaknesses(ads: Ad[], campaigns: CampaignCluster[], creative: CreativeExecution): StrategicInsight[] {
  const weaknesses: StrategicInsight[] = [];

  // Creative fatigue risk
  const dates = ads.map(a => a.startDate).filter(Boolean);
  const oldestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d!).getTime()))) : null;
  if (oldestDate) {
    const monthsActive = Math.ceil((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (monthsActive >= 6) {
      weaknesses.push({
        title: 'Creative Fatigue Risk',
        description: `${monthsActive}+ months on same creative themes may lead to audience fatigue`
      });
    }
  }

  // Geographic dilution
  weaknesses.push({
    title: 'Geographic Dilution',
    description: 'National targeting vs local focus may reduce relevance'
  });

  // Missing urgency
  const hasUrgency = ads.some(a =>
    /limited\s*time|ending\s*soon|only\s*\d+|deadline/i.test(a.primaryText || '')
  );
  if (!hasUrgency) {
    weaknesses.push({
      title: 'Missing Urgency Mechanisms',
      description: 'No scarcity or time-limited offers to drive immediate action'
    });
  }

  // CTA monotony
  const topCTA = creative.ctaDistribution[0];
  if (topCTA && topCTA.percentage > 60) {
    weaknesses.push({
      title: 'CTA Monotony',
      description: `${topCTA.percentage}% "${topCTA.cta}" only - limited CTA testing`
    });
  }

  // Pricing opacity
  const hasPricing = ads.some(a =>
    /\$\d+.*(?:month|year|package)|pricing|cost/i.test(a.primaryText || '')
  );
  if (!hasPricing) {
    weaknesses.push({
      title: 'Pricing Opacity',
      description: 'No pricing information - may lose price-conscious prospects'
    });
  }

  // Unknown retargeting
  weaknesses.push({
    title: 'Unknown Retargeting',
    description: 'Cannot observe retargeting strategy from ad library'
  });

  return weaknesses;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export function generateStrategicAnalysis(competitor: string, ads: Ad[]): StrategicAnalysis {
  // Cluster ads into campaigns
  const adClusters = clusterAdsBySimilarity(ads, 0.35);

  // Build campaign objects
  const campaigns: CampaignCluster[] = adClusters
    .slice(0, 6) // Top 6 campaigns
    .map((cluster, index) => {
      const theme = identifyCampaignTheme(cluster);
      const topCTA = getMostCommonCTA(cluster);
      const landingPages = [...new Set(cluster.map(a => a.destinationUrl).filter(Boolean))];

      return {
        id: `campaign-${index + 1}`,
        name: theme.name,
        description: theme.description,
        percentage: Math.round((cluster.length / ads.length) * 100),
        adCount: cluster.length,
        variations: cluster.length,
        hook: extractHook(cluster[0]?.primaryText || ''),
        offer: extractOffer(cluster),
        cta: topCTA.cta,
        ctaPercentage: topCTA.percentage,
        landingPage: landingPages[0] || 'Unknown',
        targetAudience: extractTargetAudience(cluster),
        format: cluster[0]?.mediaType === 'video' ? 'All video' : 'Mixed',
        insights: generateCampaignInsights(cluster, theme),
        ads: cluster
      };
    })
    .filter(c => c.adCount >= 2);

  // Extract other analysis components
  const caseStudies = extractCaseStudies(ads);
  const painPointCategories = analyzePainPoints(ads);
  const valuePropositions = extractValuePropositions(ads);
  const creativeExecution = analyzeCreativeExecution(ads);
  const audienceTargeting = analyzeAudienceTargeting(ads);
  const investment = estimateInvestment(ads);
  const strengths = analyzeStrengths(ads, campaigns, caseStudies);
  const weaknesses = analyzeWeaknesses(ads, campaigns, creativeExecution);

  // Calculate date range
  const dates = ads
    .map(a => a.startDate)
    .filter(Boolean)
    .map(d => new Date(d!))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  const dateRange = dates.length > 0
    ? `${monthNames[dates[0].getMonth()]} ${dates[0].getFullYear()} - ${monthNames[now.getMonth()]} ${now.getFullYear()}`
    : `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  // Generate key insights
  const keyInsights = [
    {
      title: 'Testimonial Factory',
      description: `${caseStudies.length} case studies with specific numbers targeting every pain point`,
      color: 'blue' as const
    },
    {
      title: 'Modular Creative Testing',
      description: `${ads.length}+ variations = systematic optimization, not guessing`,
      color: 'yellow' as const
    },
    {
      title: 'Specificity = Credibility',
      description: 'Odd numbers (196% not 200%, $91K not $100K) bypass skepticism',
      color: 'purple' as const
    }
  ];

  // Generate ad examples
  const adExamples = generateAdExamples(campaigns, caseStudies);

  return {
    competitor,
    platform: ads[0]?.platform || 'meta',
    dateRange,
    generatedAt: new Date().toISOString(),
    totalAds: ads.length,
    activeDuration: creativeExecution.duration,
    coreCampaigns: campaigns.length,
    campaigns,
    investment,
    caseStudies,
    painPointCategories,
    valuePropositions,
    creativeExecution,
    audienceTargeting,
    strengths,
    weaknesses,
    keyInsights,
    adExamples
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMostCommonCTA(ads: Ad[]): { cta: string; percentage: number } {
  const ctaCounts: Map<string, number> = new Map();

  for (const ad of ads) {
    const cta = ad.cta || 'Learn more';
    ctaCounts.set(cta, (ctaCounts.get(cta) || 0) + 1);
  }

  const entries = Array.from(ctaCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topCTA = entries[0] || ['Learn more', 0];

  return {
    cta: topCTA[0],
    percentage: Math.round((topCTA[1] / ads.length) * 100)
  };
}

function extractOffer(ads: Ad[]): string | undefined {
  const allText = ads.map(a => a.primaryText || '').join(' ');

  for (const pattern of OFFER_PATTERNS) {
    const match = allText.match(pattern);
    if (match) {
      return match[1]?.trim();
    }
  }

  return undefined;
}

function generateCampaignInsights(ads: Ad[], theme: { name: string; description: string }): string[] {
  const insights: string[] = [];

  if (ads.length >= 10) {
    insights.push(`${ads.length}+ variations of the same core message shows systematic creative testing.`);
  }

  if (theme.name.includes('Case Study')) {
    insights.push('Using specific client results builds credibility and relatability.');
  }

  if (theme.name.includes('Celebrity')) {
    insights.push('This is their flagship brand positioning campaign.');
  }

  if (theme.name.includes('Lead Magnet') || theme.name.includes('System')) {
    insights.push('Mid-funnel lead capture for nurturing sequences.');
  }

  return insights;
}

function generateAdExamples(campaigns: CampaignCluster[], caseStudies: CaseStudy[]): StrategicAnalysis['adExamples'] {
  const examples: StrategicAnalysis['adExamples'] = [];

  // Campaign examples
  const campaignAds = campaigns.slice(0, 2).map(campaign => ({
    label: campaign.name.toUpperCase(),
    hook: campaign.hook,
    details: `CTA: ${campaign.cta}`,
    result: undefined
  }));

  if (campaignAds.length > 0) {
    examples.push({
      category: 'Visual Representations',
      color: '#3b82f6',
      ads: campaignAds
    });
  }

  // Case study examples
  const caseStudyAds = caseStudies.slice(0, 6).map(cs => ({
    label: cs.name.toUpperCase(),
    hook: cs.hook,
    details: `Pain: ${cs.painPoint}`,
    result: cs.result
  }));

  if (caseStudyAds.length > 0) {
    examples.push({
      category: 'Case Studies',
      color: '#8b5cf6',
      ads: caseStudyAds
    });
  }

  return examples;
}
