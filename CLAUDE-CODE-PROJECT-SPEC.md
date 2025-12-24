# Competitive Ads Extractor - Standalone CLI Tool

## Project Overview

Build a **Node.js CLI tool** that extracts competitive advertising intelligence from Meta Ad Library, TikTok Ad Library, Google Ads Transparency Center, and LinkedIn Ad Library. The tool should use **Playwright** for browser automation to scrape ads, extract copy, categorize messaging, analyze landing pages, and generate comprehensive reports.

This is a **standalone alternative** to the Claude.ai skill, designed to run independently with scheduled automation capabilities.

---

## Tech Stack

### Core
- **Node.js** (v18+) with TypeScript
- **Playwright** - Browser automation for ad extraction
- **Commander.js** - CLI interface
- **Chalk** - Terminal output styling

### Data Processing
- **Cheerio** - HTML parsing (for static content)
- **Natural** - NLP for keyword extraction and categorization
- **Compromise** - Text analysis for messaging themes

### Storage & Reports
- **SQLite** (better-sqlite3) - Local database for historical tracking
- **ExcelJS** - Excel report generation
- **Puppeteer-PDF** - PDF report generation
- **Markdown-it** - Markdown report generation

### Optional Enhancements
- **Axios** - API requests (for future API integrations)
- **Cron** - Scheduled extraction jobs
- **Winston** - Structured logging

---

## Project Structure

```
competitive-ads-extractor/
├── src/
│   ├── cli.ts                      # Main CLI entry point
│   ├── config/
│   │   ├── selectors.ts            # Platform-specific DOM selectors
│   │   ├── categories.ts           # Ad categorization rules
│   │   └── ctas.ts                 # CTA patterns to detect
│   ├── extractors/
│   │   ├── base.ts                 # Base extractor class
│   │   ├── meta.ts                 # Meta Ad Library extractor
│   │   ├── tiktok.ts               # TikTok Ad Library extractor
│   │   ├── google.ts               # Google Ads Transparency extractor
│   │   └── linkedin.ts             # LinkedIn Ad Library extractor
│   ├── analyzers/
│   │   ├── copy-analyzer.ts        # Text analysis (keywords, CTAs)
│   │   ├── categorizer.ts          # Ad categorization logic
│   │   ├── landing-page.ts         # Landing page analysis
│   │   └── sentiment.ts            # Emotional tone detection
│   ├── reporters/
│   │   ├── json.ts                 # JSON output
│   │   ├── markdown.ts             # Markdown report generator
│   │   ├── excel.ts                # Excel workbook generator
│   │   ├── pdf.ts                  # PDF report generator
│   │   └── executive-summary.ts    # Executive 1-pager generator
│   ├── storage/
│   │   ├── database.ts             # SQLite database layer
│   │   └── models.ts               # Data models/schemas
│   ├── utils/
│   │   ├── browser.ts              # Playwright browser utilities
│   │   ├── screenshot.ts           # Screenshot capture utilities
│   │   ├── wait.ts                 # Smart wait/retry logic
│   │   └── logger.ts               # Logging utilities
│   └── types/
│       ├── ad.ts                   # Ad data types
│       ├── analysis.ts             # Analysis result types
│       └── config.ts               # Configuration types
├── scripts/
│   ├── setup.sh                    # Initial setup script
│   └── install-browsers.sh         # Playwright browser installation
├── tests/
│   ├── extractors/                 # Unit tests for extractors
│   ├── analyzers/                  # Unit tests for analyzers
│   └── integration/                # Integration tests
├── config/
│   ├── default.json                # Default configuration
│   └── example.env                 # Environment variables example
├── output/                          # Generated reports (gitignored)
├── data/                            # SQLite database (gitignored)
├── screenshots/                     # Captured screenshots (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Core Features to Implement

### 1. Multi-Platform Ad Extraction

**Meta Ad Library (`src/extractors/meta.ts`)**
```typescript
interface MetaExtractorOptions {
  competitor: string;
  searchType: 'keyword' | 'page' | 'advertiser_id';
  country?: string;
  maxAds?: number;
  includeInactive?: boolean;
}

class MetaExtractor {
  async extract(options: MetaExtractorOptions): Promise<Ad[]> {
    // Navigate to Meta Ad Library
    // Execute JavaScript extraction script
    // Parse ad cards and extract:
    //   - Ad copy (primary text, headline, description)
    //   - CTA buttons
    //   - Hashtags
    //   - Run dates (start, end)
    //   - Platforms (Facebook, Instagram, etc.)
    //   - Screenshot of ad creative
    //   - Destination URL
    // Return structured Ad objects
  }
}
```

**Key Extraction Logic:**
```javascript
// JavaScript to inject into Meta Ad Library page
const extractMetaAds = () => {
  const ads = [];
  document.querySelectorAll('div').forEach(el => {
    const text = el.innerText;
    if (text.includes('Active') || text.includes('Started running')) {
      // Extract ad data structure
      const adData = {
        primaryText: extractPrimaryText(text),
        cta: extractCTA(text),
        hashtags: extractHashtags(text),
        startDate: extractStartDate(text),
        platforms: extractPlatforms(el),
        rawText: text
      };
      ads.push(adData);
    }
  });
  return deduplicateAds(ads);
};
```

**TikTok Ad Library (`src/extractors/tiktok.ts`)**
```typescript
class TikTokExtractor {
  async extract(options: { advertiser: string }): Promise<Ad[]> {
    // Navigate to TikTok Ad Library
    // Search for advertiser
    // Extract ad cards:
    //   - Video URLs (direct .mp4 links)
    //   - Ad captions/text
    //   - Hashtags and @mentions
    //   - Targeting data (age, gender, location)
    //   - Reach metrics (impressions, unique users)
    // Optionally navigate to detail pages for deeper data
  }
}
```

**Google Ads Transparency (`src/extractors/google.ts`)**
```typescript
class GoogleExtractor {
  async extract(options: { advertiser: string }): Promise<Ad[]> {
    // Navigate to Google Ads Transparency Center
    // Search for advertiser
    // Extract:
    //   - Ad headlines (up to 3)
    //   - Ad descriptions (up to 2)
    //   - Display URLs
    //   - Sitelinks
    //   - Region targeting
  }
}
```

**LinkedIn Ad Library (`src/extractors/linkedin.ts`)**
```typescript
class LinkedInExtractor {
  async extract(options: { company: string }): Promise<Ad[]> {
    // Note: LinkedIn Ad Library is often unreliable
    // Attempt extraction with robust error handling
    // Extract when available:
    //   - Sponsored content
    //   - Ad copy and images
    //   - Engagement metrics
  }
}
```

---

### 2. Ad Copy Analysis (`src/analyzers/copy-analyzer.ts`)

```typescript
interface CopyAnalysis {
  wordFrequency: Map<string, number>;
  topKeywords: string[];
  commonPhrases: string[];
  ctaDistribution: Map<string, number>;
  avgCopyLength: number;
  emojiUsage: string[];
  readabilityScore: number;
}

class CopyAnalyzer {
  analyze(ads: Ad[]): CopyAnalysis {
    // Extract all text from ads
    // Remove stop words
    // Count word frequency
    // Identify 2-3 word phrases (n-grams)
    // Categorize CTAs by pattern
    // Calculate readability (Flesch-Kincaid)
    // Detect emoji usage patterns
  }
}
```

---

### 3. Ad Categorization (`src/analyzers/categorizer.ts`)

```typescript
enum AdCategory {
  TESTIMONIAL = 'testimonial',
  OFFER_PROMO = 'offer_promo',
  EDUCATIONAL = 'educational',
  PRODUCT_FEATURE = 'product_feature',
  BRAND_AWARENESS = 'brand_awareness',
  EVENT = 'event',
  HIRING = 'hiring',
  OTHER = 'other'
}

interface CategorizationResult {
  category: AdCategory;
  confidence: number;
  signals: string[];
}

class AdCategorizer {
  categorize(ad: Ad): CategorizationResult {
    const scores = {
      testimonial: this.scoreTestimonial(ad),
      offer_promo: this.scoreOfferPromo(ad),
      educational: this.scoreEducational(ad),
      // ... other categories
    };
    
    // Return highest scoring category with confidence
  }
  
  private scoreTestimonial(ad: Ad): number {
    let score = 0;
    const text = ad.primaryText.toLowerCase();
    
    // Testimonial indicators
    if (text.includes('"') || text.includes('"')) score += 2;
    if (/dr\.|patient|customer|client/i.test(text)) score += 2;
    if (/⭐|★|stars|rating/i.test(text)) score += 1;
    if (/review|testimonial|experience/i.test(text)) score += 1;
    
    return score;
  }
  
  private scoreOfferPromo(ad: Ad): number {
    let score = 0;
    const text = ad.primaryText.toLowerCase();
    
    // Promotional indicators
    if (/free|discount|% off|\$\d+/i.test(text)) score += 3;
    if (/limited time|today only|ends soon/i.test(text)) score += 2;
    if (/sale|deal|offer|promo|special/i.test(text)) score += 1;
    
    return score;
  }
  
  // ... other scoring methods
}
```

---

### 4. Landing Page Analysis (`src/analyzers/landing-page.ts`)

```typescript
interface LandingPageAnalysis {
  url: string;
  headline: string;
  subheadline: string;
  primaryCTA: string;
  secondaryCTAs: string[];
  formFields: string[];
  formFriction: 'low' | 'medium' | 'high';
  trustSignals: string[];
  offerHighlights: string[];
  pageStructure: {
    hero: boolean;
    benefits: boolean;
    testimonials: boolean;
    pricing: boolean;
    faq: boolean;
  };
}

class LandingPageAnalyzer {
  async analyze(url: string): Promise<LandingPageAnalysis> {
    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Extract key elements
    const headline = await page.$eval('h1', el => el.innerText);
    const ctaButtons = await page.$$eval('button, a.btn', 
      els => els.map(el => el.innerText)
    );
    const formInputs = await page.$$eval('input, textarea, select',
      els => els.map(el => el.getAttribute('name') || el.getAttribute('placeholder'))
    );
    
    // Analyze trust signals
    const trustSignals = await this.detectTrustSignals(page);
    
    // Determine form friction
    const formFriction = formInputs.length <= 3 ? 'low' 
      : formInputs.length <= 6 ? 'medium' 
      : 'high';
    
    return { headline, ctaButtons, formInputs, formFriction, trustSignals, ... };
  }
  
  private async detectTrustSignals(page: Page): Promise<string[]> {
    const signals = [];
    const bodyText = await page.innerText('body');
    
    if (/⭐|stars|rating|review/i.test(bodyText)) signals.push('User ratings');
    if (/bbb|accredited/i.test(bodyText)) signals.push('BBB Accredited');
    if (/guarantee|warranty/i.test(bodyText)) signals.push('Guarantee');
    if (/secure|ssl|encrypted/i.test(bodyText)) signals.push('Security badges');
    
    return signals;
  }
}
```

---

### 5. Report Generation

**Executive Summary (`src/reporters/executive-summary.ts`)**
```typescript
interface ExecutiveSummary {
  competitor: string;
  analysisDate: string;
  keyFinding: {
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
  strategicOpportunities: Array<{
    type: string;
    description: string;
    opportunity: string;
  }>;
  recommendedActions: string[];
}

class ExecutiveSummaryGenerator {
  generate(ads: Ad[], analysis: Analysis): ExecutiveSummary {
    // Synthesize key insights
    // Identify top opportunity
    // Calculate platform distribution
    // Generate strategic recommendations
  }
}
```

**Markdown Report (`src/reporters/markdown.ts`)**
```typescript
class MarkdownReporter {
  generate(summary: ExecutiveSummary, ads: Ad[]): string {
    // Generate comprehensive markdown report
    // Include:
    //   - Executive summary
    //   - Platform breakdown
    //   - Ad copy samples
    //   - Messaging analysis
    //   - Category distribution
    //   - Strategic opportunities
    //   - Sample ads by category
  }
}
```

**Excel Report (`src/reporters/excel.ts`)**
```typescript
class ExcelReporter {
  async generate(ads: Ad[], analysis: Analysis): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: All Ads
    const adsSheet = workbook.addWorksheet('All Ads');
    adsSheet.columns = [
      { header: 'Platform', key: 'platform' },
      { header: 'Ad Copy', key: 'primaryText' },
      { header: 'CTA', key: 'cta' },
      { header: 'Category', key: 'category' },
      { header: 'Start Date', key: 'startDate' },
      { header: 'Landing Page', key: 'destinationUrl' }
    ];
    ads.forEach(ad => adsSheet.addRow(ad));
    
    // Sheet 2: Keyword Analysis
    const keywordSheet = workbook.addWorksheet('Keywords');
    // ... populate with word frequency
    
    // Sheet 3: Category Summary
    const summarySheet = workbook.addWorksheet('Summary');
    // ... populate with category breakdown
    
    await workbook.xlsx.writeFile('output/report.xlsx');
  }
}
```

---

### 6. Database Storage (`src/storage/database.ts`)

```typescript
import Database from 'better-sqlite3';

interface AdRecord {
  id: string;
  competitor: string;
  platform: string;
  extractedAt: string;
  primaryText: string;
  cta: string;
  category: string;
  startDate: string;
  endDate?: string;
  destinationUrl: string;
  raw: string; // JSON stringified full ad object
}

class AdDatabase {
  private db: Database.Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
  }
  
  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ads (
        id TEXT PRIMARY KEY,
        competitor TEXT NOT NULL,
        platform TEXT NOT NULL,
        extracted_at TEXT NOT NULL,
        primary_text TEXT,
        cta TEXT,
        category TEXT,
        start_date TEXT,
        end_date TEXT,
        destination_url TEXT,
        raw TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_competitor ON ads(competitor);
      CREATE INDEX IF NOT EXISTS idx_platform ON ads(platform);
      CREATE INDEX IF NOT EXISTS idx_extracted_at ON ads(extracted_at);
    `);
  }
  
  saveAds(ads: Ad[]): void {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO ads 
      (id, competitor, platform, extracted_at, primary_text, cta, category, start_date, destination_url, raw)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = this.db.transaction((ads: Ad[]) => {
      ads.forEach(ad => {
        insert.run(
          ad.id,
          ad.competitor,
          ad.platform,
          ad.extractedAt,
          ad.primaryText,
          ad.cta,
          ad.category,
          ad.startDate,
          ad.destinationUrl,
          JSON.stringify(ad)
        );
      });
    });
    
    insertMany(ads);
  }
  
  getAdsByCompetitor(competitor: string, since?: Date): AdRecord[] {
    const query = since
      ? this.db.prepare('SELECT * FROM ads WHERE competitor = ? AND extracted_at > ? ORDER BY extracted_at DESC')
      : this.db.prepare('SELECT * FROM ads WHERE competitor = ? ORDER BY extracted_at DESC');
    
    return since ? query.all(competitor, since.toISOString()) : query.all(competitor);
  }
  
  compareExtractions(competitor: string, date1: string, date2: string): {
    added: AdRecord[];
    removed: AdRecord[];
    unchanged: AdRecord[];
  } {
    // Compare two extraction snapshots
    // Identify new ads, removed ads, and unchanged ads
  }
}
```

---

### 7. CLI Interface (`src/cli.ts`)

```typescript
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('ad-extractor')
  .description('Competitive advertising intelligence extraction tool')
  .version('1.0.0');

// Extract command
program
  .command('extract')
  .description('Extract ads from ad libraries')
  .requiredOption('-c, --competitor <name>', 'Competitor name')
  .option('-p, --platforms <platforms>', 'Platforms (meta,tiktok,google,linkedin)', 'meta')
  .option('-m, --max <number>', 'Maximum ads to extract', '50')
  .option('--screenshots', 'Capture screenshots', false)
  .option('--landing-pages', 'Analyze landing pages', false)
  .action(async (options) => {
    console.log(chalk.blue(`🔍 Extracting ads for: ${options.competitor}`));
    
    const platforms = options.platforms.split(',');
    const results = [];
    
    for (const platform of platforms) {
      console.log(chalk.gray(`  → Scanning ${platform}...`));
      const extractor = getExtractor(platform);
      const ads = await extractor.extract({
        competitor: options.competitor,
        maxAds: parseInt(options.max),
      });
      results.push(...ads);
      console.log(chalk.green(`    ✓ Found ${ads.length} ads`));
    }
    
    // Analyze
    console.log(chalk.blue(`📊 Analyzing ${results.length} ads...`));
    const analysis = await analyzeAds(results);
    
    // Generate reports
    console.log(chalk.blue(`📄 Generating reports...`));
    await generateReports(results, analysis);
    
    console.log(chalk.green(`✅ Complete! Reports saved to output/`));
  });

// Analyze command (for existing data)
program
  .command('analyze')
  .description('Analyze previously extracted ads')
  .requiredOption('-c, --competitor <name>', 'Competitor name')
  .option('--since <date>', 'Analyze ads since date')
  .action(async (options) => {
    const ads = await loadAdsFromDatabase(options.competitor, options.since);
    const analysis = await analyzeAds(ads);
    await generateReports(ads, analysis);
  });

// Compare command
program
  .command('compare')
  .description('Compare two extraction snapshots')
  .requiredOption('-c, --competitor <name>', 'Competitor name')
  .requiredOption('--from <date>', 'First snapshot date')
  .requiredOption('--to <date>', 'Second snapshot date')
  .action(async (options) => {
    const comparison = await compareSnapshots(
      options.competitor,
      options.from,
      options.to
    );
    
    console.log(chalk.blue('📊 Comparison Results:'));
    console.log(chalk.green(`  New ads: ${comparison.added.length}`));
    console.log(chalk.red(`  Removed ads: ${comparison.removed.length}`));
    console.log(chalk.gray(`  Unchanged: ${comparison.unchanged.length}`));
  });

// Schedule command
program
  .command('schedule')
  .description('Schedule automated extractions')
  .requiredOption('-c, --competitor <name>', 'Competitor name')
  .option('--cron <expression>', 'Cron schedule', '0 0 * * *') // Daily at midnight
  .action(async (options) => {
    // Set up cron job for automated extraction
  });

// Server command (optional - for dashboard)
program
  .command('serve')
  .description('Start web dashboard')
  .option('-p, --port <number>', 'Port number', '3000')
  .action(async (options) => {
    // Start Express server with dashboard
  });

program.parse();
```

---

## Usage Examples

### Basic Extraction
```bash
# Extract ads from Meta for a competitor
ad-extractor extract --competitor "Marketly Digital" --platforms meta

# Extract from multiple platforms with screenshots
ad-extractor extract \
  --competitor "Wonderist Agency" \
  --platforms meta,tiktok,google \
  --max 100 \
  --screenshots \
  --landing-pages

# Extract and save to database
ad-extractor extract -c "Competitor Name" -p meta,tiktok --save
```

### Analysis
```bash
# Analyze previously extracted data
ad-extractor analyze --competitor "Marketly Digital"

# Analyze ads from last 30 days
ad-extractor analyze --competitor "Competitor" --since 2025-11-15
```

### Comparison
```bash
# Compare two snapshots to see what changed
ad-extractor compare \
  --competitor "Wonderist Agency" \
  --from 2025-11-01 \
  --to 2025-12-01
```

### Automation
```bash
# Schedule daily extraction at midnight
ad-extractor schedule \
  --competitor "Marketly Digital" \
  --cron "0 0 * * *"

# Schedule weekly extraction on Mondays at 9am
ad-extractor schedule \
  --competitor "All Competitors" \
  --cron "0 9 * * 1"
```

---

## Configuration

### config/default.json
```json
{
  "browser": {
    "headless": true,
    "slowMo": 100,
    "timeout": 30000
  },
  "extraction": {
    "defaultMaxAds": 50,
    "screenshots": true,
    "landingPageAnalysis": false,
    "retryAttempts": 3,
    "retryDelay": 2000
  },
  "database": {
    "path": "./data/ads.db"
  },
  "output": {
    "directory": "./output",
    "formats": ["json", "markdown", "excel"],
    "generateExecutiveSummary": true
  },
  "categorization": {
    "confidenceThreshold": 0.5,
    "defaultCategory": "other"
  }
}
```

### .env.example
```bash
# Optional: API Keys (for future integrations)
# META_API_KEY=your_key_here
# TIKTOK_API_KEY=your_key_here

# Browser settings
HEADLESS_BROWSER=true
BROWSER_TIMEOUT=30000

# Output settings
OUTPUT_DIR=./output
SCREENSHOT_DIR=./screenshots

# Database
DATABASE_PATH=./data/ads.db
```

---

## Implementation Priorities

### Phase 1: MVP (Week 1)
- [ ] Project setup (TypeScript, Playwright, Commander)
- [ ] Meta Ad Library extractor
- [ ] Basic ad copy extraction
- [ ] Simple categorization (rule-based)
- [ ] JSON + Markdown reports
- [ ] CLI interface

### Phase 2: Multi-Platform (Week 2)
- [ ] TikTok extractor
- [ ] Google Ads extractor
- [ ] Screenshot capture
- [ ] SQLite database integration
- [ ] Historical tracking

### Phase 3: Advanced Analysis (Week 3)
- [ ] Landing page analyzer
- [ ] NLP-based keyword extraction
- [ ] Advanced categorization with confidence scores
- [ ] Excel report generation
- [ ] Executive summary generator

### Phase 4: Automation (Week 4)
- [ ] Scheduled extraction (cron)
- [ ] Comparison/diff functionality
- [ ] Email alerts for changes
- [ ] Web dashboard (optional)

---

## Testing Strategy

```typescript
// tests/extractors/meta.test.ts
describe('MetaExtractor', () => {
  test('extracts ad copy from Meta Ad Library', async () => {
    const extractor = new MetaExtractor();
    const ads = await extractor.extract({
      competitor: 'Test Company',
      maxAds: 5
    });
    
    expect(ads.length).toBeGreaterThan(0);
    expect(ads[0]).toHaveProperty('primaryText');
    expect(ads[0]).toHaveProperty('cta');
  });
  
  test('handles missing ads gracefully', async () => {
    const extractor = new MetaExtractor();
    const ads = await extractor.extract({
      competitor: 'Nonexistent Company 123456',
      maxAds: 5
    });
    
    expect(ads).toEqual([]);
  });
});

// tests/analyzers/categorizer.test.ts
describe('AdCategorizer', () => {
  test('categorizes testimonial ads', () => {
    const categorizer = new AdCategorizer();
    const ad = {
      primaryText: '"Working with them was amazing! Dr. Smith changed my life." ⭐⭐⭐⭐⭐',
      cta: 'Learn More'
    };
    
    const result = categorizer.categorize(ad);
    expect(result.category).toBe(AdCategory.TESTIMONIAL);
    expect(result.confidence).toBeGreaterThan(0.7);
  });
  
  test('categorizes promotional ads', () => {
    const categorizer = new AdCategorizer();
    const ad = {
      primaryText: 'LIMITED TIME: 50% off! Book your free consultation today.',
      cta: 'Get Offer'
    };
    
    const result = categorizer.categorize(ad);
    expect(result.category).toBe(AdCategory.OFFER_PROMO);
  });
});
```

---

## Deployment

### Local Usage
```bash
# Install
npm install -g competitive-ads-extractor

# Run
ad-extractor extract -c "Competitor Name" -p meta
```

### Docker
```dockerfile
FROM node:18-alpine

RUN apk add --no-cache chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

CMD ["node", "dist/cli.js"]
```

### GitHub Actions (Scheduled Extraction)
```yaml
name: Daily Competitor Extraction

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  extract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npx playwright install chromium
      
      - name: Extract ads
        run: |
          npm run extract -- \
            --competitor "Marketly Digital" \
            --platforms meta,tiktok,google
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: competitive-reports
          path: output/
      
      - name: Commit database
        run: |
          git config user.name "Ad Extractor Bot"
          git config user.email "bot@example.com"
          git add data/ads.db
          git commit -m "Update ad database - $(date)"
          git push
```

---

## Advanced Features (Future)

### 1. MCP Server Integration
Create an MCP server that Claude.ai can use:
```typescript
// src/mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'competitive-ads-extractor',
  version: '1.0.0',
});

server.setRequestHandler('extract_ads', async (params) => {
  const { competitor, platforms } = params;
  // Run extraction and return results
  return extractionResults;
});

server.setRequestHandler('analyze_ads', async (params) => {
  // Analyze and return insights
});
```

### 2. Real-Time Monitoring
```typescript
// Watch for new ads and alert
class AdMonitor {
  async watchCompetitor(competitor: string, interval: number) {
    setInterval(async () => {
      const currentAds = await extractAds(competitor);
      const previousAds = await loadFromDatabase(competitor);
      const newAds = findNewAds(currentAds, previousAds);
      
      if (newAds.length > 0) {
        await sendAlert(`${competitor} launched ${newAds.length} new ads!`);
      }
    }, interval);
  }
}
```

### 3. Web Dashboard
```typescript
// Simple Express dashboard
app.get('/dashboard', (req, res) => {
  const competitors = getCompetitors();
  const recentActivity = getRecentActivity();
  res.render('dashboard', { competitors, recentActivity });
});

app.get('/api/competitor/:name', (req, res) => {
  const ads = getCompetitorAds(req.params.name);
  const analysis = analyzeAds(ads);
  res.json({ ads, analysis });
});
```

---

## Success Criteria

This tool should be able to:

✅ Extract ads from Meta, TikTok, Google, and LinkedIn  
✅ Extract complete ad copy (text, CTAs, hashtags)  
✅ Categorize ads by type with confidence scores  
✅ Analyze messaging (keywords, phrases, tone)  
✅ Capture screenshots of ad creatives  
✅ Analyze landing pages for conversion elements  
✅ Generate executive summaries with strategic insights  
✅ Store historical data in SQLite for tracking  
✅ Export reports in JSON, Markdown, Excel, and PDF formats  
✅ Run via CLI with intuitive commands  
✅ Schedule automated extractions  
✅ Compare snapshots to identify changes  

---

## Getting Started

To begin implementation in Claude Code:

1. **Initialize project:**
   ```bash
   mkdir competitive-ads-extractor
   cd competitive-ads-extractor
   npm init -y
   npm install typescript @types/node playwright commander chalk better-sqlite3 exceljs natural
   npm install -D @types/better-sqlite3 ts-node
   ```

2. **Set up TypeScript:**
   ```bash
   npx tsc --init
   ```

3. **Create initial structure:**
   ```bash
   mkdir -p src/{extractors,analyzers,reporters,storage,utils,types} config output data screenshots
   ```

4. **Start with Meta extractor** as the MVP
5. **Build CLI interface** for basic extraction
6. **Add analysis and reporting** incrementally
7. **Expand to other platforms** once Meta is solid

---

## Questions for Claude Code Session

When starting the project in Claude Code, ask:

1. "Create the initial project structure with TypeScript, Playwright, and Commander.js"
2. "Implement the Meta Ad Library extractor with Playwright browser automation"
3. "Build the ad categorization logic with rule-based scoring"
4. "Create the CLI interface with extract, analyze, and compare commands"
5. "Add SQLite database layer for historical tracking"
6. "Implement markdown and JSON report generators"

Each of these is a discrete, implementable task that Claude Code can handle effectively.

---

**This spec provides everything needed to build a production-ready competitive intelligence tool that matches the functionality of the Claude.ai skill but runs independently with automation capabilities.**
