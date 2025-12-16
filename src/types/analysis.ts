import { Ad, AdCategory } from './ad';

export interface CopyAnalysis {
  wordFrequency: Map<string, number>;
  topKeywords: string[];
  commonPhrases: string[]; // n-grams
  ctaDistribution: Map<string, number>;
  avgCopyLength: number;
  emojiUsage: string[];
  readabilityScore: number;
  hashtagFrequency: Map<string, number>;
}

export interface CategorizationResult {
  category: AdCategory;
  confidence: number;
  signals: string[];
  scores: Record<AdCategory, number>;
}

/**
 * Comprehensive Landing Page Analysis for Senior Marketers
 * Extracts everything needed to understand competitor conversion strategy
 */
export interface LandingPageAnalysis {
  // Page Identity
  url: string;
  finalUrl?: string; // After redirects
  domain: string;
  title: string;
  metaDescription?: string;
  canonicalUrl?: string;

  // Headlines Hierarchy - Critical for messaging analysis
  headlines: {
    h1: string[];
    h2: string[];
    h3: string[];
    primaryHeadline?: string; // Most prominent headline
    valueProposition?: string; // Identified value prop
  };

  // CTA Analysis - Understanding conversion strategy
  ctas: {
    primary: CTAElement[];
    secondary: CTAElement[];
    totalCount: number;
    dominantAction?: string; // Most common CTA text
    ctaPlacement: ('above_fold' | 'mid_page' | 'bottom' | 'sticky' | 'floating')[];
  };

  // Form Analysis - Lead capture friction
  forms: FormAnalysis[];
  formSummary: {
    totalForms: number;
    avgFieldCount: number;
    friction: 'low' | 'medium' | 'high' | 'very_high';
    frictionScore: number; // 1-10 scale
    hasMultiStep: boolean;
    requiresPhone: boolean;
    requiresCompanyInfo: boolean;
  };

  // Trust & Credibility Signals
  trustSignals: {
    types: TrustSignalType[];
    details: TrustSignalDetail[];
    trustScore: number; // 1-10 based on signal density
    socialProof: {
      hasReviews: boolean;
      hasTestimonials: boolean;
      hasLogos: boolean;
      hasStats: boolean;
      reviewPlatforms?: string[];
      customerCount?: string;
    };
    guarantees: string[];
    certifications: string[];
    securityBadges: string[];
  };

  // Offers & Pricing
  offers: {
    types: OfferType[];
    details: OfferDetail[];
    hasFreeTrial: boolean;
    hasFreeConsultation: boolean;
    hasDiscount: boolean;
    pricePoints: string[];
    urgencyElements: string[];
    riskReversals: string[]; // Money-back guarantees, etc.
  };

  // Page Structure & UX
  pageStructure: {
    layout: 'single_column' | 'two_column' | 'landing_page' | 'long_form' | 'squeeze_page';
    estimatedLength: 'short' | 'medium' | 'long' | 'very_long';
    sections: PageSection[];
    hasHero: boolean;
    hasBenefits: boolean;
    hasFeatures: boolean;
    hasTestimonials: boolean;
    hasPricing: boolean;
    hasFAQ: boolean;
    hasComparison: boolean;
    hasVideo: boolean;
    hasAnimation: boolean;
  };

  // Media & Visual Elements
  media: {
    heroImage: boolean;
    heroVideo: boolean;
    productImages: number;
    testimonialPhotos: number;
    infographics: number;
    videoCount: number;
    hasAutoplayVideo: boolean;
  };

  // Engagement & Conversion Tools
  conversionTools: {
    hasChatWidget: boolean;
    chatProvider?: string;
    hasExitIntent: boolean;
    hasPopup: boolean;
    hasCountdownTimer: boolean;
    hasStickyHeader: boolean;
    hasStickyFooter: boolean;
    hasFloatingCTA: boolean;
    hasProgressBar: boolean;
    hasClickToCall: boolean;
    phoneNumber?: string;
  };

  // Navigation & User Flow
  navigation: {
    hasMainNav: boolean;
    navItemCount: number;
    hasFooterNav: boolean;
    exitLinks: number; // Links that leave the page
    isMinimalNav: boolean; // Reduced nav for conversion focus
  };

  // Content Analysis
  content: {
    wordCount: number;
    readabilityScore: number;
    bulletPointCount: number;
    hasEmoji: boolean;
    primaryTone: 'professional' | 'casual' | 'urgent' | 'friendly' | 'authoritative';
    keyPhrases: string[];
  };

  // Technical & Performance
  technical: {
    loadTime?: number;
    mobileOptimized: boolean;
    hasStructuredData: boolean;
    trackingPixels: string[];
    abTestingDetected: boolean;
  };

  // Screenshots
  screenshotPath?: string;
  fullPageScreenshotPath?: string;

  // Analysis Metadata
  analyzedAt: string;
  analysisVersion: string;

  // Strategic Insights (Generated)
  strategicInsights?: {
    conversionFocus: string;
    targetAudience?: string;
    uniqueSellingPoints: string[];
    competitiveAdvantages: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export interface CTAElement {
  text: string;
  type: 'button' | 'link' | 'form_submit' | 'phone' | 'chat';
  href?: string;
  position: 'above_fold' | 'mid_page' | 'bottom' | 'sticky' | 'floating';
  prominence: 'primary' | 'secondary' | 'tertiary';
  isSticky: boolean;
  colorContrast?: 'high' | 'medium' | 'low';
}

export interface FormAnalysis {
  id?: string;
  purpose: 'lead_gen' | 'signup' | 'contact' | 'quote' | 'demo' | 'newsletter' | 'other';
  fieldCount: number;
  fields: FormField[];
  hasConditionalFields: boolean;
  isMultiStep: boolean;
  stepCount?: number;
  submitButtonText?: string;
  frictionLevel: 'low' | 'medium' | 'high' | 'very_high';
  position: 'hero' | 'sidebar' | 'inline' | 'modal' | 'bottom';
}

export interface FormField {
  type: 'text' | 'email' | 'phone' | 'name' | 'company' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'other';
  label?: string;
  placeholder?: string;
  required: boolean;
  frictionWeight: number; // 1-5, higher = more friction
}

export type TrustSignalType =
  | 'star_ratings'
  | 'review_count'
  | 'third_party_reviews'
  | 'customer_logos'
  | 'customer_count'
  | 'years_experience'
  | 'guarantee'
  | 'security_badge'
  | 'certification'
  | 'award'
  | 'media_mention'
  | 'case_study'
  | 'testimonial_quote'
  | 'before_after'
  | 'results_stats';

export interface TrustSignalDetail {
  type: TrustSignalType;
  description: string;
  examples: string[];
  location: 'hero' | 'above_fold' | 'testimonial_section' | 'footer' | 'sidebar';
}

export type OfferType =
  | 'free_trial'
  | 'free_consultation'
  | 'discount_percent'
  | 'discount_dollar'
  | 'free_shipping'
  | 'bonus_gift'
  | 'money_back'
  | 'price_match'
  | 'financing'
  | 'limited_time'
  | 'bundle_deal'
  | 'first_purchase';

export interface OfferDetail {
  type: OfferType;
  text: string;
  value?: string;
  urgency: boolean;
  prominence: 'high' | 'medium' | 'low';
}

export interface PageSection {
  type: 'hero' | 'benefits' | 'features' | 'testimonials' | 'pricing' | 'faq' | 'comparison' | 'cta' | 'form' | 'about' | 'process' | 'gallery' | 'video' | 'stats' | 'other';
  position: number;
  hasHeadline: boolean;
  hasCTA: boolean;
}

/**
 * Aggregated landing page insights across multiple pages
 */
export interface LandingPageSummary {
  competitor: string;
  pagesAnalyzed: number;
  analysisDate: string;

  // Aggregated CTA Analysis
  ctaPatterns: {
    mostCommon: string[];
    averageCount: number;
    primaryActions: Array<{ text: string; frequency: number }>;
  };

  // Form Friction Summary
  formComplexity: {
    averageFields: number;
    mostCommonFields: string[];
    frictionDistribution: {
      low: number;
      medium: number;
      high: number;
      very_high: number;
    };
    overallFriction: 'low' | 'medium' | 'high';
  };

  // Trust Signal Summary
  trustSignalUsage: Record<TrustSignalType, number>;
  avgTrustScore: number;

  // Offer Analysis
  offerTypes: Record<OfferType, number>;
  commonOffers: string[];

  // Page Feature Summary
  pageFeatures: {
    withVideo: number;
    withTestimonials: number;
    withPricing: number;
    withChat: number;
    withExitIntent: number;
    withCountdown: number;
  };

  // Conversion Approach
  conversionApproach: {
    primaryMethod: 'form' | 'phone' | 'chat' | 'click_to_action';
    urgencyUsage: 'heavy' | 'moderate' | 'light' | 'none';
    socialProofDensity: 'high' | 'medium' | 'low';
  };

  // Strategic Insights
  strategicInsights: string[];
  opportunities: string[];
  threatsToConsider: string[];
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  emotions: {
    urgency: number;
    excitement: number;
    trust: number;
    fear: number;
  };
}

export interface CompetitorAnalysis {
  competitor: string;
  analysisDate: string;
  totalAds: number;
  platformBreakdown: Record<string, number>;
  categoryBreakdown: Record<AdCategory, number>;
  copyAnalysis: CopyAnalysis;
  topPerformingAngles: string[];
  messagingThemes: string[];
  ctaPatterns: Array<{ cta: string; count: number; percentage: number }>;
  dateRange: {
    earliest?: string;
    latest?: string;
  };
  landingPageInsights?: {
    commonElements: string[];
    avgFormFriction: string;
    topCTAs: string[];
  };
}

export interface StrategicOpportunity {
  type: 'gap' | 'differentiation' | 'trend' | 'weakness';
  description: string;
  opportunity: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ExecutiveSummary {
  competitor: string;
  analysisDate: string;
  keyFindings: {
    summary: string;
    primaryTheme: string;
    keyOpportunity: string;
  };
  advertisingFootprint: {
    totalAds: number;
    platforms: Record<string, { count: number; focus: string }>;
  };
  messagingStrategy: {
    topKeywords: string[];
    primaryAngles: string[];
    dominantCTA: { text: string; percentage: number };
  };
  creativeMix: Record<AdCategory, number>;
  strategicOpportunities: StrategicOpportunity[];
  recommendedActions: string[];
}
