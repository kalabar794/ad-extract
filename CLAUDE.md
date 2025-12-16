# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js CLI tool for extracting competitive advertising intelligence from Meta Ad Library, TikTok Ad Library, Google Ads Transparency Center, and LinkedIn Ad Library using Playwright browser automation.

## Tech Stack

- **Runtime**: Node.js (v18+) with TypeScript
- **Browser Automation**: Playwright
- **CLI**: Commander.js with Chalk for styling
- **Database**: SQLite via better-sqlite3
- **NLP**: Natural + Compromise for text analysis
- **Reports**: ExcelJS, Markdown-it, Puppeteer-PDF

## Commands

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers

# Build TypeScript
npm run build

# Run CLI (after build)
node dist/cli.js extract -c "Competitor Name" -p meta

# Development with ts-node
npm run dev extract -c "Competitor Name" -p meta

# Start Web GUI
npm run serve
# Then open http://localhost:3000

# Run tests
npm test

# Type checking
npm run typecheck
```

## CLI Usage

```bash
# Basic extraction from Meta Ad Library
ad-extractor extract -c "Nike" -p meta

# Multiple platforms with options
ad-extractor extract -c "Coca-Cola" -p meta,tiktok --max 100 --screenshots

# Visible browser (not headless)
ad-extractor extract -c "Apple" --no-headless

# Analyze existing JSON data
ad-extractor analyze -f ./output/nike_2025-01-15.json

# List available platforms
ad-extractor platforms

# Start web GUI
ad-extractor serve --port 3000
```

## Architecture

### Extraction Strategy: Playwright-First, API Fallback

The tool uses **Playwright browser automation as the primary extraction method**, with official APIs as fallback when scraping fails or gets rate-limited.

**Why Playwright-first:**
- Full data access (APIs often restrict fields)
- Screenshot capture of ad creatives
- Consistent pattern across all platforms
- APIs as reliable fallback when blocked

**Platform API availability:**
- Meta Ad Library API - exists, limited fields, requires app approval
- Google Ads Transparency API - limited/unofficial
- TikTok Commercial Content API - restricted access
- LinkedIn - no public API

### Core Components

**Extractors** (`src/extractors/`): Platform-specific browser automation for scraping ads. Each extends a base extractor class with common Playwright utilities. Extractors inject JavaScript into ad library pages to parse DOM and extract structured ad data. Each extractor has an optional API fallback method.

**Analyzers** (`src/analyzers/`): Transform raw ad data into insights:
- `copy-analyzer.ts`: Word frequency, n-grams, readability scores
- `categorizer.ts`: Rule-based scoring to classify ads (testimonial, promo, educational, etc.)
- `landing-page.ts`: Extracts conversion elements (CTAs, forms, trust signals)
- `sentiment.ts`: Emotional tone detection

**Reporters** (`src/reporters/`): Generate output in multiple formats (JSON, Markdown, Excel, PDF, executive summary)

**Storage** (`src/storage/`): SQLite layer for historical ad tracking and snapshot comparisons

### Data Flow

1. CLI parses commands and invokes extractors
2. Extractors use Playwright to scrape ad libraries, return `Ad[]`
3. Analyzers process ads into `Analysis` objects
4. Reporters generate output files
5. Database stores ads for historical tracking

### Key Types

```typescript
interface Ad {
  id: string;
  competitor: string;
  platform: 'meta' | 'tiktok' | 'google' | 'linkedin';
  primaryText: string;
  cta: string;
  hashtags: string[];
  startDate: string;
  destinationUrl: string;
  category: AdCategory;
}

enum AdCategory {
  TESTIMONIAL, OFFER_PROMO, EDUCATIONAL,
  PRODUCT_FEATURE, BRAND_AWARENESS, EVENT, HIRING, OTHER
}
```

## CLI Commands

```bash
# Extract ads
ad-extractor extract -c "Company" -p meta,tiktok,google --max 50 --screenshots

# Analyze stored data
ad-extractor analyze -c "Company" --since 2025-01-01

# Compare snapshots
ad-extractor compare -c "Company" --from 2025-01-01 --to 2025-02-01

# Schedule automation
ad-extractor schedule -c "Company" --cron "0 0 * * *"
```

## Categorization Logic

Ads are categorized using rule-based scoring. Each category has scoring methods that check for specific patterns:
- **Testimonial**: Quotes, star ratings, "review", "experience"
- **Offer/Promo**: "free", "% off", "limited time", "$" amounts
- **Educational**: "learn", "how to", "tips", "guide"

Highest scoring category wins, with confidence = score / max_possible_score.

## Browser Automation Notes

- Use `waitUntil: 'networkidle'` for ad libraries that load dynamically
- Implement retry logic for flaky selectors (ad libraries change frequently)
- DOM selectors are centralized in `src/config/selectors.ts` for easy updates
- Screenshots stored in `./screenshots/` (gitignored)
- Headless mode configurable via config or `HEADLESS_BROWSER` env var

## GUI Architecture

The tool has both CLI and Web GUI interfaces sharing the same core extraction/analysis engine.

### Stack
- **Backend**: Express.js server exposing REST API
- **Frontend**: React with Tailwind CSS (or simple vanilla HTML/JS for MVP)
- **Real-time**: WebSocket for extraction progress updates

### GUI Features
- Dashboard showing recent extractions and saved competitors
- Report builder form: select platforms, competitor, date range, output formats
- Live extraction progress with log streaming
- Report preview and download
- Saved report templates/presets
- Scheduled job management

### API Endpoints
```
POST /api/extract     - Start new extraction job
GET  /api/jobs/:id    - Get job status/progress
GET  /api/reports     - List generated reports
GET  /api/reports/:id - Download specific report
POST /api/templates   - Save report configuration template
GET  /api/competitors - List tracked competitors
```

### Project Structure
```
src/
├── cli.ts                # CLI entry point
├── types/                # TypeScript interfaces
│   ├── ad.ts             # Ad, Platform, ExtractionOptions
│   ├── analysis.ts       # Analysis result types
│   └── config.ts         # Configuration types
├── extractors/           # Platform extractors
│   ├── base.ts           # BaseExtractor class
│   ├── meta.ts           # Meta Ad Library
│   └── index.ts          # Factory function
├── analyzers/            # Analysis engines
│   ├── categorizer.ts    # Ad categorization
│   ├── copy-analyzer.ts  # Text analysis
│   └── index.ts          # Main analyzer
├── reporters/            # Report generators
│   ├── json.ts           # JSON output
│   ├── markdown.ts       # Markdown reports
│   ├── executive-summary.ts
│   └── index.ts          # Report factory
├── config/               # Configuration
│   ├── selectors.ts      # DOM selectors per platform
│   ├── categories.ts     # Category rules
│   └── ctas.ts           # CTA patterns
├── utils/                # Utilities
│   ├── browser.ts        # Playwright helpers
│   └── logger.ts         # Winston logger
├── server/               # Web GUI backend
│   └── index.ts          # Express + WebSocket server
└── web/                  # Web GUI frontend
    └── index.html        # Single-page app with Tailwind
```

## Extending the Tool

### Adding a New Platform Extractor

1. Create `src/extractors/newplatform.ts` extending `BaseExtractor`
2. Implement `extractAds(options)` method with Playwright logic
3. Add selectors to `src/config/selectors.ts`
4. Register in `src/extractors/index.ts` factory function

### Adding New Ad Categories

1. Add enum value to `AdCategory` in `src/types/ad.ts`
2. Add scoring rules in `src/config/categories.ts`
3. Categorizer automatically picks up new rules

### Updating DOM Selectors

Ad libraries change frequently. All selectors are centralized in `src/config/selectors.ts` for easy maintenance.
