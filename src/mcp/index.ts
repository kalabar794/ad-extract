#!/usr/bin/env node
/**
 * MCP Server for Competitive Ad Intelligence
 *
 * Provides Claude with tools to extract and analyze competitor advertising data
 * from Meta, TikTok, Google, and LinkedIn ad libraries.
 *
 * Usage:
 *   npx ts-node src/mcp/index.ts
 *   node dist/mcp/index.js
 *
 * Add to Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "ad-extractor": {
 *         "command": "node",
 *         "args": ["/path/to/ad-extraction-tool/dist/mcp/index.js"]
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { getExtractor, getAvailablePlatforms } from '../extractors';
import { analyzeCompetitor } from '../analyzers';
import { analyzeLandingPage } from '../analyzers/landing-page';
import { AdCategorizer } from '../analyzers/categorizer';
import { CopyAnalyzer } from '../analyzers/copy-analyzer';
import { Ad, Platform, ExtractionOptions } from '../types/ad';
import { AppConfig, defaultConfig } from '../types/config';
import { createLogger } from '../utils/logger';

const logger = createLogger('mcp-server');

// Input schemas for tools
const ExtractAdsInputSchema = z.object({
  competitor: z.string().describe('Company name or advertiser ID to search for'),
  platforms: z.array(z.enum(['meta', 'tiktok', 'google', 'linkedin']))
    .default(['meta'])
    .describe('Platforms to extract ads from'),
  maxAds: z.number().min(1).max(500).default(50)
    .describe('Maximum number of ads to extract per platform'),
  country: z.string().default('US')
    .describe('Country code for regional filtering (e.g., US, UK, DE)'),
  includeInactive: z.boolean().default(false)
    .describe('Include inactive/stopped ads'),
  useApi: z.boolean().default(true)
    .describe('Prefer API extraction when credentials are configured')
});

const AnalyzeAdsInputSchema = z.object({
  ads: z.array(z.any()).describe('Array of extracted ads to analyze'),
  competitor: z.string().describe('Competitor name for the analysis report')
});

const AnalyzeLandingPageInputSchema = z.object({
  url: z.string().url().describe('Landing page URL to analyze'),
  fullAnalysis: z.boolean().default(true)
    .describe('Perform full analysis including form detection and technical details')
});

const CategorizeAdsInputSchema = z.object({
  ads: z.array(z.any()).describe('Array of ads to categorize')
});

const AnalyzeCopyInputSchema = z.object({
  ads: z.array(z.any()).describe('Array of ads for copy analysis')
});

// Tool definitions
const tools: Tool[] = [
  {
    name: 'extract_competitor_ads',
    description: `Extract advertising data from competitor ad libraries. Supports Meta Ad Library, TikTok Commercial Content Library, Google Ads Transparency Center, and LinkedIn Ad Library. Returns structured ad data including copy, CTAs, targeting info, and media types.

Use this tool when a user wants to:
- Research competitor advertising strategies
- See what ads a company is running
- Gather competitive intelligence on ad campaigns
- Find examples of competitor ad copy`,
    inputSchema: {
      type: 'object',
      properties: {
        competitor: {
          type: 'string',
          description: 'Company name or advertiser ID to search for'
        },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['meta', 'tiktok', 'google', 'linkedin'] },
          default: ['meta'],
          description: 'Platforms to extract ads from'
        },
        maxAds: {
          type: 'number',
          minimum: 1,
          maximum: 500,
          default: 50,
          description: 'Maximum number of ads to extract per platform'
        },
        country: {
          type: 'string',
          default: 'US',
          description: 'Country code for regional filtering'
        },
        includeInactive: {
          type: 'boolean',
          default: false,
          description: 'Include inactive/stopped ads'
        },
        useApi: {
          type: 'boolean',
          default: true,
          description: 'Prefer API extraction when credentials are configured'
        }
      },
      required: ['competitor']
    }
  },
  {
    name: 'analyze_competitor_ads',
    description: `Perform comprehensive analysis on extracted ads. Generates insights including:
- Category distribution (testimonial, offer, educational, etc.)
- Copy analysis (word frequency, n-grams, readability)
- CTA patterns and distribution
- Platform breakdown
- Messaging themes and top angles

Use after extracting ads to get strategic insights.`,
    inputSchema: {
      type: 'object',
      properties: {
        ads: {
          type: 'array',
          description: 'Array of extracted ads to analyze'
        },
        competitor: {
          type: 'string',
          description: 'Competitor name for the analysis report'
        }
      },
      required: ['ads', 'competitor']
    }
  },
  {
    name: 'analyze_landing_page',
    description: `Analyze a landing page for conversion optimization insights. Extracts:
- Headlines and value propositions
- CTAs with prominence scoring
- Form analysis with friction scoring
- Trust signals (testimonials, badges, guarantees)
- Offers and pricing
- Page structure and sections
- Technical details (load time, mobile optimization)

Use to understand competitor conversion strategies.`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'Landing page URL to analyze'
        },
        fullAnalysis: {
          type: 'boolean',
          default: true,
          description: 'Perform full analysis including forms and technical details'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'categorize_ads',
    description: `Categorize ads into marketing angles:
- Testimonial/Social Proof
- Offer/Promotion
- Educational/How-To
- Product Feature
- Brand Awareness
- Event/Webinar
- Hiring/Recruitment
- Urgency/Scarcity
- Problem/Solution
- Comparison

Returns categorized ads with confidence scores.`,
    inputSchema: {
      type: 'object',
      properties: {
        ads: {
          type: 'array',
          description: 'Array of ads to categorize'
        }
      },
      required: ['ads']
    }
  },
  {
    name: 'analyze_ad_copy',
    description: `Deep analysis of ad copy across a collection. Returns:
- Top keywords and phrases
- Word frequency analysis
- N-gram patterns (bigrams, trigrams)
- Readability scores
- Average copy length
- CTA distribution
- Hashtag analysis

Use to understand messaging patterns and language.`,
    inputSchema: {
      type: 'object',
      properties: {
        ads: {
          type: 'array',
          description: 'Array of ads for copy analysis'
        }
      },
      required: ['ads']
    }
  },
  {
    name: 'list_platforms',
    description: 'List all available ad library platforms and their extraction capabilities.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'ad-extractor',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Store for extracted ads (per session)
let sessionAds: Map<string, Ad[]> = new Map();

// Get config with API credentials from environment
function getConfig(): AppConfig {
  const config = { ...defaultConfig };

  // Load API credentials from environment variables
  config.api = {
    meta: {
      accessToken: process.env.META_ACCESS_TOKEN,
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET
    },
    tiktok: {
      clientKey: process.env.TIKTOK_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET
    },
    google: {
      serpApiKey: process.env.SERP_API_KEY,
      searchApiKey: process.env.SEARCH_API_KEY
    },
    linkedin: {
      searchApiKey: process.env.SEARCH_API_KEY,
      apifyToken: process.env.APIFY_TOKEN
    }
  };

  // Browser settings for scraping
  config.browser.headless = true;

  return config;
}

// Tool handlers
async function handleExtractAds(input: z.infer<typeof ExtractAdsInputSchema>): Promise<string> {
  const config = getConfig();
  const allAds: Ad[] = [];
  const results: Record<string, { count: number; error?: string }> = {};

  for (const platform of input.platforms) {
    try {
      logger.info(`Extracting ads from ${platform} for "${input.competitor}"...`);

      const extractor = getExtractor(platform as Platform, config);
      const options: ExtractionOptions = {
        competitor: input.competitor,
        maxAds: input.maxAds,
        country: input.country,
        includeInactive: input.includeInactive
      };

      let ads: Ad[] | null = null;

      // Try API first if preferred
      if (input.useApi) {
        ads = await extractor.extractViaApi(options);
      }

      // Fall back to browser scraping
      if (!ads || ads.length === 0) {
        ads = await extractor.extractAds(options);
      }

      await extractor.close();

      if (ads && ads.length > 0) {
        allAds.push(...ads);
        results[platform] = { count: ads.length };
      } else {
        results[platform] = { count: 0 };
      }
    } catch (error) {
      const err = error as Error;
      logger.error(`Error extracting from ${platform}: ${err.message}`);
      results[platform] = { count: 0, error: err.message };
    }
  }

  // Store ads in session
  const sessionKey = `${input.competitor}_${Date.now()}`;
  sessionAds.set(sessionKey, allAds);

  // Return summary and sample ads
  const response = {
    summary: {
      competitor: input.competitor,
      totalAds: allAds.length,
      platformResults: results,
      sessionKey
    },
    sampleAds: allAds.slice(0, 10).map(ad => ({
      id: ad.id,
      platform: ad.platform,
      primaryText: ad.primaryText?.substring(0, 200),
      headline: ad.headline,
      cta: ad.cta,
      category: ad.category,
      startDate: ad.startDate,
      destinationUrl: ad.destinationUrl
    })),
    allAds: allAds.length <= 50 ? allAds : undefined
  };

  return JSON.stringify(response, null, 2);
}

async function handleAnalyzeAds(input: z.infer<typeof AnalyzeAdsInputSchema>): Promise<string> {
  const ads = input.ads as Ad[];
  const analysis = analyzeCompetitor(input.competitor, ads);
  return JSON.stringify(analysis, null, 2);
}

async function handleAnalyzeLandingPage(input: z.infer<typeof AnalyzeLandingPageInputSchema>): Promise<string> {
  const config = getConfig();
  const analysis = await analyzeLandingPage(input.url, config);
  return JSON.stringify(analysis, null, 2);
}

async function handleCategorizeAds(input: z.infer<typeof CategorizeAdsInputSchema>): Promise<string> {
  const ads = input.ads as Ad[];
  const categorizer = new AdCategorizer();
  const categorized = categorizer.categorizeAndUpdate(ads);
  const distribution = categorizer.getCategoryDistribution(categorized);

  return JSON.stringify({
    categorizedAds: categorized.map(ad => ({
      id: ad.id,
      primaryText: ad.primaryText?.substring(0, 100),
      category: ad.category
    })),
    distribution
  }, null, 2);
}

async function handleAnalyzeCopy(input: z.infer<typeof AnalyzeCopyInputSchema>): Promise<string> {
  const ads = input.ads as Ad[];
  const analyzer = new CopyAnalyzer();
  const analysis = analyzer.analyze(ads);

  return JSON.stringify({
    topKeywords: analysis.topKeywords,
    commonPhrases: analysis.commonPhrases,
    avgCopyLength: analysis.avgCopyLength,
    readabilityScore: analysis.readabilityScore,
    ctaDistribution: Object.fromEntries(analysis.ctaDistribution),
    wordFrequency: Object.fromEntries(Array.from(analysis.wordFrequency.entries()).slice(0, 50)),
    topBigrams: analysis.topNGrams?.bigrams?.slice(0, 20),
    topTrigrams: analysis.topNGrams?.trigrams?.slice(0, 20)
  }, null, 2);
}

function handleListPlatforms(): string {
  const platforms = getAvailablePlatforms();
  const platformInfo = {
    platforms,
    details: {
      meta: {
        name: 'Meta Ad Library',
        url: 'https://www.facebook.com/ads/library/',
        api: 'Graph API ads_archive (requires approved app)',
        capabilities: ['ad copy', 'targeting demographics', 'spend estimates', 'impressions']
      },
      tiktok: {
        name: 'TikTok Commercial Content Library',
        url: 'https://library.tiktok.com/ads',
        api: 'Commercial Content API (requires approved access)',
        capabilities: ['ad copy', 'video content', 'reach metrics', 'targeting']
      },
      google: {
        name: 'Google Ads Transparency Center',
        url: 'https://adstransparency.google.com',
        api: 'No official API - uses SerpApi or SearchAPI.io',
        capabilities: ['ad copy', 'ad formats', 'regions', 'date ranges']
      },
      linkedin: {
        name: 'LinkedIn Ad Library',
        url: 'https://www.linkedin.com/ad-library/',
        api: 'No official API - uses SearchAPI.io or Apify',
        capabilities: ['ad copy', 'targeting criteria', 'impressions']
      }
    }
  };

  return JSON.stringify(platformInfo, null, 2);
}

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case 'extract_competitor_ads': {
        const input = ExtractAdsInputSchema.parse(args);
        result = await handleExtractAds(input);
        break;
      }
      case 'analyze_competitor_ads': {
        const input = AnalyzeAdsInputSchema.parse(args);
        result = await handleAnalyzeAds(input);
        break;
      }
      case 'analyze_landing_page': {
        const input = AnalyzeLandingPageInputSchema.parse(args);
        result = await handleAnalyzeLandingPage(input);
        break;
      }
      case 'categorize_ads': {
        const input = CategorizeAdsInputSchema.parse(args);
        result = await handleCategorizeAds(input);
        break;
      }
      case 'analyze_ad_copy': {
        const input = AnalyzeCopyInputSchema.parse(args);
        result = await handleAnalyzeCopy(input);
        break;
      }
      case 'list_platforms': {
        result = handleListPlatforms();
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: result }]
    };
  } catch (error) {
    const err = error as Error;
    logger.error(`Tool error (${name}): ${err.message}`);

    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true
    };
  }
});

// Main entry point
async function main() {
  logger.info('Starting Ad Extractor MCP Server...');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP Server connected and ready');
}

main().catch((error) => {
  logger.error(`Server error: ${error.message}`);
  process.exit(1);
});
