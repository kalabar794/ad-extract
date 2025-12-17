/**
 * Landing Page Analyzer - Comprehensive conversion intelligence extraction
 * Designed for senior marketers to understand competitor landing page strategies
 */

import { Browser, BrowserContext, Page } from 'playwright';
import {
  LandingPageAnalysis,
  LandingPageSummary,
  CTAElement,
  FormAnalysis,
  FormField,
  TrustSignalType,
  TrustSignalDetail,
  OfferType,
  OfferDetail,
  PageSection
} from '../types/analysis';
import { getBrowser, createContext, createPage, takeScreenshot } from '../utils/browser';
import { AppConfig, defaultConfig } from '../types/config';
import { createLogger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const logger = createLogger('landing-page-analyzer');

const ANALYSIS_VERSION = '1.0.0';

// Field friction weights - higher = more friction
const FIELD_FRICTION: Record<string, number> = {
  email: 1,
  name: 1,
  first_name: 1,
  last_name: 1.5,
  phone: 3,
  company: 2,
  job_title: 2,
  industry: 2,
  company_size: 2,
  budget: 4,
  address: 4,
  city: 2,
  state: 1,
  zip: 1,
  country: 1,
  message: 2,
  textarea: 2,
  password: 2,
  credit_card: 5,
  ssn: 5,
  default: 1.5
};

export class LandingPageAnalyzer {
  private config: AppConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  constructor(config: Partial<AppConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Analyze a single landing page
   */
  async analyze(url: string): Promise<LandingPageAnalysis> {
    const startTime = Date.now();
    logger.info(`Analyzing landing page: ${url}`);

    const page = await this.initBrowser();

    try {
      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // Get final URL after redirects
      const finalUrl = page.url();
      const domain = new URL(finalUrl).hostname;

      // Wait for dynamic content
      await page.waitForTimeout(3000);

      // Extract all page data in parallel
      const [
        pageIdentity,
        headlines,
        ctas,
        forms,
        trustSignals,
        offers,
        pageStructure,
        media,
        conversionTools,
        navigation,
        content,
        technical
      ] = await Promise.all([
        this.extractPageIdentity(page),
        this.extractHeadlines(page),
        this.extractCTAs(page),
        this.extractForms(page),
        this.extractTrustSignals(page),
        this.extractOffers(page),
        this.extractPageStructure(page),
        this.extractMedia(page),
        this.extractConversionTools(page),
        this.extractNavigation(page),
        this.extractContent(page),
        this.extractTechnical(page, startTime)
      ]);

      // Calculate form summary
      const formSummary = this.calculateFormSummary(forms);

      // Calculate trust score
      const trustScore = this.calculateTrustScore(trustSignals);

      // Capture screenshots if enabled
      let screenshotPath: string | undefined;
      let fullPageScreenshotPath: string | undefined;

      if (this.config.extraction.screenshots) {
        const screenshotDir = this.config.output.screenshotsDirectory;
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }

        const timestamp = Date.now();
        const safeDomain = domain.replace(/[^a-z0-9]/gi, '_');

        screenshotPath = path.join(screenshotDir, `lp_${safeDomain}_${timestamp}.png`);
        await takeScreenshot(page, screenshotPath);

        fullPageScreenshotPath = path.join(screenshotDir, `lp_${safeDomain}_${timestamp}_full.png`);
        await page.screenshot({ path: fullPageScreenshotPath, fullPage: true });
      }

      // Generate strategic insights
      const strategicInsights = this.generateStrategicInsights({
        headlines,
        ctas,
        forms,
        formSummary,
        trustSignals,
        trustScore,
        offers,
        pageStructure,
        conversionTools
      });

      const analysis: LandingPageAnalysis = {
        url,
        finalUrl,
        domain,
        title: pageIdentity.title,
        metaDescription: pageIdentity.metaDescription,
        canonicalUrl: pageIdentity.canonicalUrl,
        headlines,
        ctas,
        forms,
        formSummary,
        trustSignals: {
          ...trustSignals,
          trustScore
        },
        offers,
        pageStructure,
        media,
        conversionTools,
        navigation,
        content,
        technical,
        screenshotPath,
        fullPageScreenshotPath,
        analyzedAt: new Date().toISOString(),
        analysisVersion: ANALYSIS_VERSION,
        strategicInsights
      };

      return analysis;

    } finally {
      await this.cleanup();
    }
  }

  /**
   * Analyze multiple landing pages and generate summary
   */
  async analyzeMultiple(urls: string[], competitor: string): Promise<{
    analyses: LandingPageAnalysis[];
    summary: LandingPageSummary;
  }> {
    const analyses: LandingPageAnalysis[] = [];

    for (const url of urls) {
      try {
        const analysis = await this.analyze(url);
        analyses.push(analysis);
      } catch (error) {
        logger.error(`Failed to analyze ${url}: ${(error as Error).message}`);
      }
    }

    const summary = this.generateSummary(analyses, competitor);
    return { analyses, summary };
  }

  /**
   * Initialize browser
   */
  private async initBrowser(): Promise<Page> {
    this.browser = await getBrowser(this.config.browser);
    this.context = await createContext(this.browser, this.config.browser);
    return await createPage(this.context, this.config.browser);
  }

  /**
   * Cleanup browser resources
   */
  private async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close().catch((err) => {
        logger.debug(`Context close warning: ${err.message}`);
      });
      this.context = null;
    }
  }

  /**
   * Extract page identity information
   */
  private async extractPageIdentity(page: Page): Promise<{
    title: string;
    metaDescription?: string;
    canonicalUrl?: string;
  }> {
    return await page.evaluate(() => {
      return {
        title: document.title || '',
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
        canonicalUrl: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined
      };
    });
  }

  /**
   * Extract all headlines
   */
  private async extractHeadlines(page: Page): Promise<LandingPageAnalysis['headlines']> {
    return await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()).filter(Boolean);
      const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()).filter(Boolean).slice(0, 15);
      const h3s = Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim()).filter(Boolean).slice(0, 15);

      // Find primary headline (first H1 or largest text element in hero)
      let primaryHeadline = h1s[0];
      if (!primaryHeadline) {
        // Try to find hero headline by common class patterns
        const heroHeadline = document.querySelector(
          '[class*="hero"] h1, [class*="hero"] h2, [class*="headline"], [class*="title"]'
        );
        if (heroHeadline) {
          primaryHeadline = heroHeadline.textContent?.trim() || '';
        }
      }

      // Try to identify value proposition
      let valueProposition: string | undefined;
      const valuePropPatterns = [
        /the\s+(best|only|#1|fastest|easiest|simplest)/i,
        /get\s+\w+\s+(in|within|for)/i,
        /transform|revolutionize|discover|unlock/i,
        /without\s+(the|any)/i,
        /finally,?\s+a/i
      ];

      const allHeadlines = [...h1s, ...h2s];
      for (const headline of allHeadlines) {
        for (const pattern of valuePropPatterns) {
          if (pattern.test(headline)) {
            valueProposition = headline;
            break;
          }
        }
        if (valueProposition) break;
      }

      return {
        h1: h1s,
        h2: h2s,
        h3: h3s,
        primaryHeadline,
        valueProposition
      };
    });
  }

  /**
   * Extract all CTAs
   */
  private async extractCTAs(page: Page): Promise<LandingPageAnalysis['ctas']> {
    const rawCTAs = await page.evaluate(() => {
      const ctas: Array<{
        text: string;
        type: string;
        href?: string;
        rect: { top: number; left: number; bottom: number };
        isSticky: boolean;
        classes: string;
      }> = [];

      const viewportHeight = window.innerHeight;

      // Find all button-like elements
      const ctaSelectors = [
        'button',
        'a.btn', 'a.button', 'a[class*="btn"]', 'a[class*="cta"]',
        'input[type="submit"]',
        '[role="button"]',
        '[class*="cta"]',
        '[class*="button"]'
      ];

      const elements = document.querySelectorAll(ctaSelectors.join(', '));

      elements.forEach(el => {
        const text = (el.textContent || (el as HTMLInputElement).value || '').trim();
        if (!text || text.length < 2 || text.length > 50) return;

        // Skip navigation items
        if (el.closest('nav') || el.closest('[class*="nav"]')) return;

        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        const isSticky = computedStyle.position === 'fixed' || computedStyle.position === 'sticky';

        ctas.push({
          text,
          type: el.tagName.toLowerCase() === 'a' ? 'link' :
                el.tagName.toLowerCase() === 'input' ? 'form_submit' : 'button',
          href: (el as HTMLAnchorElement).href || undefined,
          rect: { top: rect.top, left: rect.left, bottom: rect.bottom },
          isSticky,
          classes: el.className
        });
      });

      // Look for phone numbers as CTAs
      const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
      phoneLinks.forEach(el => {
        const text = el.textContent?.trim() || '';
        const rect = el.getBoundingClientRect();
        if (text) {
          ctas.push({
            text,
            type: 'phone',
            href: (el as HTMLAnchorElement).href,
            rect: { top: rect.top, left: rect.left, bottom: rect.bottom },
            isSticky: false,
            classes: ''
          });
        }
      });

      return { ctas, viewportHeight };
    });

    // Process and categorize CTAs
    const primary: CTAElement[] = [];
    const secondary: CTAElement[] = [];
    const placements: Set<'above_fold' | 'mid_page' | 'bottom' | 'sticky' | 'floating'> = new Set();

    const ctaCounts: Record<string, number> = {};

    for (const cta of rawCTAs.ctas) {
      // Determine position
      let position: CTAElement['position'] = 'mid_page';
      if (cta.isSticky) {
        position = 'sticky';
        placements.add('sticky');
      } else if (cta.rect.top < rawCTAs.viewportHeight * 0.8) {
        position = 'above_fold';
        placements.add('above_fold');
      } else if (cta.rect.top > rawCTAs.viewportHeight * 2) {
        position = 'bottom';
        placements.add('bottom');
      } else {
        placements.add('mid_page');
      }

      // Determine prominence
      const isPrimary = cta.classes.includes('primary') ||
                       cta.classes.includes('cta') ||
                       /get started|sign up|book|schedule|contact|call|buy|order|try|start/i.test(cta.text);

      const element: CTAElement = {
        text: cta.text,
        type: cta.type as CTAElement['type'],
        href: cta.href,
        position,
        prominence: isPrimary ? 'primary' : 'secondary',
        isSticky: cta.isSticky
      };

      if (isPrimary) {
        primary.push(element);
      } else {
        secondary.push(element);
      }

      // Count CTA text occurrences
      const normalizedText = cta.text.toLowerCase();
      ctaCounts[normalizedText] = (ctaCounts[normalizedText] || 0) + 1;
    }

    // Find dominant CTA
    const sortedCTAs = Object.entries(ctaCounts).sort((a, b) => b[1] - a[1]);
    const dominantAction = sortedCTAs[0]?.[0];

    return {
      primary: this.deduplicateCTAs(primary).slice(0, 10),
      secondary: this.deduplicateCTAs(secondary).slice(0, 15),
      totalCount: rawCTAs.ctas.length,
      dominantAction,
      ctaPlacement: Array.from(placements)
    };
  }

  /**
   * Deduplicate CTAs by text
   */
  private deduplicateCTAs(ctas: CTAElement[]): CTAElement[] {
    const seen = new Set<string>();
    return ctas.filter(cta => {
      const key = cta.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Extract all forms
   */
  private async extractForms(page: Page): Promise<FormAnalysis[]> {
    const rawForms = await page.evaluate(() => {
      const forms: Array<{
        id?: string;
        fields: Array<{
          type: string;
          name?: string;
          label?: string;
          placeholder?: string;
          required: boolean;
        }>;
        submitText?: string;
        rect: { top: number };
        hasSteps: boolean;
      }> = [];

      const viewportHeight = window.innerHeight;

      document.querySelectorAll('form').forEach(form => {
        const fields: typeof forms[0]['fields'] = [];

        // Get all input fields
        form.querySelectorAll('input, select, textarea').forEach(field => {
          const input = field as HTMLInputElement;
          if (['hidden', 'submit', 'button'].includes(input.type)) return;

          // Find label
          let label = '';
          const labelEl = form.querySelector(`label[for="${input.id}"]`);
          if (labelEl) {
            label = labelEl.textContent?.trim() || '';
          } else {
            // Try parent label
            const parentLabel = input.closest('label');
            if (parentLabel) {
              label = parentLabel.textContent?.trim().replace(input.value || '', '').trim() || '';
            }
          }

          fields.push({
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || '',
            label,
            placeholder: input.placeholder || '',
            required: input.required
          });
        });

        // Get submit button text
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
        const submitText = submitBtn?.textContent?.trim() || (submitBtn as HTMLInputElement)?.value || '';

        const rect = form.getBoundingClientRect();

        // Check for multi-step indicators
        const hasSteps = !!form.querySelector('[class*="step"], [class*="progress"], [data-step]');

        if (fields.length > 0) {
          forms.push({
            id: form.id || undefined,
            fields,
            submitText,
            rect: { top: rect.top },
            hasSteps
          });
        }
      });

      return { forms, viewportHeight };
    });

    return rawForms.forms.map(form => {
      // Determine form purpose
      const purpose = this.determineFormPurpose(form.fields, form.submitText || '');

      // Calculate friction
      const fields: FormField[] = form.fields.map(f => ({
        type: this.categorizeFieldType(f.type, f.name, f.label, f.placeholder),
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        frictionWeight: this.getFieldFriction(f.type, f.name, f.label)
      }));

      const totalFriction = fields.reduce((sum, f) => sum + (f.required ? f.frictionWeight : f.frictionWeight * 0.5), 0);
      const frictionLevel = this.calculateFrictionLevel(totalFriction, fields.length);

      // Determine position
      let position: FormAnalysis['position'] = 'inline';
      if (form.rect.top < rawForms.viewportHeight * 0.5) {
        position = 'hero';
      } else if (form.rect.top > rawForms.viewportHeight * 2) {
        position = 'bottom';
      }

      return {
        id: form.id,
        purpose,
        fieldCount: fields.length,
        fields,
        hasConditionalFields: false, // Would need JS execution to detect
        isMultiStep: form.hasSteps,
        submitButtonText: form.submitText,
        frictionLevel,
        position
      };
    });
  }

  /**
   * Determine form purpose from fields and submit text
   */
  private determineFormPurpose(
    fields: Array<{ type: string; name?: string; label?: string; placeholder?: string }>,
    submitText: string
  ): FormAnalysis['purpose'] {
    const text = [
      submitText.toLowerCase(),
      ...fields.map(f => `${f.name} ${f.label} ${f.placeholder}`.toLowerCase())
    ].join(' ');

    if (text.includes('quote') || text.includes('estimate') || text.includes('pricing')) return 'quote';
    if (text.includes('demo') || text.includes('schedule') || text.includes('book')) return 'demo';
    if (text.includes('newsletter') || text.includes('subscribe') || text.includes('updates')) return 'newsletter';
    if (text.includes('contact') || text.includes('message') || text.includes('reach')) return 'contact';
    if (text.includes('sign up') || text.includes('register') || text.includes('create account')) return 'signup';
    return 'lead_gen';
  }

  /**
   * Categorize field type
   */
  private categorizeFieldType(
    type: string,
    name?: string,
    label?: string,
    placeholder?: string
  ): FormField['type'] {
    const text = `${name} ${label} ${placeholder}`.toLowerCase();

    if (type === 'email' || text.includes('email')) return 'email';
    if (type === 'tel' || text.includes('phone') || text.includes('mobile')) return 'phone';
    if (text.includes('company') || text.includes('organization') || text.includes('business')) return 'company';
    if (text.includes('name')) return 'name';
    if (type === 'textarea') return 'textarea';
    if (type === 'select') return 'select';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    return 'text';
  }

  /**
   * Get friction weight for a field
   */
  private getFieldFriction(type: string, name?: string, label?: string): number {
    const text = `${name} ${label}`.toLowerCase();

    for (const [key, weight] of Object.entries(FIELD_FRICTION)) {
      if (text.includes(key)) return weight;
    }

    return FIELD_FRICTION.default;
  }

  /**
   * Calculate friction level
   */
  private calculateFrictionLevel(totalFriction: number, fieldCount: number): FormAnalysis['frictionLevel'] {
    // Combine field count and friction weights
    const avgFriction = totalFriction / Math.max(fieldCount, 1);
    const score = fieldCount * 1.5 + avgFriction * 2;

    if (score <= 5) return 'low';
    if (score <= 10) return 'medium';
    if (score <= 18) return 'high';
    return 'very_high';
  }

  /**
   * Calculate form summary
   */
  private calculateFormSummary(forms: FormAnalysis[]): LandingPageAnalysis['formSummary'] {
    if (forms.length === 0) {
      return {
        totalForms: 0,
        avgFieldCount: 0,
        friction: 'low',
        frictionScore: 0,
        hasMultiStep: false,
        requiresPhone: false,
        requiresCompanyInfo: false
      };
    }

    const avgFieldCount = forms.reduce((sum, f) => sum + f.fieldCount, 0) / forms.length;
    const hasMultiStep = forms.some(f => f.isMultiStep);
    const requiresPhone = forms.some(f => f.fields.some(field => field.type === 'phone' && field.required));
    const requiresCompanyInfo = forms.some(f => f.fields.some(field => field.type === 'company' && field.required));

    // Calculate overall friction
    const frictionLevels = { low: 1, medium: 2, high: 3, very_high: 4 };
    const avgFrictionScore = forms.reduce((sum, f) => sum + frictionLevels[f.frictionLevel], 0) / forms.length;

    let friction: FormAnalysis['frictionLevel'] = 'low';
    if (avgFrictionScore >= 3.5) friction = 'very_high';
    else if (avgFrictionScore >= 2.5) friction = 'high';
    else if (avgFrictionScore >= 1.5) friction = 'medium';

    return {
      totalForms: forms.length,
      avgFieldCount: Math.round(avgFieldCount * 10) / 10,
      friction,
      frictionScore: Math.round(avgFrictionScore * 2.5), // Scale to 1-10
      hasMultiStep,
      requiresPhone,
      requiresCompanyInfo
    };
  }

  /**
   * Extract trust signals
   */
  private async extractTrustSignals(page: Page): Promise<Omit<LandingPageAnalysis['trustSignals'], 'trustScore'>> {
    return await page.evaluate(() => {
      const pageText = document.body.innerText.toLowerCase();
      const pageHtml = document.body.innerHTML.toLowerCase();

      const types: TrustSignalType[] = [];
      const details: TrustSignalDetail[] = [];
      const guarantees: string[] = [];
      const certifications: string[] = [];
      const securityBadges: string[] = [];

      // Review platforms
      const reviewPlatforms: string[] = [];
      if (pageText.includes('google review') || pageHtml.includes('google')) reviewPlatforms.push('Google');
      if (pageText.includes('yelp')) reviewPlatforms.push('Yelp');
      if (pageText.includes('trustpilot')) reviewPlatforms.push('Trustpilot');
      if (pageText.includes('bbb') || pageText.includes('better business')) reviewPlatforms.push('BBB');
      if (pageText.includes('g2') || pageText.includes('g2.com')) reviewPlatforms.push('G2');
      if (pageText.includes('capterra')) reviewPlatforms.push('Capterra');

      // Star ratings
      if (pageText.match(/★{3,}|⭐{3,}|\d+(\.\d+)?\s*(stars?|rating)/i)) {
        types.push('star_ratings');
        details.push({
          type: 'star_ratings',
          description: 'Star rating display',
          examples: [],
          location: 'above_fold'
        });
      }

      // Review count
      const reviewMatch = pageText.match(/(\d+[,\d]*)\+?\s*(reviews?|testimonials?|ratings?)/i);
      if (reviewMatch) {
        types.push('review_count');
        details.push({
          type: 'review_count',
          description: `${reviewMatch[1]} reviews mentioned`,
          examples: [reviewMatch[0]],
          location: 'above_fold'
        });
      }

      // Third party reviews
      if (reviewPlatforms.length > 0) {
        types.push('third_party_reviews');
      }

      // Customer logos
      const hasLogos = !!document.querySelector('[class*="logo"], [class*="client"], [class*="partner"], [class*="trusted"]');
      if (hasLogos && (pageText.includes('trusted by') || pageText.includes('used by') || pageText.includes('our clients'))) {
        types.push('customer_logos');
      }

      // Customer count
      const customerMatch = pageText.match(/(\d{1,3}(,\d{3})+|\d+[kmb])\+?\s*(happy\s*)?(customers?|clients?|users?|businesses?|companies)/i);
      let customerCount: string | undefined;
      if (customerMatch) {
        types.push('customer_count');
        customerCount = customerMatch[0];
      }

      // Years experience
      if (pageText.match(/since\s*(19|20)\d{2}|\d+\+?\s*years?\s*(of\s*)?(experience|in\s+business|serving)/i)) {
        types.push('years_experience');
      }

      // Guarantees
      const guaranteePatterns = [
        /money[\s-]?back\s*guarante/i,
        /satisfaction\s*guarante/i,
        /100%\s*(satisfaction|money[\s-]?back)/i,
        /\d+[\s-]?day\s*(money[\s-]?back|return|refund)/i,
        /no[\s-]?risk/i,
        /risk[\s-]?free/i,
        /full\s*refund/i
      ];

      for (const pattern of guaranteePatterns) {
        const match = pageText.match(pattern);
        if (match) {
          if (!types.includes('guarantee')) types.push('guarantee');
          guarantees.push(match[0]);
        }
      }

      // Security badges
      if (pageText.match(/ssl|secure\s*checkout|encrypted|256[\s-]?bit/i)) {
        types.push('security_badge');
        securityBadges.push('SSL/Encryption');
      }
      if (pageText.match(/pci[\s-]?(dss|compliant)/i)) {
        securityBadges.push('PCI Compliant');
      }
      if (pageText.match(/hipaa/i)) {
        types.push('certification');
        certifications.push('HIPAA');
      }
      if (pageText.match(/soc[\s-]?2/i)) {
        certifications.push('SOC 2');
      }
      if (pageText.match(/gdpr/i)) {
        certifications.push('GDPR');
      }

      // Awards
      if (pageText.match(/award[\s-]?winning|winner|awarded|best\s+of/i)) {
        types.push('award');
      }

      // Case studies
      if (pageText.match(/case\s*stud(y|ies)|success\s*stor(y|ies)/i)) {
        types.push('case_study');
      }

      // Testimonial quotes
      const hasQuotes = pageText.match(/"[^"]{30,200}"/g) || pageText.match(/[""][^""]{30,200}[""]/g);
      if (hasQuotes && hasQuotes.length > 0) {
        types.push('testimonial_quote');
      }

      // Before/After
      if (pageText.match(/before\s*(and|&)\s*after|transformation/i)) {
        types.push('before_after');
      }

      // Results/Stats
      if (pageText.match(/\d+%\s*(increase|decrease|improvement|growth|faster|better)|results|outcomes/i)) {
        types.push('results_stats');
      }

      // Social proof detection
      const hasReviews = types.includes('star_ratings') || types.includes('review_count') || types.includes('third_party_reviews');
      const hasTestimonials = types.includes('testimonial_quote') || !!document.querySelector('[class*="testimonial"]');
      const hasStats = types.includes('results_stats') || types.includes('customer_count');

      return {
        types: [...new Set(types)] as TrustSignalType[],
        details,
        socialProof: {
          hasReviews,
          hasTestimonials,
          hasLogos: types.includes('customer_logos'),
          hasStats,
          reviewPlatforms: reviewPlatforms.length > 0 ? reviewPlatforms : undefined,
          customerCount
        },
        guarantees: [...new Set(guarantees)],
        certifications: [...new Set(certifications)],
        securityBadges: [...new Set(securityBadges)]
      };
    });
  }

  /**
   * Calculate trust score (1-10)
   */
  private calculateTrustScore(trustSignals: Omit<LandingPageAnalysis['trustSignals'], 'trustScore'>): number {
    let score = 0;

    // Weight different signal types
    const weights: Record<TrustSignalType, number> = {
      star_ratings: 1,
      review_count: 1,
      third_party_reviews: 1.5,
      customer_logos: 1,
      customer_count: 1,
      years_experience: 0.5,
      guarantee: 1.5,
      security_badge: 1,
      certification: 1,
      award: 0.5,
      media_mention: 0.5,
      case_study: 1,
      testimonial_quote: 1,
      before_after: 0.5,
      results_stats: 1
    };

    for (const type of trustSignals.types) {
      score += weights[type] || 0.5;
    }

    // Bonus for guarantees
    score += Math.min(trustSignals.guarantees.length * 0.5, 1.5);

    // Bonus for certifications
    score += Math.min(trustSignals.certifications.length * 0.5, 1);

    // Cap at 10
    return Math.min(Math.round(score * 10) / 10, 10);
  }

  /**
   * Extract offers and pricing
   */
  private async extractOffers(page: Page): Promise<LandingPageAnalysis['offers']> {
    return await page.evaluate(() => {
      const pageText = document.body.innerText.toLowerCase();

      const types: OfferType[] = [];
      const details: OfferDetail[] = [];
      const pricePoints: string[] = [];
      const urgencyElements: string[] = [];
      const riskReversals: string[] = [];

      // Price extraction
      const priceMatches = pageText.match(/\$\d+[\d,]*(\.\d{2})?(?:\s*\/\s*\w+)?/g);
      if (priceMatches) {
        pricePoints.push(...[...new Set(priceMatches)].slice(0, 10));
      }

      // Free trial
      if (pageText.match(/free\s*(trial|\d+[\s-]?day)/i)) {
        types.push('free_trial');
        details.push({ type: 'free_trial', text: 'Free trial available', urgency: false, prominence: 'high' });
      }

      // Free consultation
      if (pageText.match(/free\s*(consultation|consult|assessment|evaluation|quote|estimate|audit)/i)) {
        types.push('free_consultation');
        details.push({ type: 'free_consultation', text: 'Free consultation offered', urgency: false, prominence: 'high' });
      }

      // Percent discount
      const percentMatch = pageText.match(/(\d+)%\s*(off|discount|savings?)/i);
      if (percentMatch) {
        types.push('discount_percent');
        details.push({ type: 'discount_percent', text: percentMatch[0], value: `${percentMatch[1]}%`, urgency: false, prominence: 'high' });
      }

      // Dollar discount
      const dollarMatch = pageText.match(/save\s*\$(\d+[\d,]*)|(\$\d+[\d,]*)\s*off/i);
      if (dollarMatch) {
        types.push('discount_dollar');
        details.push({ type: 'discount_dollar', text: dollarMatch[0], urgency: false, prominence: 'high' });
      }

      // Free shipping
      if (pageText.match(/free\s*shipping|shipping\s*(is\s*)?free/i)) {
        types.push('free_shipping');
      }

      // Money back guarantee
      if (pageText.match(/money[\s-]?back|full\s*refund|\d+[\s-]?day\s*(guarantee|refund)/i)) {
        types.push('money_back');
        const match = pageText.match(/(\d+)[\s-]?day\s*(money[\s-]?back|guarantee|refund)/i);
        riskReversals.push(match ? `${match[1]}-day money back guarantee` : 'Money back guarantee');
      }

      // Financing
      if (pageText.match(/financing|payment\s*plan|monthly\s*payment|pay\s*over\s*time|affirm|klarna|afterpay/i)) {
        types.push('financing');
      }

      // Limited time
      if (pageText.match(/limited\s*time|ends?\s*(soon|today|tonight)|expires?|deadline|last\s*chance/i)) {
        types.push('limited_time');
        const match = pageText.match(/(?:ends?|expires?)\s*(today|tonight|soon|in\s*\d+\s*\w+)|limited\s*time/i);
        if (match) urgencyElements.push(match[0]);
      }

      // Bundle deals
      if (pageText.match(/bundle|package|combo|buy\s*\d+\s*get/i)) {
        types.push('bundle_deal');
      }

      // First purchase discount
      if (pageText.match(/first\s*(order|purchase)|new\s*customer|welcome\s*(offer|discount)/i)) {
        types.push('first_purchase');
      }

      // More urgency elements
      const urgencyPatterns = [
        /only\s*\d+\s*(left|remaining|available)/i,
        /\d+\s*(people|others?)\s*(are\s*)?(viewing|looking)/i,
        /selling\s*fast/i,
        /while\s*supplies\s*last/i,
        /don['']?t\s*miss/i
      ];

      for (const pattern of urgencyPatterns) {
        const match = pageText.match(pattern);
        if (match) urgencyElements.push(match[0]);
      }

      // Risk reversals
      if (pageText.match(/no[\s-]?(risk|obligation|commitment|contract)/i)) {
        const match = pageText.match(/no[\s-]?(risk|obligation|commitment|contract)/gi);
        if (match) riskReversals.push(...match);
      }
      if (pageText.match(/cancel\s*(any\s*time|anytime)/i)) {
        riskReversals.push('Cancel anytime');
      }

      return {
        types: [...new Set(types)] as OfferType[],
        details,
        hasFreeTrial: types.includes('free_trial'),
        hasFreeConsultation: types.includes('free_consultation'),
        hasDiscount: types.includes('discount_percent') || types.includes('discount_dollar'),
        pricePoints: [...new Set(pricePoints)],
        urgencyElements: [...new Set(urgencyElements)],
        riskReversals: [...new Set(riskReversals)]
      };
    });
  }

  /**
   * Extract page structure
   */
  private async extractPageStructure(page: Page): Promise<LandingPageAnalysis['pageStructure']> {
    return await page.evaluate(() => {
      const pageHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const pageText = document.body.innerText.toLowerCase();
      const pageHtml = document.body.innerHTML.toLowerCase();

      // Determine layout
      const hasMultiColumn = !!document.querySelector('[class*="grid"], [class*="col-"], [class*="column"]');
      const hasSidebar = !!document.querySelector('[class*="sidebar"], aside');

      let layout: 'single_column' | 'two_column' | 'landing_page' | 'long_form' | 'squeeze_page' = 'single_column';
      const formCount = document.querySelectorAll('form').length;
      const sectionCount = document.querySelectorAll('section, [class*="section"]').length;

      if (sectionCount <= 3 && formCount === 1 && pageHeight < viewportHeight * 2) {
        layout = 'squeeze_page';
      } else if (pageHeight > viewportHeight * 5) {
        layout = 'long_form';
      } else if (hasSidebar) {
        layout = 'two_column';
      } else if (sectionCount >= 4) {
        layout = 'landing_page';
      }

      // Estimate length
      let estimatedLength: 'short' | 'medium' | 'long' | 'very_long' = 'medium';
      const heightRatio = pageHeight / viewportHeight;
      if (heightRatio <= 1.5) estimatedLength = 'short';
      else if (heightRatio <= 3) estimatedLength = 'medium';
      else if (heightRatio <= 6) estimatedLength = 'long';
      else estimatedLength = 'very_long';

      // Detect sections
      const sections: PageSection[] = [];
      const sectionElements = document.querySelectorAll('section, [class*="section"], [id*="section"]');

      let position = 0;
      sectionElements.forEach(section => {
        const text = section.textContent?.toLowerCase() || '';
        const classes = section.className.toLowerCase();
        const id = section.id?.toLowerCase() || '';

        let type: PageSection['type'] = 'other';

        if (classes.includes('hero') || id.includes('hero') || position === 0 && section.querySelector('h1')) {
          type = 'hero';
        } else if (classes.includes('benefit') || text.includes('why choose') || text.includes('benefits')) {
          type = 'benefits';
        } else if (classes.includes('feature') || text.includes('features')) {
          type = 'features';
        } else if (classes.includes('testimonial') || classes.includes('review') || text.includes('what our')) {
          type = 'testimonials';
        } else if (classes.includes('pricing') || id.includes('pricing') || text.includes('pricing')) {
          type = 'pricing';
        } else if (classes.includes('faq') || text.includes('frequently asked')) {
          type = 'faq';
        } else if (text.includes('vs') || text.includes('compare') || classes.includes('comparison')) {
          type = 'comparison';
        } else if (section.querySelector('form')) {
          type = 'form';
        } else if (section.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]')) {
          type = 'video';
        } else if (classes.includes('about') || text.includes('about us') || text.includes('our story')) {
          type = 'about';
        } else if (classes.includes('process') || classes.includes('how-it-works') || text.includes('how it works')) {
          type = 'process';
        } else if (classes.includes('cta') || section.querySelectorAll('button, a.btn').length > 2) {
          type = 'cta';
        }

        sections.push({
          type,
          position: position++,
          hasHeadline: !!section.querySelector('h1, h2, h3'),
          hasCTA: !!section.querySelector('button, a.btn, a[class*="cta"]')
        });
      });

      // Feature detection
      const hasHero = !!document.querySelector('[class*="hero"], header section, section:first-of-type h1');
      const hasBenefits = pageText.includes('benefit') || !!document.querySelector('[class*="benefit"]');
      const hasFeatures = pageText.includes('feature') || !!document.querySelector('[class*="feature"]');
      const hasTestimonials = pageText.includes('testimonial') || pageText.includes('what our') || !!document.querySelector('[class*="testimonial"], [class*="review"]');
      const hasPricing = pageText.includes('pricing') || pageText.includes('price') || !!document.querySelector('[class*="pricing"]');
      const hasFAQ = pageText.includes('faq') || pageText.includes('frequently asked') || !!document.querySelector('[class*="faq"]');
      const hasComparison = pageText.includes(' vs ') || pageText.includes('compare') || !!document.querySelector('[class*="comparison"]');
      const hasVideo = !!document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"], [class*="video-player"]');
      const hasAnimation = !!document.querySelector('[class*="animate"], [data-aos], [class*="motion"]');

      return {
        layout,
        estimatedLength,
        sections: sections.slice(0, 20),
        hasHero,
        hasBenefits,
        hasFeatures,
        hasTestimonials,
        hasPricing,
        hasFAQ,
        hasComparison,
        hasVideo,
        hasAnimation
      };
    });
  }

  /**
   * Extract media elements
   */
  private async extractMedia(page: Page): Promise<LandingPageAnalysis['media']> {
    return await page.evaluate(() => {
      const viewportHeight = window.innerHeight;

      // Check hero area for images/video
      const heroArea = document.querySelector('[class*="hero"], header, section:first-of-type');
      const heroRect = heroArea?.getBoundingClientRect();
      const isInHero = (el: Element) => {
        if (!heroRect) return false;
        const rect = el.getBoundingClientRect();
        return rect.top < heroRect.bottom;
      };

      const allImages = document.querySelectorAll('img');
      const allVideos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');

      let heroImage = false;
      let heroVideo = false;
      let productImages = 0;
      let testimonialPhotos = 0;

      allImages.forEach(img => {
        if (isInHero(img)) heroImage = true;

        const parent = img.closest('[class*="product"], [class*="gallery"]');
        if (parent) productImages++;

        const testimonialParent = img.closest('[class*="testimonial"], [class*="review"], [class*="author"]');
        if (testimonialParent) testimonialPhotos++;
      });

      allVideos.forEach(video => {
        if (isInHero(video)) heroVideo = true;
      });

      const hasAutoplayVideo = !!document.querySelector('video[autoplay]');
      const infographics = document.querySelectorAll('[class*="infographic"], [class*="diagram"], svg[class*="chart"]').length;

      return {
        heroImage,
        heroVideo,
        productImages: Math.min(productImages, 20),
        testimonialPhotos: Math.min(testimonialPhotos, 10),
        infographics,
        videoCount: allVideos.length,
        hasAutoplayVideo
      };
    });
  }

  /**
   * Extract conversion tools
   */
  private async extractConversionTools(page: Page): Promise<LandingPageAnalysis['conversionTools']> {
    return await page.evaluate(() => {
      const pageHtml = document.body.innerHTML.toLowerCase();
      const pageText = document.body.innerText;

      // Chat widget detection
      const chatSelectors = [
        '[class*="chat"]', '[id*="chat"]',
        '[class*="intercom"]', '[class*="drift"]',
        '[class*="hubspot"]', '[class*="zendesk"]',
        '[class*="crisp"]', '[class*="tidio"]',
        '[class*="livechat"]', '[class*="messenger"]'
      ];

      let hasChatWidget = false;
      let chatProvider: string | undefined;

      for (const selector of chatSelectors) {
        if (document.querySelector(selector)) {
          hasChatWidget = true;
          if (selector.includes('intercom')) chatProvider = 'Intercom';
          else if (selector.includes('drift')) chatProvider = 'Drift';
          else if (selector.includes('hubspot')) chatProvider = 'HubSpot';
          else if (selector.includes('zendesk')) chatProvider = 'Zendesk';
          else if (selector.includes('crisp')) chatProvider = 'Crisp';
          else if (selector.includes('tidio')) chatProvider = 'Tidio';
          break;
        }
      }

      // Exit intent detection
      const hasExitIntent = pageHtml.includes('exit-intent') ||
                          pageHtml.includes('exitintent') ||
                          pageHtml.includes('exit_intent') ||
                          !!document.querySelector('[class*="exit"], [id*="exit"]');

      // Popup detection
      const hasPopup = !!document.querySelector('[class*="popup"], [class*="modal"], [class*="overlay"][class*="open"]');

      // Countdown timer
      const hasCountdownTimer = !!document.querySelector('[class*="countdown"], [class*="timer"]') ||
                               pageText.match(/\d+:\d+:\d+/);

      // Sticky elements
      const stickyElements = document.querySelectorAll('[style*="position: fixed"], [style*="position: sticky"], [class*="sticky"], [class*="fixed"]');
      let hasStickyHeader = false;
      let hasStickyFooter = false;
      let hasFloatingCTA = false;

      stickyElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < 100) hasStickyHeader = true;
        if (rect.bottom > window.innerHeight - 100) hasStickyFooter = true;
        if (el.querySelector('button, a.btn, a[class*="cta"]')) hasFloatingCTA = true;
      });

      // Progress bar
      const hasProgressBar = !!document.querySelector('[class*="progress"], [role="progressbar"]');

      // Click to call
      const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
      const hasClickToCall = phoneLinks.length > 0;
      let phoneNumber: string | undefined;
      if (phoneLinks.length > 0) {
        phoneNumber = phoneLinks[0].getAttribute('href')?.replace('tel:', '') || undefined;
      }

      return {
        hasChatWidget,
        chatProvider,
        hasExitIntent,
        hasPopup,
        hasCountdownTimer: !!hasCountdownTimer,
        hasStickyHeader,
        hasStickyFooter,
        hasFloatingCTA,
        hasProgressBar,
        hasClickToCall,
        phoneNumber
      };
    });
  }

  /**
   * Extract navigation info
   */
  private async extractNavigation(page: Page): Promise<LandingPageAnalysis['navigation']> {
    return await page.evaluate(() => {
      const nav = document.querySelector('nav, [role="navigation"], header [class*="nav"]');
      const footer = document.querySelector('footer');
      const currentDomain = window.location.hostname;

      let navItemCount = 0;
      if (nav) {
        navItemCount = nav.querySelectorAll('a, button').length;
      }

      const hasMainNav = !!nav;
      const hasFooterNav = !!footer?.querySelector('a');

      // Count exit links (links to other domains)
      const allLinks = document.querySelectorAll('a[href^="http"]');
      let exitLinks = 0;
      allLinks.forEach(link => {
        try {
          const href = link.getAttribute('href') || '';
          const linkDomain = new URL(href).hostname;
          if (linkDomain !== currentDomain) exitLinks++;
        } catch {
          // Intentionally ignored: Invalid URLs (relative paths, javascript:, mailto:, etc.)
          // are expected and should not count as exit links
        }
      });

      // Check if navigation is minimal (fewer links = more conversion focused)
      const isMinimalNav = navItemCount <= 5;

      return {
        hasMainNav,
        navItemCount,
        hasFooterNav,
        exitLinks,
        isMinimalNav
      };
    });
  }

  /**
   * Extract content analysis
   */
  private async extractContent(page: Page): Promise<LandingPageAnalysis['content']> {
    return await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const words = bodyText.split(/\s+/).filter(w => w.length > 0);

      // Count bullet points
      const bulletPointCount = document.querySelectorAll('li, [class*="bullet"]').length;

      // Check for emojis
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
      const hasEmoji = emojiRegex.test(bodyText);

      // Extract key phrases (simple approach)
      const keyPhrases: string[] = [];
      const commonPatterns = [
        /get\s+\w+\s+\w+/gi,
        /free\s+\w+/gi,
        /no\s+(risk|obligation|commitment)/gi,
        /\d+%\s+\w+/gi,
        /save\s+\$?\d+/gi
      ];

      for (const pattern of commonPatterns) {
        const matches = bodyText.match(pattern);
        if (matches) {
          keyPhrases.push(...matches.slice(0, 3));
        }
      }

      // Simple readability calculation
      const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
      const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);

      // Simplified Flesch-Kincaid
      const readabilityScore = Math.max(0, Math.min(100,
        206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgWordLength / 6)
      ));

      // Determine tone (simplified)
      const textLower = bodyText.toLowerCase();
      let primaryTone: 'professional' | 'casual' | 'urgent' | 'friendly' | 'authoritative' = 'professional';

      if (textLower.match(/hurry|limited|now|fast|quick|don't miss/)) {
        primaryTone = 'urgent';
      } else if (textLower.match(/hey|awesome|amazing|love|wow|!/)) {
        primaryTone = 'casual';
      } else if (textLower.match(/we believe|our mission|committed|dedicated|excellence/)) {
        primaryTone = 'authoritative';
      } else if (textLower.match(/help you|for you|your needs|we care|support/)) {
        primaryTone = 'friendly';
      }

      return {
        wordCount: words.length,
        readabilityScore: Math.round(readabilityScore),
        bulletPointCount,
        hasEmoji,
        primaryTone,
        keyPhrases: [...new Set(keyPhrases)].slice(0, 10)
      };
    });
  }

  /**
   * Extract technical info
   */
  private async extractTechnical(page: Page, startTime: number): Promise<LandingPageAnalysis['technical']> {
    const loadTime = Date.now() - startTime;

    const technicalData = await page.evaluate(() => {
      // Check mobile optimization
      const viewport = document.querySelector('meta[name="viewport"]');
      const mobileOptimized = !!viewport?.getAttribute('content')?.includes('width=device-width');

      // Check for structured data
      const hasStructuredData = !!document.querySelector('script[type="application/ld+json"]');

      // Detect tracking pixels
      const trackingPixels: string[] = [];
      const scripts = document.querySelectorAll('script');

      scripts.forEach(script => {
        const src = script.src || '';
        const content = script.innerHTML || '';

        if (src.includes('gtag') || content.includes('gtag')) trackingPixels.push('Google Analytics');
        if (src.includes('fbq') || content.includes('fbq')) trackingPixels.push('Facebook Pixel');
        if (src.includes('linkedin') || content.includes('_linkedin_')) trackingPixels.push('LinkedIn Insight');
        if (src.includes('clarity') || content.includes('clarity')) trackingPixels.push('Microsoft Clarity');
        if (src.includes('hotjar') || content.includes('hotjar')) trackingPixels.push('Hotjar');
        if (src.includes('segment') || content.includes('analytics.js')) trackingPixels.push('Segment');
        if (content.includes('ttq.load') || src.includes('tiktok')) trackingPixels.push('TikTok Pixel');
      });

      // Detect A/B testing
      const abTestingDetected = !!document.querySelector('[class*="optimizely"], [class*="vwo"], [class*="ab-test"]') ||
                               document.cookie.includes('optimizely') ||
                               document.cookie.includes('_vwo');

      return {
        mobileOptimized,
        hasStructuredData,
        trackingPixels: [...new Set(trackingPixels)],
        abTestingDetected
      };
    });

    return {
      loadTime,
      ...technicalData
    };
  }

  /**
   * Generate strategic insights
   */
  private generateStrategicInsights(data: {
    headlines: LandingPageAnalysis['headlines'];
    ctas: LandingPageAnalysis['ctas'];
    forms: FormAnalysis[];
    formSummary: LandingPageAnalysis['formSummary'];
    trustSignals: Omit<LandingPageAnalysis['trustSignals'], 'trustScore'>;
    trustScore: number;
    offers: LandingPageAnalysis['offers'];
    pageStructure: LandingPageAnalysis['pageStructure'];
    conversionTools: LandingPageAnalysis['conversionTools'];
  }): LandingPageAnalysis['strategicInsights'] {
    const insights: LandingPageAnalysis['strategicInsights'] = {
      conversionFocus: '',
      uniqueSellingPoints: [],
      competitiveAdvantages: [],
      weaknesses: [],
      recommendations: []
    };

    // Determine conversion focus
    if (data.forms.length > 0 && data.formSummary.friction === 'low') {
      insights.conversionFocus = 'Low-friction lead generation';
    } else if (data.conversionTools.hasClickToCall) {
      insights.conversionFocus = 'Phone-first conversion with click-to-call emphasis';
    } else if (data.conversionTools.hasChatWidget) {
      insights.conversionFocus = 'Conversational conversion via chat engagement';
    } else if (data.offers.hasFreeTrial || data.offers.hasFreeConsultation) {
      insights.conversionFocus = 'Free offer-driven lead acquisition';
    } else {
      insights.conversionFocus = 'General information/awareness';
    }

    // Extract USPs from headlines
    if (data.headlines.valueProposition) {
      insights.uniqueSellingPoints.push(data.headlines.valueProposition);
    }

    // Competitive advantages from trust signals
    if (data.trustScore >= 7) {
      insights.competitiveAdvantages.push('Strong social proof and trust signal density');
    }
    if (data.trustSignals.guarantees.length > 0) {
      insights.competitiveAdvantages.push(`Risk reversal through guarantees: ${data.trustSignals.guarantees.join(', ')}`);
    }
    if (data.offers.urgencyElements.length > 0) {
      insights.competitiveAdvantages.push('Active urgency tactics driving immediate action');
    }

    // Identify weaknesses
    if (data.trustScore < 4) {
      insights.weaknesses.push('Low trust signal density - limited social proof');
    }
    if (data.formSummary.friction === 'high' || data.formSummary.friction === 'very_high') {
      insights.weaknesses.push('High form friction may reduce conversion rates');
    }
    if (!data.pageStructure.hasTestimonials) {
      insights.weaknesses.push('Missing testimonial section for social proof');
    }
    if (!data.conversionTools.hasChatWidget && !data.conversionTools.hasClickToCall) {
      insights.weaknesses.push('No immediate contact options (chat/phone)');
    }
    if (data.ctas.primary.length === 0) {
      insights.weaknesses.push('No clear primary CTA identified');
    }

    // Generate recommendations
    if (data.trustScore < 5) {
      insights.recommendations.push('Add more trust signals: reviews, logos, guarantees');
    }
    if (data.formSummary.friction !== 'low' && data.forms.length > 0) {
      insights.recommendations.push('Consider reducing form fields to lower friction');
    }
    if (!data.offers.hasDiscount && !data.offers.hasFreeConsultation && !data.offers.hasFreeTrial) {
      insights.recommendations.push('Test adding a free offer or discount to drive conversions');
    }
    if (data.offers.urgencyElements.length === 0) {
      insights.recommendations.push('Consider adding urgency elements to drive immediate action');
    }
    if (!data.pageStructure.hasVideo) {
      insights.recommendations.push('Add video content for higher engagement');
    }

    return insights;
  }

  /**
   * Generate summary across multiple landing pages
   */
  private generateSummary(analyses: LandingPageAnalysis[], competitor: string): LandingPageSummary {
    if (analyses.length === 0) {
      return this.emptyLandingPageSummary(competitor);
    }

    // Aggregate CTA data
    const ctaCounts: Record<string, number> = {};
    let totalCTAs = 0;

    for (const analysis of analyses) {
      totalCTAs += analysis.ctas.totalCount;
      for (const cta of [...analysis.ctas.primary, ...analysis.ctas.secondary]) {
        const text = cta.text.toLowerCase();
        ctaCounts[text] = (ctaCounts[text] || 0) + 1;
      }
    }

    const sortedCTAs = Object.entries(ctaCounts).sort((a, b) => b[1] - a[1]);

    // Aggregate form data
    const allFields: string[] = [];
    let totalFieldCount = 0;
    const frictionCounts = { low: 0, medium: 0, high: 0, very_high: 0 };

    for (const analysis of analyses) {
      totalFieldCount += analysis.formSummary.avgFieldCount * analysis.formSummary.totalForms;
      frictionCounts[analysis.formSummary.friction]++;

      for (const form of analysis.forms) {
        for (const field of form.fields) {
          allFields.push(field.type);
        }
      }
    }

    const fieldCounts: Record<string, number> = {};
    allFields.forEach(f => { fieldCounts[f] = (fieldCounts[f] || 0) + 1; });
    const mostCommonFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field]) => field);

    // Aggregate trust signals
    const trustSignalCounts: Record<TrustSignalType, number> = {} as Record<TrustSignalType, number>;
    let totalTrustScore = 0;

    for (const analysis of analyses) {
      totalTrustScore += analysis.trustSignals.trustScore;
      for (const type of analysis.trustSignals.types) {
        trustSignalCounts[type] = (trustSignalCounts[type] || 0) + 1;
      }
    }

    // Aggregate offer types
    const offerCounts: Record<OfferType, number> = {} as Record<OfferType, number>;
    const allOffers: string[] = [];

    for (const analysis of analyses) {
      for (const type of analysis.offers.types) {
        offerCounts[type] = (offerCounts[type] || 0) + 1;
      }
      for (const detail of analysis.offers.details) {
        allOffers.push(detail.text);
      }
    }

    // Page features
    const pageFeatures = {
      withVideo: analyses.filter(a => a.pageStructure.hasVideo).length,
      withTestimonials: analyses.filter(a => a.pageStructure.hasTestimonials).length,
      withPricing: analyses.filter(a => a.pageStructure.hasPricing).length,
      withChat: analyses.filter(a => a.conversionTools.hasChatWidget).length,
      withExitIntent: analyses.filter(a => a.conversionTools.hasExitIntent).length,
      withCountdown: analyses.filter(a => a.conversionTools.hasCountdownTimer).length
    };

    // Determine conversion approach
    const formPages = analyses.filter(a => a.formSummary.totalForms > 0).length;
    const phonePages = analyses.filter(a => a.conversionTools.hasClickToCall).length;
    const chatPages = analyses.filter(a => a.conversionTools.hasChatWidget).length;

    let primaryMethod: 'form' | 'phone' | 'chat' | 'click_to_action' = 'form';
    if (phonePages > formPages && phonePages > chatPages) primaryMethod = 'phone';
    else if (chatPages > formPages && chatPages > phonePages) primaryMethod = 'chat';

    const urgencyPages = analyses.filter(a => a.offers.urgencyElements.length > 0).length;
    let urgencyUsage: 'heavy' | 'moderate' | 'light' | 'none' = 'none';
    const urgencyRatio = urgencyPages / analyses.length;
    if (urgencyRatio >= 0.7) urgencyUsage = 'heavy';
    else if (urgencyRatio >= 0.4) urgencyUsage = 'moderate';
    else if (urgencyRatio > 0) urgencyUsage = 'light';

    const avgTrust = totalTrustScore / analyses.length;
    let socialProofDensity: 'high' | 'medium' | 'low' = 'medium';
    if (avgTrust >= 7) socialProofDensity = 'high';
    else if (avgTrust < 4) socialProofDensity = 'low';

    // Strategic insights
    const strategicInsights: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    if (socialProofDensity === 'high') {
      strategicInsights.push('Strong emphasis on social proof across landing pages');
    }
    if (primaryMethod === 'phone') {
      strategicInsights.push('Phone-first conversion strategy - prioritizes calls over forms');
    }
    if (urgencyUsage === 'heavy') {
      strategicInsights.push('Heavy use of urgency tactics across landing pages');
      threats.push('Competitor creating urgency pressure in market');
    }

    // Determine overall friction
    let overallFriction: 'low' | 'medium' | 'high' = 'medium';
    if (frictionCounts.low > frictionCounts.medium + frictionCounts.high + frictionCounts.very_high) {
      overallFriction = 'low';
    } else if (frictionCounts.high + frictionCounts.very_high > frictionCounts.low + frictionCounts.medium) {
      overallFriction = 'high';
      opportunities.push('Competitor has high-friction forms - opportunity to win with simpler forms');
    }

    if (socialProofDensity === 'low') {
      opportunities.push('Competitor lacks strong social proof - opportunity to differentiate');
    }
    if (pageFeatures.withVideo < analyses.length * 0.5) {
      opportunities.push('Limited video content - opportunity to engage with video');
    }

    return {
      competitor,
      pagesAnalyzed: analyses.length,
      analysisDate: new Date().toISOString(),
      ctaPatterns: {
        mostCommon: sortedCTAs.slice(0, 5).map(([text]) => text),
        averageCount: Math.round(totalCTAs / analyses.length),
        primaryActions: sortedCTAs.slice(0, 10).map(([text, frequency]) => ({ text, frequency }))
      },
      formComplexity: {
        averageFields: Math.round((totalFieldCount / Math.max(analyses.length, 1)) * 10) / 10,
        mostCommonFields,
        frictionDistribution: frictionCounts,
        overallFriction
      },
      trustSignalUsage: trustSignalCounts,
      avgTrustScore: Math.round(avgTrust * 10) / 10,
      offerTypes: offerCounts,
      commonOffers: [...new Set(allOffers)].slice(0, 10),
      pageFeatures,
      conversionApproach: {
        primaryMethod,
        urgencyUsage,
        socialProofDensity
      },
      strategicInsights,
      opportunities,
      threatsToConsider: threats
    };
  }

  /**
   * Generate empty summary
   */
  private emptyLandingPageSummary(competitor: string): LandingPageSummary {
    return {
      competitor,
      pagesAnalyzed: 0,
      analysisDate: new Date().toISOString(),
      ctaPatterns: { mostCommon: [], averageCount: 0, primaryActions: [] },
      formComplexity: {
        averageFields: 0,
        mostCommonFields: [],
        frictionDistribution: { low: 0, medium: 0, high: 0, very_high: 0 },
        overallFriction: 'low'
      },
      trustSignalUsage: {} as Record<TrustSignalType, number>,
      avgTrustScore: 0,
      offerTypes: {} as Record<OfferType, number>,
      commonOffers: [],
      pageFeatures: {
        withVideo: 0,
        withTestimonials: 0,
        withPricing: 0,
        withChat: 0,
        withExitIntent: 0,
        withCountdown: 0
      },
      conversionApproach: {
        primaryMethod: 'form',
        urgencyUsage: 'none',
        socialProofDensity: 'low'
      },
      strategicInsights: [],
      opportunities: [],
      threatsToConsider: []
    };
  }
}

/**
 * Quick analysis function
 */
export async function analyzeLandingPage(
  url: string,
  config?: Partial<AppConfig>
): Promise<LandingPageAnalysis> {
  const analyzer = new LandingPageAnalyzer(config);
  return analyzer.analyze(url);
}

/**
 * Analyze multiple landing pages
 */
export async function analyzeLandingPages(
  urls: string[],
  competitor: string,
  config?: Partial<AppConfig>
): Promise<{ analyses: LandingPageAnalysis[]; summary: LandingPageSummary }> {
  const analyzer = new LandingPageAnalyzer(config);
  return analyzer.analyzeMultiple(urls, competitor);
}
