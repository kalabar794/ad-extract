---
name: competitive-ads-extractor
description: Extract and analyze competitor ads from Meta Ad Library, TikTok Ad Library, Google Ads Transparency Center, and LinkedIn Ad Library. Full support for ad copy extraction, creative categorization, targeting data, reach metrics, visual screenshots, landing page analysis, and executive summary generation. Generates comprehensive competitive intelligence reports with messaging analysis.
metadata:
  version: 3.3.0
  updated: 2025-12-14
---

# Competitive Ads Extractor v3.3

**Enterprise-grade multi-platform competitive ad intelligence.** Extract ads from Meta, TikTok, Google, and LinkedIn with **ad copy extraction**, **creative categorization**, **landing page analysis**, **executive summaries**, targeting analysis, visual screenshots, and comprehensive reporting.

## What's New in v3.3
- **Executive Summary 1-Pager** - Auto-generate executive-ready PDF/DOCX summaries with key findings, strategic recommendations, and visual charts
- **Landing Page Analysis** - Extract and analyze competitor landing pages linked from ads (headlines, CTAs, offers, page structure, conversion elements)
- **Cross-Platform Landing Page Patterns** - Identify where competitors send traffic and what conversion strategies they use
- **Executive-Ready Outputs** - Professional 1-page summaries suitable for stakeholder presentations

## What's in v3.2
- **Ad Copy Extraction** - Pull actual text/copy from ads for messaging analysis
- **Creative Categorization** - Auto-tag ads by type (testimonial, offer, educational, brand)
- **Messaging Theme Detection** - Identify common angles and hooks across competitor ads
- **Copy Analysis Reports** - Word frequency, CTA patterns, emotional triggers

## What's in v3.1
- Screenshot Capture - Capture visual samples of competitor ads for reports
- AppleScript Screenshot Integration - Native macOS screenshot via Chrome automation
- Automatic Screenshot Organization - Screenshots saved per platform with timestamps
- Report Visual Integration - Include ad screenshots in final DOCX/PPTX reports

## What's in v3.0
- Full TikTok Ad Library Support - Search by advertiser name/keyword, extract ad details, video URLs, targeting data, reach metrics
- TikTok Ad Detail Pages - Deep extraction of targeting (age, gender, country), audience size, advertiser info
- Video Asset URLs - Direct links to TikTok ad videos and cover images
- Quick Mode vs Deep Dive Mode - Choose analysis depth based on needs
- Enhanced Destination URL Extraction - Systematically capture all ad landing pages

---

## Prerequisites

**CRITICAL**: Enable JavaScript access in Chrome before using:
1. Open Chrome
2. Go to **View → Developer → Allow JavaScript from Apple Events**

Without this, you'll get "Google Chrome is not running" errors.

**For LinkedIn**: Log into LinkedIn in Chrome first. The Ad Library often fails to load.

---

## Platform Support Matrix

| Platform | Ad Copy | Categorization | Screenshots | Targeting | Video URLs | Landing Pages |
|----------|---------|----------------|-------------|-----------|------------|---------------|
| **Meta Ad Library** | ✅ Full text | ✅ Auto-tagged | ✅ Full page | ✅ Limited | ❌ Embedded | ✅ Extract |
| **TikTok Ad Library** | ✅ Captions | ✅ Auto-tagged | ✅ Full page | ✅ Full | ✅ Direct | ✅ Extract |
| **Google Ads** | ✅ Headlines/Desc | ✅ Auto-tagged | ✅ Full page | ✅ Region | ❌ Preview | ✅ Extract |
| **LinkedIn** | ⚠️ When available | ⚠️ When available | ✅ Full page | ✅ When available | ❌ No | ⚠️ Limited |

---

## Ad Copy Extraction

### Overview

Extract the actual text content from competitor ads to analyze messaging, hooks, CTAs, and value propositions. This goes beyond metadata to capture what competitors are actually saying to their audience.

### What Gets Extracted

| Element | Meta | TikTok | Google | LinkedIn |
|---------|------|--------|--------|----------|
| Primary text/body | ✅ | ✅ | ✅ | ✅ |
| Headlines | ✅ | N/A | ✅ | ✅ |
| Descriptions | ✅ | ✅ | ✅ | ✅ |
| CTAs | ✅ | ✅ | ✅ | ✅ |
| Hashtags | ✅ | ✅ | N/A | ✅ |
| Captions/overlays | ❌ | ✅ | N/A | N/A |

### Meta Ad Copy Extraction Script

```javascript
// Meta Ad Library - Full Ad Copy Extraction
(function() {
  const ads = [];

  // Find all ad containers
  const adContainers = document.querySelectorAll('[class*="x1lliihq"]');

  // Alternative: Find by structure
  const adCards = document.querySelectorAll('div[role="article"], div[class*="ad"]');

  // Extract from each visible ad
  document.querySelectorAll('div').forEach(el => {
    const text = el.innerText;

    // Look for ad-like content patterns
    if (text.includes('Active') || text.includes('Started running')) {
      const adData = {
        // Primary ad text (usually the longest text block)
        primaryText: '',
        headline: '',
        description: '',
        cta: '',
        hashtags: [],
        rawText: text.substring(0, 2000)
      };

      // Extract CTA buttons
      const ctaMatch = text.match(/(?:Shop Now|Learn More|Sign Up|Book Now|Get Offer|Contact Us|Download|Apply Now|Get Started|Watch More|See Menu|Order Now|Get Quote|Subscribe|Try Free|Claim Offer)/gi);
      if (ctaMatch) adData.cta = ctaMatch[0];

      // Extract hashtags
      const hashtagMatches = text.match(/#\w+/g);
      if (hashtagMatches) adData.hashtags = [...new Set(hashtagMatches)];

      // Find the main body text (usually after advertiser name, before CTA)
      const lines = text.split('\n').filter(l => l.trim().length > 20);
      if (lines.length > 0) {
        // Longest line is often the primary ad copy
        adData.primaryText = lines.reduce((a, b) => a.length > b.length ? a : b);
      }

      if (adData.primaryText || adData.cta) {
        ads.push(adData);
      }
    }
  });

  // Dedupe by primary text
  const unique = [...new Map(ads.map(a => [a.primaryText, a])).values()];

  return JSON.stringify({
    extractedAt: new Date().toISOString(),
    platform: 'Meta',
    adsFound: unique.length,
    ads: unique.slice(0, 50) // Limit to 50 ads
  }, null, 2);
})();
```

### TikTok Ad Copy Extraction Script

```javascript
// TikTok Ad Library - Ad Copy Extraction
(function() {
  const ads = [];
  const pageText = document.body.innerText;

  // TikTok ad library shows ad text in expandable sections
  document.querySelectorAll('a[href*="/ads/detail/"]').forEach(link => {
    const container = link.closest('div[class]');
    if (!container) return;

    const text = container.innerText;
    const adId = link.href.match(/ad_id=(\d+)/)?.[1];

    const adData = {
      adId: adId,
      detailUrl: link.href,
      // TikTok shows caption/description in the card
      caption: '',
      hashtags: [],
      mentions: [],
      cta: '',
      rawText: text.substring(0, 1500)
    };

    // Extract caption (usually the main text block)
    const lines = text.split('\n').filter(l =>
      l.trim().length > 15 &&
      !l.includes('First shown') &&
      !l.includes('Last shown') &&
      !l.includes('Unique users')
    );
    if (lines.length > 0) {
      adData.caption = lines[0].trim();
    }

    // Extract hashtags
    const hashtags = text.match(/#[\w\u4e00-\u9fa5]+/g);
    if (hashtags) adData.hashtags = [...new Set(hashtags)];

    // Extract @mentions
    const mentions = text.match(/@[\w.]+/g);
    if (mentions) adData.mentions = [...new Set(mentions)];

    // Common TikTok CTAs
    const ctaMatch = text.match(/(?:Shop Now|Learn More|Download|Sign Up|Get App|Play Game|Watch Now|Order Now|Book Now)/gi);
    if (ctaMatch) adData.cta = ctaMatch[0];

    if (adId) ads.push(adData);
  });

  // Dedupe by adId
  const unique = [...new Map(ads.map(a => [a.adId, a])).values()];

  return JSON.stringify({
    extractedAt: new Date().toISOString(),
    platform: 'TikTok',
    adsFound: unique.length,
    ads: unique
  }, null, 2);
})();
```

### Google Ads Copy Extraction Script

```javascript
// Google Ads Transparency - Ad Copy Extraction
(function() {
  const ads = [];
  const text = document.body.innerText;

  // Google shows headline + description pairs
  document.querySelectorAll('div').forEach(el => {
    const content = el.innerText;

    // Look for ad-like structures (headline patterns)
    if (content.length > 50 && content.length < 500) {
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

      // Google ads typically have: Headline | Display URL | Description
      if (lines.length >= 2) {
        const adData = {
          headline: '',
          displayUrl: '',
          description: '',
          sitelinks: [],
          rawText: content
        };

        // First line is usually headline
        if (lines[0] && lines[0].length < 100) {
          adData.headline = lines[0];
        }

        // Look for URL pattern
        const urlLine = lines.find(l => l.match(/^[\w-]+\.(com|net|org|io)/i));
        if (urlLine) adData.displayUrl = urlLine;

        // Description is usually the longest line
        const desc = lines.filter(l => l.length > 50 && !l.match(/^[\w-]+\./)).sort((a, b) => b.length - a.length)[0];
        if (desc) adData.description = desc;

        // Sitelinks (short linked phrases)
        const sitelinks = lines.filter(l => l.length > 5 && l.length < 30 && l !== adData.headline);
        adData.sitelinks = sitelinks.slice(0, 6);

        if (adData.headline || adData.description) {
          ads.push(adData);
        }
      }
    }
  });

  // Dedupe by headline
  const unique = [...new Map(ads.map(a => [a.headline, a])).values()];

  return JSON.stringify({
    extractedAt: new Date().toISOString(),
    platform: 'Google',
    adsFound: unique.length,
    ads: unique.slice(0, 30)
  }, null, 2);
})();
```

---

## Ad Creative Categorization

### Overview

Automatically classify competitor ads into strategic categories to understand their messaging mix. This helps identify what angles competitors are pushing and spot gaps in their strategy.

### Category Definitions

| Category | Description | Signal Words/Patterns |
|----------|-------------|----------------------|
| **Testimonial** | Social proof, reviews, customer stories | "I love", "changed my life", "★★★★★", "customers say", "review", "testimonial", names with quotes |
| **Offer/Promo** | Discounts, limited time, special deals | "% off", "save $", "free", "limited time", "special offer", "deal", "discount", "sale", "BOGO" |
| **Educational** | How-to, tips, informational content | "how to", "tips", "guide", "learn", "discover", "did you know", "secret", "mistakes" |
| **Brand Awareness** | Company story, values, mission | Company name prominent, "about us", "our story", "mission", "values", "since [year]" |
| **Product Feature** | Specific product benefits, specs | "features", "benefits", "includes", "powered by", "made with", "technology" |
| **Urgency/Scarcity** | Time pressure, limited availability | "ends soon", "last chance", "only X left", "today only", "don't miss", "hurry", "now" |
| **Problem/Solution** | Pain point + resolution | "tired of", "struggling with", "finally", "say goodbye to", "no more", "solution" |
| **Comparison** | Us vs them, competitor callouts | "vs", "compared to", "unlike", "better than", "switch from", "why choose" |

### Categorization Script

```javascript
// Ad Creative Categorization Engine
(function() {

  // Category detection patterns
  const categories = {
    testimonial: {
      patterns: [
        /\b(testimonial|review|customer|client)\b/i,
        /★{3,}|⭐{3,}/,
        /"[^"]{20,}"/,  // Quoted text (likely testimonial)
        /\b(love|amazing|life.?changing|best|fantastic)\b.*\b(product|service|experience)\b/i,
        /\b(helped me|saved me|changed my)\b/i,
        /\d+\+?\s*(happy|satisfied)?\s*(customers|clients|users)/i
      ],
      weight: 0
    },
    offer_promo: {
      patterns: [
        /\d+%\s*off/i,
        /save\s*\$?\d+/i,
        /\bfree\b(?!\s+trial)/i,
        /\b(limited time|special offer|deal|discount|sale|promo|coupon)\b/i,
        /\bBOGO\b|buy\s*\d+\s*get/i,
        /\$\d+(?:\.\d{2})?\s*(?:off|value)/i
      ],
      weight: 0
    },
    educational: {
      patterns: [
        /\bhow to\b/i,
        /\b\d+\s*(tips|ways|steps|secrets|mistakes|things)\b/i,
        /\b(guide|learn|discover|tutorial|training)\b/i,
        /\bdid you know\b/i,
        /\b(myth|fact|truth about)\b/i,
        /\bwhat you need to know\b/i
      ],
      weight: 0
    },
    brand_awareness: {
      patterns: [
        /\b(our story|about us|who we are|our mission)\b/i,
        /\bsince\s*(19|20)\d{2}\b/i,
        /\b(family.?owned|locally owned|veteran.?owned)\b/i,
        /\b(values|commitment|dedicated to)\b/i,
        /\bmeet the team\b/i
      ],
      weight: 0
    },
    product_feature: {
      patterns: [
        /\b(features?|benefits?|includes?|specs)\b/i,
        /\b(powered by|made with|built with)\b/i,
        /\b(technology|innovation|patented)\b/i,
        /\bnew\s+(product|feature|release)\b/i,
        /\bintroducing\b/i
      ],
      weight: 0
    },
    urgency_scarcity: {
      patterns: [
        /\b(ends?\s*soon|last\s*chance|limited\s*(time|availability|stock))\b/i,
        /\b(today only|this week only|expires?)\b/i,
        /\b(hurry|don'?t miss|act now|while supplies last)\b/i,
        /\bonly\s*\d+\s*left\b/i,
        /\b(final|closing|ending)\b/i
      ],
      weight: 0
    },
    problem_solution: {
      patterns: [
        /\b(tired of|struggling with|frustrated by)\b/i,
        /\b(finally|say goodbye to|no more|stop)\b/i,
        /\b(solution|solve|fix|eliminate)\b/i,
        /\bproblem\b.*\bsolv/i,
        /\bwithout\s+(the\s+)?(hassle|worry|stress)\b/i
      ],
      weight: 0
    },
    comparison: {
      patterns: [
        /\bvs\.?\b/i,
        /\b(compared to|unlike|better than)\b/i,
        /\b(switch from|alternative to)\b/i,
        /\bwhy choose\b/i,
        /\b(competitors?|other brands?)\b/i
      ],
      weight: 0
    }
  };

  // Function to categorize a single ad
  function categorizeAd(adText) {
    const results = {};
    let maxWeight = 0;
    let primaryCategory = 'uncategorized';

    // Reset weights
    Object.keys(categories).forEach(cat => categories[cat].weight = 0);

    // Score each category
    Object.entries(categories).forEach(([category, config]) => {
      config.patterns.forEach(pattern => {
        if (pattern.test(adText)) {
          config.weight += 1;
        }
      });

      results[category] = config.weight;

      if (config.weight > maxWeight) {
        maxWeight = config.weight;
        primaryCategory = category;
      }
    });

    // Get secondary categories (any with weight > 0 and not primary)
    const secondaryCategories = Object.entries(results)
      .filter(([cat, weight]) => weight > 0 && cat !== primaryCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    return {
      primary: primaryCategory,
      secondary: secondaryCategories,
      scores: results,
      confidence: maxWeight > 2 ? 'high' : maxWeight > 0 ? 'medium' : 'low'
    };
  }

  // Export for use
  window.categorizeAd = categorizeAd;

  return 'Categorization engine loaded. Use categorizeAd(text) to classify ads.';
})();
```

### Full Extraction + Categorization Script (Meta)

```javascript
// Meta Ad Library - Extract Copy + Categorize
(function() {
  // Include categorization patterns inline
  const categoryPatterns = {
    testimonial: [/testimonial|review|customer says/i, /★{3,}/, /"[^"]{20,}"/, /\blove\b.*\bproduct\b/i],
    offer_promo: [/\d+%\s*off/i, /save\s*\$?\d+/i, /\bfree\b/i, /limited time|special offer|deal|discount/i],
    educational: [/\bhow to\b/i, /\d+\s*(tips|ways|steps|secrets)/i, /guide|learn|discover/i],
    brand_awareness: [/our story|about us|since\s*(19|20)\d{2}/i, /family.?owned|our mission/i],
    product_feature: [/features?|benefits?|includes/i, /powered by|made with|technology/i],
    urgency_scarcity: [/ends?\s*soon|last\s*chance|limited/i, /today only|hurry|don't miss/i],
    problem_solution: [/tired of|struggling with|finally|say goodbye/i, /solution|solve|no more/i],
    comparison: [/\bvs\.?\b/i, /compared to|unlike|better than|switch from/i]
  };

  function categorize(text) {
    let maxScore = 0;
    let primary = 'uncategorized';
    const scores = {};

    Object.entries(categoryPatterns).forEach(([cat, patterns]) => {
      let score = 0;
      patterns.forEach(p => { if (p.test(text)) score++; });
      scores[cat] = score;
      if (score > maxScore) { maxScore = score; primary = cat; }
    });

    return { primary, scores, confidence: maxScore > 1 ? 'high' : maxScore > 0 ? 'medium' : 'low' };
  }

  const ads = [];
  const seen = new Set();

  // Extract from page
  document.querySelectorAll('div').forEach(el => {
    const text = el.innerText;
    if (text.length < 50 || text.length > 3000) return;
    if (!text.includes('Active') && !text.includes('Started running')) return;

    // Get unique identifier
    const sig = text.substring(0, 200);
    if (seen.has(sig)) return;
    seen.add(sig);

    // Extract components
    const lines = text.split('\n').filter(l => l.trim().length > 10);
    const primaryText = lines.filter(l => l.length > 30).sort((a,b) => b.length - a.length)[0] || '';

    const ctaMatch = text.match(/(?:Shop Now|Learn More|Sign Up|Book Now|Get Offer|Contact Us|Download|Apply Now|Get Started)/gi);
    const hashtags = text.match(/#\w+/g) || [];

    const category = categorize(text);

    ads.push({
      primaryText: primaryText.substring(0, 500),
      cta: ctaMatch ? ctaMatch[0] : '',
      hashtags: [...new Set(hashtags)],
      category: category.primary,
      categoryConfidence: category.confidence,
      allCategoryScores: category.scores
    });
  });

  // Summary stats
  const categoryCounts = {};
  ads.forEach(a => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });

  return JSON.stringify({
    extractedAt: new Date().toISOString(),
    platform: 'Meta',
    totalAds: ads.length,
    categorySummary: categoryCounts,
    ads: ads
  }, null, 2);
})();
```

---

## Copy Analysis Features

### Word Frequency Analysis

After extracting ad copy, analyze common words and phrases:

```javascript
// Word Frequency Analysis for Ad Copy
(function(adsJson) {
  const ads = JSON.parse(adsJson);
  const allText = ads.ads.map(a => a.primaryText || a.caption || '').join(' ').toLowerCase();

  // Remove common stop words
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those','it','its','i','you','your','we','our','they','their','he','she','him','her']);

  // Tokenize and count
  const words = allText.match(/\b[a-z]{3,}\b/g) || [];
  const freq = {};

  words.forEach(word => {
    if (!stopWords.has(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });

  // Sort by frequency
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  // Find 2-word phrases
  const bigrams = {};
  for (let i = 0; i < words.length - 1; i++) {
    if (!stopWords.has(words[i]) && !stopWords.has(words[i+1])) {
      const phrase = `${words[i]} ${words[i+1]}`;
      bigrams[phrase] = (bigrams[phrase] || 0) + 1;
    }
  }

  const topPhrases = Object.entries(bigrams)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  return JSON.stringify({
    topWords: sorted,
    topPhrases: topPhrases,
    totalWordsAnalyzed: words.length,
    uniqueWords: Object.keys(freq).length
  }, null, 2);
})( /* paste ads JSON here */ );
```

### CTA Pattern Analysis

```javascript
// CTA Analysis from extracted ads
(function(adsJson) {
  const ads = JSON.parse(adsJson);

  const ctaCounts = {};
  ads.ads.forEach(ad => {
    const cta = (ad.cta || '').toLowerCase().trim();
    if (cta) {
      ctaCounts[cta] = (ctaCounts[cta] || 0) + 1;
    }
  });

  const sorted = Object.entries(ctaCounts)
    .sort((a, b) => b[1] - a[1]);

  return JSON.stringify({
    totalAdsWithCTA: ads.ads.filter(a => a.cta).length,
    totalAds: ads.ads.length,
    ctaDistribution: sorted,
    topCTA: sorted[0] ? sorted[0][0] : 'none'
  }, null, 2);
})( /* paste ads JSON here */ );
```

---

## Complete Deep Dive Workflow (Updated for v3.3)

```
1. CREATE OUTPUT STRUCTURE
   mkdir -p /home/claude/competitive-intel/[COMPETITOR]/{tiktok,meta,google,linkedin,landing-pages,screenshots,analysis}

2. META AD LIBRARY (Full Extraction + Copy + Categorization)
   a. Open: facebook.com/ads/library/?q=[COMPETITOR]
   b. Wait 5 seconds
   c. Execute auto-scroll script (load ALL ads)
   d. Scroll to top, CAPTURE SCREENSHOT
   e. Run FULL EXTRACTION + CATEGORIZATION SCRIPT
   f. Save JSON to meta/ads-with-copy.json
   g. Run destination URL extraction
   h. Save category summary to analysis/meta-categories.json

3. TIKTOK AD LIBRARY (Full Extraction + Copy)
   a. Calculate date range, open search URL
   b. Wait, load more results
   c. CAPTURE SCREENSHOT
   d. Run TIKTOK COPY EXTRACTION SCRIPT
   e. Run categorization on extracted copy
   f. Save to tiktok/ads-with-copy.json

4. GOOGLE ADS TRANSPARENCY
   a. Open: adstransparency.google.com/?domain=[DOMAIN]
   b. Wait, CAPTURE SCREENSHOT
   c. Run GOOGLE COPY EXTRACTION SCRIPT
   d. Categorize extracted ads
   e. Save to google/ads-with-copy.json

5. COPY ANALYSIS
   a. Run WORD FREQUENCY ANALYSIS on all platforms
   b. Run CTA PATTERN ANALYSIS
   c. Save to analysis/copy-analysis.json

6. LANDING PAGE ANALYSIS (NEW in v3.3)
   a. Compile unique destination URLs from all platforms
   b. For each URL (top 3-5 most common):
      - Open in Chrome
      - Wait 3-5 seconds for full load
      - Run LANDING PAGE EXTRACTION SCRIPT
      - Capture screenshot
      - Save to landing-pages/[domain]-[id].json
   c. Aggregate insights to landing-pages/landing-page-summary.json
   d. Cross-reference with ad messaging for consistency analysis

7. GENERATE COMPREHENSIVE REPORT
   Include sections:
   - Executive Summary (key findings)
   - Platform Overview (ad counts, presence)
   - Messaging Analysis: Top words/phrases across competitor ads
   - Creative Mix: Category breakdown (% testimonial, % offer, etc.)
   - CTA Strategy: What actions competitors are driving
   - Landing Page Strategy: Conversion approach, form friction, trust signals
   - Messaging Gaps: Categories NOT being used (opportunities)
   - Sample Ad Copy: Top performing ad text by category

8. GENERATE EXECUTIVE SUMMARY 1-PAGER (NEW in v3.3)
   a. Aggregate all extracted data
   b. Calculate key metrics (total ads, platform distribution, category mix)
   c. Identify top 3 strategic opportunities
   d. Generate executive-summary.docx using template
   e. Keep to ONE PAGE (critical for stakeholder consumption)
   f. Include one visual chart (category mix breakdown)
   g. Copy to /mnt/user-data/outputs/ for download
```

---

## Output Templates

### Categorized Ads JSON Structure
```json
{
  "competitor": "Company Name",
  "platform": "Meta",
  "extractionDate": "2025-12-14",
  "totalAds": 45,
  "categorySummary": {
    "offer_promo": 18,
    "testimonial": 12,
    "product_feature": 8,
    "educational": 4,
    "urgency_scarcity": 2,
    "uncategorized": 1
  },
  "ads": [
    {
      "primaryText": "Transform your smile with our award-winning dental implants. Over 10,000 happy patients trust us for their smile makeover.",
      "cta": "Book Now",
      "hashtags": ["#DentalImplants", "#SmileMakeover"],
      "category": "testimonial",
      "categoryConfidence": "high",
      "allCategoryScores": {
        "testimonial": 3,
        "product_feature": 1,
        "offer_promo": 0,
        "educational": 0,
        "brand_awareness": 0,
        "urgency_scarcity": 0,
        "problem_solution": 0,
        "comparison": 0
      }
    }
  ]
}
```

### Copy Analysis JSON Structure
```json
{
  "competitor": "Company Name",
  "analysisDate": "2025-12-14",
  "platforms": ["Meta", "TikTok", "Google"],
  "wordAnalysis": {
    "topWords": [
      ["smile", 34],
      ["dental", 28],
      ["free", 22],
      ["consultation", 18],
      ["implants", 15]
    ],
    "topPhrases": [
      ["free consultation", 14],
      ["dental implants", 12],
      ["smile makeover", 8]
    ]
  },
  "ctaAnalysis": {
    "topCTA": "book now",
    "distribution": [
      ["book now", 22],
      ["learn more", 15],
      ["get started", 8],
      ["shop now", 5]
    ]
  },
  "categoryMix": {
    "offer_promo": "40%",
    "testimonial": "27%",
    "product_feature": "18%",
    "educational": "9%",
    "other": "6%"
  },
  "messagingInsights": [
    "Heavy emphasis on social proof (27% testimonial ads)",
    "Free consultation is primary offer hook",
    "Limited urgency/scarcity tactics (potential opportunity)",
    "No comparison ads detected (not attacking competitors directly)"
  ]
}
```

---

## JavaScript Extraction Scripts

### scripts/meta-copy-extract.js
```javascript
// Meta Ad Library - Full Copy + Categorization Extraction
(function() {
  const categoryPatterns = {
    testimonial: [/testimonial|review|customer/i, /★{3,}/, /"[^"]{20,}"/, /\blove\b/i, /\d+\+?\s*happy/i],
    offer_promo: [/\d+%\s*off/i, /save\s*\$?\d+/i, /\bfree\b/i, /limited time|special|deal|discount/i],
    educational: [/\bhow to\b/i, /\d+\s*(tips|ways|steps|secrets)/i, /guide|learn|discover/i],
    brand_awareness: [/our story|about us|since\s*(19|20)\d{2}/i, /family.?owned|mission/i],
    product_feature: [/features?|benefits?|includes/i, /powered by|made with|technology/i],
    urgency_scarcity: [/ends?\s*soon|last\s*chance|limited/i, /today only|hurry|don't miss/i],
    problem_solution: [/tired of|struggling|finally|say goodbye/i, /solution|solve|no more/i],
    comparison: [/\bvs\.?\b/i, /compared to|unlike|better than|switch from/i]
  };

  function categorize(text) {
    let maxScore = 0, primary = 'uncategorized';
    const scores = {};
    Object.entries(categoryPatterns).forEach(([cat, patterns]) => {
      let score = 0;
      patterns.forEach(p => { if (p.test(text)) score++; });
      scores[cat] = score;
      if (score > maxScore) { maxScore = score; primary = cat; }
    });
    return { primary, scores, confidence: maxScore > 1 ? 'high' : maxScore > 0 ? 'medium' : 'low' };
  }

  const ads = [];
  const seen = new Set();

  document.querySelectorAll('div').forEach(el => {
    const text = el.innerText;
    if (text.length < 50 || text.length > 3000) return;
    if (!text.includes('Active') && !text.includes('Started running')) return;

    const sig = text.substring(0, 200);
    if (seen.has(sig)) return;
    seen.add(sig);

    const lines = text.split('\n').filter(l => l.trim().length > 10);
    const primaryText = lines.filter(l => l.length > 30).sort((a,b) => b.length - a.length)[0] || '';
    const ctaMatch = text.match(/(?:Shop Now|Learn More|Sign Up|Book Now|Get Offer|Contact Us|Download|Apply Now|Get Started)/gi);
    const hashtags = text.match(/#\w+/g) || [];
    const category = categorize(text);

    ads.push({
      primaryText: primaryText.substring(0, 500),
      cta: ctaMatch ? ctaMatch[0] : '',
      hashtags: [...new Set(hashtags)],
      category: category.primary,
      categoryConfidence: category.confidence,
      allCategoryScores: category.scores
    });
  });

  const categoryCounts = {};
  ads.forEach(a => { categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1; });

  return JSON.stringify({
    extractedAt: new Date().toISOString(),
    platform: 'Meta',
    totalAds: ads.length,
    categorySummary: categoryCounts,
    ads: ads
  }, null, 2);
})();
```

### scripts/tiktok-copy-extract.js
```javascript
// TikTok Ad Library - Copy + Categorization Extraction
(function() {
  const categoryPatterns = {
    testimonial: [/testimonial|review|customer/i, /★{3,}/, /"[^"]{20,}"/, /\blove\b/i],
    offer_promo: [/\d+%\s*off/i, /save\s*\$?\d+/i, /\bfree\b/i, /limited|special|deal|discount/i],
    educational: [/\bhow to\b/i, /\d+\s*(tips|ways|steps|secrets)/i, /guide|learn|discover/i],
    brand_awareness: [/our story|about us|since\s*(19|20)\d{2}/i],
    product_feature: [/features?|benefits?|includes/i, /powered by|made with/i],
    urgency_scarcity: [/ends?\s*soon|last\s*chance|limited/i, /today only|hurry/i],
    problem_solution: [/tired of|struggling|finally|say goodbye/i, /solution|solve/i],
    comparison: [/\bvs\.?\b/i, /compared to|unlike|better than/i]
  };

  function categorize(text) {
    let maxScore = 0, primary = 'uncategorized';
    const scores = {};
    Object.entries(categoryPatterns).forEach(([cat, patterns]) => {
      let score = 0;
      patterns.forEach(p => { if (p.test(text)) score++; });
      scores[cat] = score;
      if (score > maxScore) { maxScore = score; primary = cat; }
    });
    return { primary, scores };
  }

  const ads = [];

  document.querySelectorAll('a[href*="/ads/detail/"]').forEach(link => {
    const container = link.closest('div[class]');
    if (!container) return;

    const text = container.innerText;
    const adId = link.href.match(/ad_id=(\d+)/)?.[1];
    if (!adId) return;

    const lines = text.split('\n').filter(l =>
      l.trim().length > 15 &&
      !l.includes('First shown') &&
      !l.includes('Last shown') &&
      !l.includes('Unique users')
    );

    const caption = lines[0]?.trim() || '';
    const hashtags = text.match(/#[\w\u4e00-\u9fa5]+/g) || [];
    const mentions = text.match(/@[\w.]+/g) || [];
    const ctaMatch = text.match(/(?:Shop Now|Learn More|Download|Sign Up|Get App|Play Game|Watch Now|Order Now|Book Now)/gi);
    const category = categorize(text);

    ads.push({
      adId,
      detailUrl: link.href,
      caption: caption.substring(0, 500),
      hashtags: [...new Set(hashtags)],
      mentions: [...new Set(mentions)],
      cta: ctaMatch ? ctaMatch[0] : '',
      category: category.primary,
      allCategoryScores: category.scores
    });
  });

  const unique = [...new Map(ads.map(a => [a.adId, a])).values()];
  const categoryCounts = {};
  unique.forEach(a => { categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1; });

  return JSON.stringify({
    extractedAt: new Date().toISOString(),
    platform: 'TikTok',
    totalAds: unique.length,
    categorySummary: categoryCounts,
    ads: unique
  }, null, 2);
})();
```

### scripts/copy-analysis.js
```javascript
// Copy Analysis - Word Frequency + CTA Analysis
// Usage: Pass extracted ads JSON as input
(function(adsJson) {
  const data = JSON.parse(adsJson);
  const allText = data.ads.map(a => a.primaryText || a.caption || '').join(' ').toLowerCase();

  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those','it','its','i','you','your','we','our','they','their','he','she','him','her','from','as','all','also','just','get','now','more','out','up','so','what','when','how','been','being','than','into','about','over','such','only','other','some','very','after','most','made','between','back','through','way','even','new','want','because','any','these','give','day','most','us']);

  const words = allText.match(/\b[a-z]{3,}\b/g) || [];
  const freq = {};
  words.forEach(w => { if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1; });

  const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30);

  // Bigrams
  const bigrams = {};
  for (let i = 0; i < words.length - 1; i++) {
    if (!stopWords.has(words[i]) && !stopWords.has(words[i+1])) {
      const phrase = `${words[i]} ${words[i+1]}`;
      bigrams[phrase] = (bigrams[phrase] || 0) + 1;
    }
  }
  const topPhrases = Object.entries(bigrams).filter(([_, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 15);

  // CTA Analysis
  const ctaCounts = {};
  data.ads.forEach(a => {
    const cta = (a.cta || '').toLowerCase().trim();
    if (cta) ctaCounts[cta] = (ctaCounts[cta] || 0) + 1;
  });
  const ctaDistribution = Object.entries(ctaCounts).sort((a, b) => b[1] - a[1]);

  // Category summary
  const categoryCounts = data.categorySummary || {};
  const total = data.totalAds || data.ads.length;
  const categoryMix = {};
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    categoryMix[cat] = `${Math.round(count/total*100)}%`;
  });

  return JSON.stringify({
    platform: data.platform,
    totalAdsAnalyzed: total,
    wordAnalysis: { topWords, topPhrases, uniqueWords: Object.keys(freq).length },
    ctaAnalysis: { topCTA: ctaDistribution[0]?.[0] || 'none', distribution: ctaDistribution },
    categoryMix
  }, null, 2);
})( /* PASTE ADS JSON HERE */ );
```

---

## Landing Page Analysis

### Overview

Extract and analyze the landing pages competitors drive ad traffic to. Understanding landing page strategy reveals conversion tactics, offer structures, and user experience approaches that inform your competitive positioning.

### What Gets Extracted

| Element | Description | Extraction Method |
|---------|-------------|-------------------|
| **Page Title** | HTML title tag content | Direct extraction |
| **Headlines (H1-H3)** | All heading elements | DOM parsing |
| **Meta Description** | SEO description | Meta tag extraction |
| **Primary CTA** | Main conversion action | Button/form detection |
| **Secondary CTAs** | Supporting actions | Link/button scanning |
| **Form Fields** | Lead capture requirements | Form element parsing |
| **Trust Signals** | Reviews, badges, guarantees | Pattern matching |
| **Offer Details** | Pricing, discounts, packages | Text pattern extraction |
| **Page Structure** | Sections, layout type | DOM analysis |

### Landing Page Extraction Script

```javascript
// Landing Page Analysis - Extract Conversion Elements
(function() {
  const data = {
    url: window.location.href,
    extractedAt: new Date().toISOString(),

    // Page Identity
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content || '',
    canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || '',

    // Headlines Hierarchy
    headlines: {
      h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim()).filter(Boolean),
      h2: [...document.querySelectorAll('h2')].map(h => h.innerText.trim()).filter(Boolean).slice(0, 10),
      h3: [...document.querySelectorAll('h3')].map(h => h.innerText.trim()).filter(Boolean).slice(0, 10)
    },

    // CTA Analysis
    ctas: {
      primary: [],
      secondary: []
    },

    // Forms
    forms: [],

    // Trust Signals
    trustSignals: [],

    // Offers
    offers: [],

    // Page Structure
    structure: {
      hasVideo: false,
      hasTestimonials: false,
      hasPricing: false,
      hasForm: false,
      hasChatWidget: false,
      hasExitIntent: false
    }
  };

  // Extract CTAs (buttons and prominent links)
  const buttons = document.querySelectorAll('button, a.btn, a.button, [class*="cta"], [class*="btn-primary"], input[type="submit"]');
  buttons.forEach(btn => {
    const text = (btn.innerText || btn.value || '').trim();
    if (text && text.length > 2 && text.length < 50) {
      const ctaData = {
        text: text,
        type: btn.tagName.toLowerCase(),
        href: btn.href || null,
        classes: btn.className
      };

      // Classify as primary or secondary
      if (btn.matches('[class*="primary"], [class*="cta"], [class*="main"]') ||
          text.match(/get started|book now|schedule|contact|call|free|claim/i)) {
        data.ctas.primary.push(ctaData);
      } else {
        data.ctas.secondary.push(ctaData);
      }
    }
  });

  // Dedupe CTAs
  data.ctas.primary = [...new Map(data.ctas.primary.map(c => [c.text, c])).values()].slice(0, 5);
  data.ctas.secondary = [...new Map(data.ctas.secondary.map(c => [c.text, c])).values()].slice(0, 10);

  // Extract Forms
  document.querySelectorAll('form').forEach(form => {
    const fields = [...form.querySelectorAll('input, select, textarea')].map(f => ({
      type: f.type || f.tagName.toLowerCase(),
      name: f.name || f.placeholder || '',
      required: f.required
    })).filter(f => !['hidden', 'submit', 'button'].includes(f.type));

    if (fields.length > 0) {
      data.forms.push({
        id: form.id || null,
        action: form.action || 'inline',
        method: form.method || 'post',
        fieldCount: fields.length,
        fields: fields.slice(0, 10)
      });
    }
  });

  // Extract Trust Signals
  const pageText = document.body.innerText.toLowerCase();

  // Review/rating patterns
  if (pageText.match(/★{3,}|⭐{3,}|\d+(\.\d+)?\s*(stars?|rating)/i)) {
    data.trustSignals.push('star_ratings');
  }
  if (pageText.match(/\d+\+?\s*(reviews?|testimonials?)/i)) {
    data.trustSignals.push('review_count');
  }
  if (pageText.match(/google\s*reviews?|yelp|trustpilot|bbb/i)) {
    data.trustSignals.push('third_party_reviews');
  }

  // Guarantees and assurances
  if (pageText.match(/money.?back|satisfaction\s*guarante|risk.?free/i)) {
    data.trustSignals.push('guarantee');
  }
  if (pageText.match(/secure|ssl|encrypted|safe/i)) {
    data.trustSignals.push('security');
  }
  if (pageText.match(/hipaa|compliant|certified|accredited/i)) {
    data.trustSignals.push('compliance');
  }

  // Social proof numbers
  if (pageText.match(/\d{1,3}(,\d{3})+\s*(patients?|customers?|clients?|users?)/i)) {
    data.trustSignals.push('customer_count');
  }
  if (pageText.match(/since\s*(19|20)\d{2}|years?\s*(of\s*)?experience/i)) {
    data.trustSignals.push('experience_years');
  }

  // Extract Offers
  const offerPatterns = [
    { pattern: /\$\d+[\d,]*(\.\d{2})?/g, type: 'price' },
    { pattern: /\d+%\s*off/gi, type: 'discount_percent' },
    { pattern: /save\s*\$\d+/gi, type: 'discount_dollar' },
    { pattern: /free\s+(consultation|exam|quote|estimate|trial|shipping)/gi, type: 'free_offer' },
    { pattern: /limited\s*time|expires?|ends?\s*soon/gi, type: 'urgency' },
    { pattern: /no\s*(obligation|commitment|contract)/gi, type: 'low_commitment' }
  ];

  offerPatterns.forEach(({ pattern, type }) => {
    const matches = pageText.match(pattern);
    if (matches) {
      data.offers.push({ type, examples: [...new Set(matches)].slice(0, 3) });
    }
  });

  // Page Structure Detection
  data.structure.hasVideo = !!document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"], [class*="video"]');
  data.structure.hasTestimonials = !!pageText.match(/testimonial|review|what\s*(our\s*)?(patients?|customers?|clients?)\s*say/i);
  data.structure.hasPricing = !!pageText.match(/pricing|price|cost|\$\d+|packages?|plans?/i);
  data.structure.hasForm = data.forms.length > 0;
  data.structure.hasChatWidget = !!document.querySelector('[class*="chat"], [id*="chat"], [class*="intercom"], [class*="drift"], [class*="hubspot"]');

  return JSON.stringify(data, null, 2);
})();
```

### Landing Page Analysis Workflow

```
1. COLLECT DESTINATION URLs FROM ADS
   - Run destination URL extraction on Meta/TikTok/Google
   - Compile unique URLs to analyze

2. FOR EACH LANDING PAGE:
   a. Open URL in Chrome: chrome.open_url(url, new_tab=true)
   b. Wait 3-5 seconds for page load
   c. Execute Landing Page Extraction Script
   d. Capture screenshot (optional)
   e. Save JSON to landing-pages/[domain]-[page-id].json

3. AGGREGATE LANDING PAGE INSIGHTS
   - Common CTA patterns across pages
   - Form field requirements (high friction vs low friction)
   - Trust signal usage
   - Offer positioning
   - Page structure patterns

4. CROSS-REFERENCE WITH AD DATA
   - Which landing pages receive most ad traffic?
   - Does messaging match between ad and landing page?
   - Conversion path analysis
```

### Landing Page Summary Template

```json
{
  "competitor": "Competitor Name",
  "pagesAnalyzed": 5,
  "analysisDate": "2025-12-14",
  "landingPageSummary": {
    "primaryCTAs": [
      { "text": "Schedule Free Consultation", "frequency": 4 },
      { "text": "Call Now", "frequency": 3 },
      { "text": "Book Online", "frequency": 2 }
    ],
    "formComplexity": {
      "averageFields": 4.2,
      "mostCommonFields": ["name", "email", "phone", "message"],
      "lowFriction": 2,
      "highFriction": 3
    },
    "trustSignalsUsed": {
      "star_ratings": 5,
      "review_count": 4,
      "guarantee": 3,
      "third_party_reviews": 2,
      "compliance": 2
    },
    "offerTypes": {
      "free_offer": 4,
      "discount_percent": 2,
      "urgency": 3,
      "low_commitment": 5
    },
    "pageFeatures": {
      "hasVideo": 3,
      "hasTestimonials": 5,
      "hasPricing": 2,
      "hasChatWidget": 4
    }
  },
  "strategicInsights": [
    "All landing pages emphasize 'Free Consultation' offer",
    "High trust signal density - averaging 4+ signals per page",
    "Form friction moderate (4+ fields) - opportunity for simpler forms",
    "Strong testimonial presence but limited video content",
    "Chat widgets on 80% of pages - emphasizes immediate availability"
  ]
}
```

---

## Executive Summary 1-Pager

### Overview

Generate a professional, executive-ready 1-page summary of competitive intelligence findings. Designed for stakeholder presentations, client meetings, and quick strategic briefings.

### Executive Summary Components

| Section | Content | Length Target |
|---------|---------|---------------|
| **Header** | Competitor name, date, analyst | 1 line |
| **Key Finding** | Single most important insight | 2-3 sentences |
| **Ad Volume & Platforms** | Where they advertise, how much | 2-3 bullets |
| **Messaging Strategy** | Primary themes, angles, CTAs | 3-4 bullets |
| **Creative Mix** | Category breakdown (visual chart) | Pie chart + legend |
| **Landing Page Strategy** | Conversion approach summary | 2-3 bullets |
| **Competitive Gaps** | Opportunities for differentiation | 3-4 bullets |
| **Strategic Recommendations** | Actionable next steps | 3-5 bullets |

### Executive Summary Generation Workflow

```
1. AGGREGATE ALL EXTRACTED DATA
   - Load ads-with-copy.json from each platform
   - Load copy-analysis.json
   - Load landing page analysis (if available)
   - Load screenshots

2. CALCULATE KEY METRICS
   - Total ads across platforms
   - Platform distribution %
   - Category mix %
   - Top keywords and CTAs
   - Landing page patterns

3. IDENTIFY KEY INSIGHTS
   - What makes this competitor unique?
   - What's their primary messaging angle?
   - Where are they NOT advertising? (gaps)
   - What conversion tactics do they use?

4. GENERATE 1-PAGER
   - Use DOCX or PDF skill for professional formatting
   - Include one visual chart (category mix pie chart)
   - Keep to ONE PAGE (critical)
   - Use executive-friendly language (no jargon)

5. OUTPUT
   - Save to /home/claude/competitive-intel/[COMPETITOR]/executive-summary.docx
   - Copy to /mnt/user-data/outputs/ for download
```

### Executive Summary Template (Markdown for DOCX conversion)

```markdown
# Competitive Intelligence: [COMPETITOR NAME]
**Analysis Date:** [DATE] | **Prepared by:** WEO Media Competitive Intelligence

---

## Key Finding

[COMPETITOR] focuses heavily on [PRIMARY MESSAGING THEME] messaging, with [X]% of ads promoting [TOP CATEGORY]. Their primary call-to-action is "[TOP CTA]" driving traffic to [LANDING PAGE TYPE]. **Key opportunity:** They have minimal presence on [GAP PLATFORM] and rarely use [GAP TACTIC] in their creative strategy.

---

## Advertising Footprint

| Platform | Active Ads | Primary Focus |
|----------|------------|---------------|
| Meta (Facebook/Instagram) | [X] | [Focus area] |
| Google Ads | [X] | [Focus area] |
| TikTok | [X] | [Focus area] |
| LinkedIn | [X] | [Focus area] |

**Total Active Ads:** [TOTAL]

---

## Messaging Strategy

**Top Keywords:** [word1], [word2], [word3], [word4], [word5]

**Primary Angles:**
- [Angle 1 - e.g., "Heavy emphasis on free consultations"]
- [Angle 2 - e.g., "Social proof through patient testimonials"]
- [Angle 3 - e.g., "Urgency-based offers with expiration dates"]

**Dominant CTA:** "[Top CTA]" ([X]% of ads)

---

## Creative Mix

[PIE CHART OR TABLE]

| Category | % of Ads |
|----------|----------|
| Offer/Promotional | [X]% |
| Testimonial/Social Proof | [X]% |
| Educational | [X]% |
| Brand Awareness | [X]% |
| Other | [X]% |

---

## Landing Page Insights

- **Primary offer:** [e.g., "Free consultation valued at $XXX"]
- **Form friction:** [Low/Medium/High] ([X] fields average)
- **Trust signals:** [e.g., "Google reviews, BBB badge, satisfaction guarantee"]
- **Conversion focus:** [e.g., "Phone calls via click-to-call emphasis"]

---

## Strategic Opportunities

1. **Platform Gap:** [e.g., "No TikTok presence - opportunity for first-mover advantage"]
2. **Messaging Gap:** [e.g., "Limited educational content - opportunity for authority positioning"]
3. **Creative Gap:** [e.g., "No video testimonials - opportunity for authentic patient stories"]
4. **Offer Gap:** [e.g., "No financing messaging - opportunity to address cost objection"]

---

## Recommended Actions

1. [Specific action - e.g., "Launch TikTok ad campaign targeting 25-44 demographic"]
2. [Specific action - e.g., "Develop 3-5 patient video testimonials for social proof"]
3. [Specific action - e.g., "Create educational content series positioning as industry expert"]
4. [Specific action - e.g., "Test urgency-based offers to match competitor intensity"]
5. [Specific action - e.g., "Reduce form friction to 3 fields to improve conversion rate"]

---

*This analysis is based on publicly available advertising data from Meta Ad Library, Google Ads Transparency Center, and TikTok Commercial Content Library.*
```

### Executive Summary JSON Data Structure

```json
{
  "competitor": "Competitor Name",
  "analysisDate": "2025-12-14",
  "analyst": "WEO Media",

  "keyFinding": {
    "summary": "Competitor focuses heavily on promotional messaging with 45% of ads featuring discount offers",
    "primaryTheme": "offer_promo",
    "keyOpportunity": "No TikTok presence represents first-mover opportunity"
  },

  "advertisingFootprint": {
    "totalAds": 87,
    "platforms": {
      "meta": { "count": 45, "focus": "Promotional offers" },
      "google": { "count": 32, "focus": "Service-specific search" },
      "tiktok": { "count": 0, "focus": "Not present" },
      "linkedin": { "count": 10, "focus": "Recruiting" }
    }
  },

  "messagingStrategy": {
    "topKeywords": ["free", "consultation", "smile", "dental", "implants"],
    "primaryAngles": [
      "Free consultation offers",
      "Patient testimonials",
      "Limited time discounts"
    ],
    "dominantCTA": {
      "text": "Book Now",
      "percentage": 42
    }
  },

  "creativeMix": {
    "offer_promo": 45,
    "testimonial": 25,
    "educational": 15,
    "brand_awareness": 10,
    "other": 5
  },

  "landingPageInsights": {
    "primaryOffer": "Free consultation ($250 value)",
    "formFriction": "Medium (4 fields)",
    "trustSignals": ["Google Reviews", "BBB Accredited", "Satisfaction Guarantee"],
    "conversionFocus": "Phone calls"
  },

  "strategicOpportunities": [
    {
      "type": "platform_gap",
      "description": "No TikTok presence",
      "opportunity": "First-mover advantage in video content"
    },
    {
      "type": "messaging_gap",
      "description": "Limited educational content",
      "opportunity": "Authority positioning through how-to content"
    },
    {
      "type": "creative_gap",
      "description": "No video testimonials",
      "opportunity": "Authentic patient story content"
    }
  ],

  "recommendedActions": [
    "Launch TikTok campaign targeting 25-44 demographic",
    "Develop patient video testimonial series",
    "Create educational content for authority positioning",
    "Test urgency-based offers to match competitor intensity",
    "Reduce landing page form to 3 fields"
  ]
}
```

### Example Prompts for Executive Summaries

**Generate Full Executive Summary:**
> "Create an executive summary 1-pager for [COMPETITOR]"
> "Generate stakeholder-ready competitive brief for [COMPETITOR]"
> "Build executive summary from all collected [COMPETITOR] data"

**Quick Key Findings:**
> "What's the #1 insight from [COMPETITOR]'s ad strategy?"
> "Summarize [COMPETITOR] competitive gaps in 3 bullets"

**Specific Focus:**
> "Create executive summary focused on [COMPETITOR]'s messaging strategy"
> "Generate 1-pager highlighting opportunities vs [COMPETITOR]"

---

## Report Integration

When generating the final report, include these new sections:

### Messaging Analysis Section
```markdown
## Messaging Analysis

### Top Keywords
[Table of top 10 words by frequency]

### Common Phrases
[Table of top 5 phrases]

### Key Observations
- Primary messaging focuses on: [top themes]
- Unique terminology: [brand-specific words]
- Emotional triggers used: [fear, joy, urgency, etc.]
```

### Creative Mix Section
```markdown
## Creative Strategy Mix

| Category | Count | Percentage |
|----------|-------|------------|
| Offer/Promo | 18 | 40% |
| Testimonial | 12 | 27% |
| Product Feature | 8 | 18% |
| Educational | 4 | 9% |
| Other | 3 | 6% |

### Strategic Insights
- Heavy reliance on promotional messaging (40%)
- Strong social proof presence (27% testimonials)
- Limited urgency tactics (opportunity)
- No direct competitor comparison ads detected
```

### Sample Ads by Category Section
```markdown
## Sample Ad Copy by Category

### Top Offer/Promo Ad
> "LIMITED TIME: 50% off your first dental cleaning! New patients only. Book your free consultation today."
> CTA: Book Now

### Top Testimonial Ad
> "I was terrified of the dentist for 20 years. Dr. Smith and his team changed everything. Now I actually look forward to my visits!"
> CTA: Learn More
```

---

## Example Prompts

**Quick Mode:**
> "Quick scan of [competitor]'s ads"
> "What messaging is [competitor] using in their ads?"

**Deep Dive with Copy Analysis:**
> "Deep analysis of [competitor]'s ad strategy with messaging breakdown"
> "Extract all [competitor] ads and categorize by type"
> "Full competitive intel with copy analysis and category mix"
> "What angles is [competitor] pushing in their Facebook ads?"

**Specific Analysis:**
> "What CTAs is [competitor] using most?"
> "Show me [competitor]'s testimonial ads"
> "What percentage of [competitor]'s ads are promotional vs educational?"

**Landing Page Analysis:**
> "Analyze [competitor]'s landing pages from their ads"
> "What conversion tactics is [competitor] using on their landing pages?"
> "Compare landing page strategies across [competitor]'s ad campaigns"

**Executive Summary:**
> "Create an executive summary 1-pager for [competitor]"
> "Generate a stakeholder-ready competitive brief for [competitor]"
> "Build executive summary from all [competitor] data"
> "What are the top 3 strategic opportunities vs [competitor]?"

---

## Files Generated

```
/home/claude/competitive-intel/[COMPETITOR]/
├── screenshots/
│   └── [platform screenshots]
├── meta/
│   ├── ads-with-copy.json        # Full extraction with categorization
│   └── destination-urls.json
├── tiktok/
│   ├── ads-with-copy.json        # Full extraction with categorization
│   └── video-urls.json
├── google/
│   └── ads-with-copy.json        # Full extraction with categorization
├── landing-pages/                 # NEW: Landing page analysis
│   ├── [domain]-page1.json       # Individual page extractions
│   ├── [domain]-page2.json
│   └── landing-page-summary.json # Aggregated landing page insights
├── analysis/
│   ├── copy-analysis.json        # Word frequency, CTA patterns
│   ├── category-summary.json     # Category breakdown
│   └── messaging-insights.md     # Human-readable insights
├── executive-summary.docx         # NEW: 1-page executive summary
├── executive-summary-data.json    # NEW: Structured data for summary
└── report.docx                   # Comprehensive full report
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Copy extraction returns empty | Increase wait time; ensure ads are loaded; try different selector |
| Wrong categorization | Category relies on text patterns; review scores in output; manual override |
| Missing CTAs | Not all ads have visible CTAs; check if button text is in image |
| Low confidence scores | Ad uses subtle messaging; review raw text manually |
| Landing page blocked | Some sites block automated access; try manual screenshot |
| Landing page dynamic content | Increase wait time; some SPAs need longer to render |
| Executive summary too long | Focus on top 3 insights per section; use bullet points |

---

Final reports copied to `/mnt/user-data/outputs/` for download.
