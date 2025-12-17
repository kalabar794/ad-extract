import express from 'express';
import cors from 'cors';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

import { getExtractor, getAvailablePlatforms } from '../extractors';
import { analyzeCompetitor, categorizeAds } from '../analyzers';
import { generateReports } from '../reporters';
import { generateStrategicAnalysis, StrategicAnalysis } from '../analyzers/strategic-intelligence';
import { generateStrategicReportHTML, saveStrategicReport } from '../reporters/strategic-report';
import { closeBrowser } from '../utils/browser';
import { defaultConfig, AppConfig, Platform, Ad } from '../types';
import {
  ListReportsQuery,
  GenerateReportRequest,
  BatchGenerateRequest,
  ReportErrorCodes,
} from '../types/report';
import { reportService } from './report-service';
import { createLogger } from '../utils/logger';

const logger = createLogger('server');

interface ServerConfig {
  port: number;
  host: string;
}

interface Job {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  competitor: string;
  platforms: string[];
  progress: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  result?: {
    totalAds: number;
    reports: string[];
    strategicAnalysis?: StrategicAnalysis;
  };
  error?: string;
}

// Store active jobs
const jobs = new Map<string, Job>();

// WebSocket clients
const wsClients = new Set<WebSocket>();

export async function startServer(config: ServerConfig): Promise<void> {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Serve static files - handle both dev (src/web) and built (dist/../src/web) paths
  const webDir = path.join(__dirname, '../../src/web');
  app.use(express.static(webDir));

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    wsClients.add(ws);

    ws.on('close', () => {
      wsClients.delete(ws);
      logger.info('WebSocket client disconnected');
    });
  });

  // Broadcast to all WebSocket clients
  function broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data });
    wsClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // API Routes

  // Get available platforms
  app.get('/api/platforms', (req, res) => {
    res.json({
      available: getAvailablePlatforms(),
      all: ['meta', 'tiktok', 'google', 'linkedin']
    });
  });

  // Start extraction job
  app.post('/api/extract', async (req, res) => {
    const {
      competitor,
      platforms = ['meta'],
      maxAds = 50,
      country = 'US',
      screenshots = false,
      formats = ['json', 'markdown']
    } = req.body;

    if (!competitor) {
      return res.status(400).json({ error: 'Competitor name is required' });
    }

    // Create job
    const jobId = uuidv4();
    const job: Job = {
      id: jobId,
      status: 'pending',
      competitor,
      platforms,
      progress: 0,
      message: 'Job queued',
      startedAt: new Date().toISOString()
    };

    jobs.set(jobId, job);
    broadcast('job:created', job);

    res.json({ jobId, status: 'created' });

    // Run extraction in background
    runExtraction(jobId, {
      competitor,
      platforms: platforms as Platform[],
      maxAds,
      country,
      screenshots,
      formats: formats as ('json' | 'markdown' | 'html' | 'intelligence' | 'excel' | 'pdf')[]
    });
  });

  // Get job status
  app.get('/api/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  });

  // Get all jobs
  app.get('/api/jobs', (req, res) => {
    res.json(Array.from(jobs.values()).reverse());
  });

  // Get reports list (with pagination support)
  app.get('/api/reports', async (req, res) => {
    try {
      const query: ListReportsQuery = {
        competitor: req.query.competitor as string,
        format: req.query.format as any,
        from: req.query.from as string,
        to: req.query.to as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sort: (req.query.sort as 'createdAt' | 'competitor') || 'createdAt',
        order: (req.query.order as 'asc' | 'desc') || 'desc',
      };

      const { files, total } = reportService.listReportFiles(query);
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);
      const totalPages = Math.ceil(total / limit);

      res.json({
        data: files,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Delete a report file
  app.delete('/api/reports/:filename', (req, res) => {
    const filename = req.params.filename;
    const deleted = reportService.deleteReportFile(filename);

    if (!deleted) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.status(204).send();
  });

  // Download or view report
  app.get('/api/reports/:filename', async (req, res) => {
    const filename = req.params.filename;
    const outputDir = defaultConfig.output.directory;
    const filepath = path.join(outputDir, filename);

    // Security: Prevent path traversal attacks
    const resolvedPath = path.resolve(filepath);
    const resolvedOutputDir = path.resolve(outputDir);
    if (!resolvedPath.startsWith(resolvedOutputDir + path.sep) && resolvedPath !== resolvedOutputDir) {
      logger.warn(`Path traversal attempt blocked: ${filename}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    const fs = await import('fs');

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Serve HTML files directly for viewing, download others
    if (req.params.filename.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
      res.sendFile(filepath);
    } else if (req.params.filename.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filepath);
    } else {
      res.download(filepath);
    }
  });

  // Generate strategic report
  app.post('/api/strategic-report', async (req, res) => {
    const { ads, competitor } = req.body;

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return res.status(400).json({ error: 'Ads array is required' });
    }

    if (!competitor) {
      return res.status(400).json({ error: 'Competitor name is required' });
    }

    try {
      // Generate strategic analysis
      const analysis = generateStrategicAnalysis(competitor, ads);

      // Generate HTML report
      const html = generateStrategicReportHTML(analysis);

      // Save reports
      const reports = await saveStrategicReport(analysis, defaultConfig.output.directory);

      res.json({
        success: true,
        analysis,
        reports,
        html
      });
    } catch (error) {
      logger.error(`Strategic report error: ${(error as Error).message}`);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // =========================================================================
  // API v1 - Report Generation API (Enhanced Features)
  // =========================================================================

  // Setup WebSocket event forwarding for report jobs
  reportService.on('job:created', (job) => broadcast('report:created', job));
  reportService.on('job:updated', (job) => broadcast('report:updated', job));
  reportService.on('job:progress', (data) => broadcast('report:progress', data));
  reportService.on('job:completed', (job) => broadcast('report:completed', job));
  reportService.on('job:failed', (job) => broadcast('report:failed', job));
  reportService.on('job:cancelled', (job) => broadcast('report:cancelled', job));

  // Generate Report (async)
  app.post('/api/v1/reports/generate', async (req, res) => {
    try {
      const request: GenerateReportRequest = req.body;

      // Validate required fields
      if (!request.competitor) {
        return res.status(400).json({
          error: { code: ReportErrorCodes.INVALID_REQUEST, message: 'Competitor is required' },
        });
      }
      if (!request.formats || request.formats.length === 0) {
        return res.status(400).json({
          error: { code: ReportErrorCodes.INVALID_REQUEST, message: 'At least one format is required' },
        });
      }

      // Check for ads in source data
      if (!request.sourceData?.ads || request.sourceData.ads.length === 0) {
        return res.status(400).json({
          error: { code: ReportErrorCodes.INVALID_SOURCE, message: 'Ads array is required in sourceData' },
        });
      }

      const response = await reportService.createReportJob(request);
      res.status(202).json(response);
    } catch (error) {
      logger.error(`Report generation error: ${(error as Error).message}`);
      res.status(500).json({
        error: { code: ReportErrorCodes.GENERATION_FAILED, message: (error as Error).message },
      });
    }
  });

  // List Report Jobs
  app.get('/api/v1/reports', (req, res) => {
    try {
      const query: ListReportsQuery = {
        competitor: req.query.competitor as string,
        format: req.query.format as any,
        status: req.query.status as any,
        from: req.query.from as string,
        to: req.query.to as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sort: (req.query.sort as 'createdAt' | 'competitor') || 'createdAt',
        order: (req.query.order as 'asc' | 'desc') || 'desc',
      };

      const response = reportService.listJobs(query);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get Report Job Status
  app.get('/api/v1/reports/:reportId', (req, res) => {
    const status = reportService.getJobStatus(req.params.reportId);

    if (!status) {
      return res.status(404).json({
        error: { code: ReportErrorCodes.REPORT_NOT_FOUND, message: 'Report not found' },
      });
    }

    res.json(status);
  });

  // Cancel Report Job
  app.post('/api/v1/reports/:reportId/cancel', (req, res) => {
    const job = reportService.cancelJob(req.params.reportId);

    if (!job) {
      return res.status(404).json({
        error: { code: ReportErrorCodes.REPORT_NOT_FOUND, message: 'Report not found or cannot be cancelled' },
      });
    }

    res.json({
      reportJobId: job.id,
      status: 'cancelled',
      cancelledAt: job.cancelledAt,
    });
  });

  // Delete Report Job
  app.delete('/api/v1/reports/:reportId', (req, res) => {
    const deleted = reportService.deleteJob(req.params.reportId);

    if (!deleted) {
      return res.status(404).json({
        error: { code: ReportErrorCodes.REPORT_NOT_FOUND, message: 'Report not found' },
      });
    }

    res.status(204).send();
  });

  // Download Report Format
  app.get('/api/v1/reports/:reportId/download/:format', (req, res) => {
    const job = reportService.getJob(req.params.reportId);

    if (!job) {
      return res.status(404).json({
        error: { code: ReportErrorCodes.REPORT_NOT_FOUND, message: 'Report not found' },
      });
    }

    const output = job.outputs?.find(o => o.format === req.params.format);
    if (!output) {
      return res.status(404).json({
        error: { code: ReportErrorCodes.INVALID_FORMAT, message: `Format ${req.params.format} not available` },
      });
    }

    const inline = req.query.inline === 'true';
    const disposition = inline ? 'inline' : 'attachment';

    res.setHeader('Content-Type', output.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${output.filename}"`);
    res.sendFile(output.filepath);
  });

  // Batch Generate Reports
  app.post('/api/v1/reports/batch', async (req, res) => {
    try {
      const request: BatchGenerateRequest = req.body;

      if (!request.competitors || request.competitors.length === 0) {
        return res.status(400).json({
          error: { code: ReportErrorCodes.INVALID_REQUEST, message: 'Competitors array is required' },
        });
      }
      if (!request.formats || request.formats.length === 0) {
        return res.status(400).json({
          error: { code: ReportErrorCodes.INVALID_REQUEST, message: 'At least one format is required' },
        });
      }

      const response = await reportService.createBatch(request);
      res.status(202).json(response);
    } catch (error) {
      res.status(500).json({
        error: { code: ReportErrorCodes.GENERATION_FAILED, message: (error as Error).message },
      });
    }
  });

  // Get Batch Status
  app.get('/api/v1/reports/batch/:batchId', (req, res) => {
    const batch = reportService.getBatchStatus(req.params.batchId);

    if (!batch) {
      return res.status(404).json({
        error: { code: ReportErrorCodes.REPORT_NOT_FOUND, message: 'Batch not found' },
      });
    }

    res.json(batch);
  });

  // List Templates
  app.get('/api/v1/reports/templates', (req, res) => {
    res.json({ templates: reportService.getTemplates() });
  });

  // Get Template Details
  app.get('/api/v1/reports/templates/:templateId', (req, res) => {
    const template = reportService.getTemplate(req.params.templateId);

    if (!template) {
      return res.status(404).json({
        error: { code: ReportErrorCodes.TEMPLATE_NOT_FOUND, message: 'Template not found' },
      });
    }

    res.json(template);
  });

  // Analysis endpoints

  // Campaign Analysis
  app.post('/api/v1/analysis/campaigns', async (req, res) => {
    try {
      const { competitor, ads, options } = req.body;

      if (!competitor || !ads || ads.length === 0) {
        return res.status(400).json({
          error: { code: ReportErrorCodes.INVALID_REQUEST, message: 'Competitor and ads are required' },
        });
      }

      const { CampaignAnalyzer } = await import('../analyzers/campaign-analyzer');
      const analyzer = new CampaignAnalyzer();
      const analysis = analyzer.analyze(competitor, categorizeAds(ads));

      res.json(analysis);
    } catch (error) {
      res.status(500).json({
        error: { code: ReportErrorCodes.ANALYSIS_FAILED, message: (error as Error).message },
      });
    }
  });

  // Copy Analysis
  app.post('/api/v1/analysis/copy', async (req, res) => {
    try {
      const { ads } = req.body;

      if (!ads || ads.length === 0) {
        return res.status(400).json({
          error: { code: ReportErrorCodes.INVALID_REQUEST, message: 'Ads array is required' },
        });
      }

      const { CopyAnalyzer } = await import('../analyzers/copy-analyzer');
      const analyzer = new CopyAnalyzer();
      const analysis = analyzer.analyze(ads);

      res.json(analysis);
    } catch (error) {
      res.status(500).json({
        error: { code: ReportErrorCodes.ANALYSIS_FAILED, message: (error as Error).message },
      });
    }
  });

  // Sentiment Analysis
  app.post('/api/v1/analysis/sentiment', async (req, res) => {
    try {
      const { ads, competitor } = req.body;

      if (!ads || ads.length === 0) {
        return res.status(400).json({
          error: { code: ReportErrorCodes.INVALID_REQUEST, message: 'Ads array is required' },
        });
      }

      const { SentimentAnalyzer } = await import('../analyzers/sentiment');
      const analyzer = new SentimentAnalyzer();

      if (competitor) {
        const result = analyzer.analyzeCompetitor(competitor, ads);
        res.json(result);
      } else {
        const analyses = analyzer.analyzeAds(ads);
        res.json({ analyses });
      }
    } catch (error) {
      res.status(500).json({
        error: { code: ReportErrorCodes.ANALYSIS_FAILED, message: (error as Error).message },
      });
    }
  });

  // =========================================================================
  // End of API v1
  // =========================================================================

  // Serve the main HTML page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../src/web/index.html'));
  });

  type OutputFormat = 'json' | 'markdown' | 'html' | 'intelligence' | 'excel' | 'pdf';

  interface ExtractionJobOptions {
    competitor: string;
    platforms: Platform[];
    maxAds: number;
    country: string;
    screenshots: boolean;
    formats: OutputFormat[];
  }

  // Run extraction job
  async function runExtraction(jobId: string, options: ExtractionJobOptions) {
    const job = jobs.get(jobId)!;
    job.status = 'running';
    job.message = 'Starting extraction...';
    broadcast('job:updated', job);

    const allAds: Ad[] = [];

    try {
      const config: Partial<AppConfig> = {
        browser: {
          ...defaultConfig.browser,
          headless: true
        },
        extraction: {
          ...defaultConfig.extraction,
          screenshots: options.screenshots
        },
        output: {
          ...defaultConfig.output,
          formats: options.formats
        }
      };

      const totalPlatforms = options.platforms.length;
      let completedPlatforms = 0;

      for (const platform of options.platforms) {
        const available = getAvailablePlatforms();
        if (!available.includes(platform)) {
          logger.warn(`Platform ${platform} not available, skipping`);
          continue;
        }

        job.message = `Extracting from ${platform}...`;
        broadcast('job:updated', job);

        const extractor = getExtractor(platform, config, {
          onProgress: (message, progress) => {
            const overallProgress = ((completedPlatforms / totalPlatforms) + (progress / 100 / totalPlatforms)) * 70;
            job.progress = Math.round(overallProgress);
            job.message = `[${platform}] ${message}`;
            broadcast('job:progress', { jobId, progress: job.progress, message: job.message });
          }
        });

        const result = await extractor.extract({
          competitor: options.competitor,
          country: options.country,
          maxAds: options.maxAds
        });

        allAds.push(...result.ads);
        completedPlatforms++;

        logger.info(`Extracted ${result.ads.length} ads from ${platform}`);
      }

      if (allAds.length === 0) {
        job.status = 'completed';
        job.progress = 100;
        job.message = 'No ads found';
        job.completedAt = new Date().toISOString();
        job.result = { totalAds: 0, reports: [] };
        broadcast('job:completed', job);
        return;
      }

      // Categorize and analyze
      job.progress = 75;
      job.message = 'Analyzing ads...';
      broadcast('job:progress', { jobId, progress: 75, message: 'Analyzing ads...' });

      const categorizedAds = categorizeAds(allAds);

      // Generate strategic analysis
      job.progress = 80;
      job.message = 'Generating strategic analysis...';
      broadcast('job:progress', { jobId, progress: 80, message: 'Generating strategic analysis...' });

      const strategicAnalysis = generateStrategicAnalysis(options.competitor, categorizedAds);

      // Generate reports (both basic and strategic)
      job.progress = 90;
      job.message = 'Generating reports...';
      broadcast('job:progress', { jobId, progress: 90, message: 'Generating reports...' });

      const basicAnalysis = analyzeCompetitor(options.competitor, categorizedAds);
      const basicReports = await generateReports(
        options.competitor,
        categorizedAds,
        basicAnalysis,
        config.output!
      );

      // Generate strategic report
      const strategicReports = await saveStrategicReport(strategicAnalysis, config.output!.directory);

      // Combine all report paths
      const allReportPaths = [
        ...basicReports.map(r => r.path),
        strategicReports.html,
        strategicReports.json
      ];
      if (strategicReports.pdf) {
        allReportPaths.push(strategicReports.pdf);
      }

      // Complete
      job.status = 'completed';
      job.progress = 100;
      job.message = 'Complete';
      job.completedAt = new Date().toISOString();
      job.result = {
        totalAds: allAds.length,
        reports: allReportPaths,
        strategicAnalysis
      };

      broadcast('job:completed', job);
      logger.info(`Job ${jobId} completed: ${allAds.length} ads, ${allReportPaths.length} reports`);
    } catch (error) {
      job.status = 'failed';
      job.error = (error as Error).message;
      job.message = 'Failed';
      broadcast('job:failed', job);
      logger.error(`Job ${jobId} failed: ${(error as Error).message}`);
    } finally {
      await closeBrowser();
    }
  }

  // Start server
  server.listen(config.port, config.host, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🔍 Competitive Ads Extractor - Web GUI                 ║
║                                                          ║
║   Server running at:                                     ║
║   http://${config.host}:${config.port}                               ║
║                                                          ║
║   Press Ctrl+C to stop                                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);
  });
}

export default startServer;

// Auto-start when run directly
if (require.main === module) {
  startServer({ port: 3000, host: 'localhost' });
}
