import express from 'express';
import cors from 'cors';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

import { getExtractor, getAvailablePlatforms } from '../extractors';
import { analyzeCompetitor, categorizeAds } from '../analyzers';
import { generateReports } from '../reporters';
import { closeBrowser } from '../utils/browser';
import { defaultConfig, AppConfig, Platform, Ad } from '../types';
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
      platforms,
      maxAds,
      country,
      screenshots,
      formats
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

  // Get reports list
  app.get('/api/reports', async (req, res) => {
    const fs = await import('fs');
    const outputDir = defaultConfig.output.directory;

    try {
      if (!fs.existsSync(outputDir)) {
        return res.json([]);
      }

      const files = fs.readdirSync(outputDir)
        .filter(f => f.endsWith('.json') || f.endsWith('.md'))
        .map(f => ({
          name: f,
          path: path.join(outputDir, f),
          format: f.endsWith('.json') ? 'json' : 'markdown',
          modified: fs.statSync(path.join(outputDir, f)).mtime
        }))
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());

      res.json(files);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Download report
  app.get('/api/reports/:filename', async (req, res) => {
    const filepath = path.join(defaultConfig.output.directory, req.params.filename);
    const fs = await import('fs');

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.download(filepath);
  });

  // Serve the main HTML page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../src/web/index.html'));
  });

  // Run extraction job
  async function runExtraction(jobId: string, options: any) {
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

        const extractor = getExtractor(platform as Platform, config, {
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
      const analysis = analyzeCompetitor(options.competitor, categorizedAds);

      // Generate reports
      job.progress = 90;
      job.message = 'Generating reports...';
      broadcast('job:progress', { jobId, progress: 90, message: 'Generating reports...' });

      const reports = await generateReports(
        options.competitor,
        categorizedAds,
        analysis,
        config.output!
      );

      // Complete
      job.status = 'completed';
      job.progress = 100;
      job.message = 'Complete';
      job.completedAt = new Date().toISOString();
      job.result = {
        totalAds: allAds.length,
        reports: reports.map(r => r.path)
      };

      broadcast('job:completed', job);
      logger.info(`Job ${jobId} completed: ${allAds.length} ads, ${reports.length} reports`);
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
