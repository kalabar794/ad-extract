export { JsonReporter, generateJsonReport } from './json';
export { MarkdownReporter, generateMarkdownReport } from './markdown';
export { HtmlReporter, generateHtmlReport } from './html';
export { ExecutiveSummaryGenerator, generateExecutiveSummary } from './executive-summary';
export { IntelligenceReportGenerator, generateIntelligenceReport } from './intelligence-report';

import { Ad } from '../types/ad';
import { CompetitorAnalysis, ExecutiveSummary } from '../types/analysis';
import { OutputConfig } from '../types/config';
import { JsonReporter } from './json';
import { MarkdownReporter } from './markdown';
import { HtmlReporter } from './html';
import { ExecutiveSummaryGenerator } from './executive-summary';
import { IntelligenceReportGenerator } from './intelligence-report';
import { CampaignAnalyzer } from '../analyzers/campaign-analyzer';
import { createLogger } from '../utils/logger';

const logger = createLogger('reporter');

export interface ReportResult {
  format: string;
  path: string;
}

/**
 * Generate all configured reports
 */
export async function generateReports(
  competitor: string,
  ads: Ad[],
  analysis: CompetitorAnalysis,
  config: OutputConfig
): Promise<ReportResult[]> {
  const results: ReportResult[] = [];

  // Generate executive summary if enabled
  let summary: ExecutiveSummary | undefined;
  if (config.generateExecutiveSummary) {
    const summaryGenerator = new ExecutiveSummaryGenerator();
    summary = summaryGenerator.generate(competitor, ads, analysis);
    logger.info('Executive summary generated');
  }

  // Generate reports in each requested format
  for (const format of config.formats) {
    try {
      let path: string;

      switch (format) {
        case 'json':
          const jsonReporter = new JsonReporter({ outputDir: config.directory });
          path = await jsonReporter.save(competitor, ads, analysis, summary);
          break;

        case 'markdown':
          const mdReporter = new MarkdownReporter({ outputDir: config.directory });
          path = await mdReporter.save(competitor, ads, analysis, summary);
          break;

        case 'html':
          const htmlReporter = new HtmlReporter({ outputDir: config.directory });
          path = await htmlReporter.save(competitor, ads, analysis, summary);
          break;

        case 'intelligence':
          // Generate campaign-based intelligence report (like Marketly)
          const campaignAnalyzer = new CampaignAnalyzer();
          const campaignAnalysis = campaignAnalyzer.analyze(competitor, ads);
          const intelligenceReporter = new IntelligenceReportGenerator({ outputDir: config.directory });
          path = await intelligenceReporter.save(campaignAnalysis);
          break;

        case 'excel':
          // TODO: Implement Excel reporter
          logger.warn('Excel reporter not yet implemented');
          continue;

        case 'pdf':
          // TODO: Implement PDF reporter
          logger.warn('PDF reporter not yet implemented');
          continue;

        default:
          logger.warn(`Unknown report format: ${format}`);
          continue;
      }

      results.push({ format, path });
      logger.info(`Generated ${format} report: ${path}`);
    } catch (error) {
      logger.error(`Failed to generate ${format} report: ${(error as Error).message}`);
    }
  }

  return results;
}
