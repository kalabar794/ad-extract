import fs from 'fs';
import path from 'path';
import { Ad } from '../types/ad';
import { CompetitorAnalysis, ExecutiveSummary } from '../types/analysis';
import { createLogger } from '../utils/logger';

const logger = createLogger('json-reporter');

export interface JsonReportOptions {
  outputDir: string;
  filename?: string;
  pretty?: boolean;
}

export interface JsonReport {
  metadata: {
    generatedAt: string;
    competitor: string;
    totalAds: number;
    version: string;
  };
  summary?: ExecutiveSummary;
  analysis: CompetitorAnalysis;
  ads: Ad[];
}

export class JsonReporter {
  private options: JsonReportOptions;

  constructor(options: JsonReportOptions) {
    this.options = {
      pretty: true,
      ...options
    };
  }

  /**
   * Generate JSON report
   */
  generate(
    competitor: string,
    ads: Ad[],
    analysis: CompetitorAnalysis,
    summary?: ExecutiveSummary
  ): string {
    const report: JsonReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        competitor,
        totalAds: ads.length,
        version: '1.0.0'
      },
      summary,
      analysis: this.serializeAnalysis(analysis),
      ads
    };

    return this.options.pretty
      ? JSON.stringify(report, null, 2)
      : JSON.stringify(report);
  }

  /**
   * Generate and save JSON report to file
   */
  async save(
    competitor: string,
    ads: Ad[],
    analysis: CompetitorAnalysis,
    summary?: ExecutiveSummary
  ): Promise<string> {
    const json = this.generate(competitor, ads, analysis, summary);

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    const filename = this.options.filename || this.generateFilename(competitor);
    const filepath = path.join(this.options.outputDir, filename);

    fs.writeFileSync(filepath, json, 'utf-8');
    logger.info(`JSON report saved: ${filepath}`);

    return filepath;
  }

  /**
   * Generate filename from competitor name
   */
  private generateFilename(competitor: string): string {
    const sanitized = competitor.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitized}_${timestamp}.json`;
  }

  /**
   * Serialize analysis (convert Maps to objects)
   */
  private serializeAnalysis(analysis: CompetitorAnalysis): CompetitorAnalysis {
    return {
      ...analysis,
      copyAnalysis: {
        ...analysis.copyAnalysis,
        wordFrequency: Object.fromEntries(analysis.copyAnalysis.wordFrequency) as unknown as Map<string, number>,
        ctaDistribution: Object.fromEntries(analysis.copyAnalysis.ctaDistribution) as unknown as Map<string, number>,
        hashtagFrequency: Object.fromEntries(analysis.copyAnalysis.hashtagFrequency) as unknown as Map<string, number>
      }
    };
  }
}

/**
 * Quick JSON generation
 */
export function generateJsonReport(
  competitor: string,
  ads: Ad[],
  analysis: CompetitorAnalysis,
  outputDir: string
): Promise<string> {
  const reporter = new JsonReporter({ outputDir });
  return reporter.save(competitor, ads, analysis);
}
