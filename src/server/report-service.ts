/**
 * Report Generation Service
 * Handles report job management, generation, and webhook delivery
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  ReportJob,
  ReportJobStatus,
  ReportFormat,
  ReportOptions,
  ReportOutput,
  ReportMetadata,
  ReportError,
  ReportErrorCodes,
  WebhookConfig,
  WebhookPayload,
  GenerateReportRequest,
  GenerateReportResponse,
  ReportStatusResponse,
  ListReportsQuery,
  ListReportsResponse,
  PaginationInfo,
  BatchGenerateRequest,
  BatchGenerateResponse,
  BatchStatus,
  ReportTemplate,
  DEFAULT_TEMPLATES,
  ReportFileInfo,
} from '../types/report';
import { Ad, defaultConfig } from '../types';
import { generateReports } from '../reporters';
import { analyzeCompetitor, categorizeAds } from '../analyzers';
import { CampaignAnalyzer } from '../analyzers/campaign-analyzer';
import { IntelligenceReportGenerator } from '../reporters/intelligence-report';
import { createLogger } from '../utils/logger';

const logger = createLogger('report-service');

// ============================================================================
// Report Job Store
// ============================================================================

class ReportJobStore {
  private jobs = new Map<string, ReportJob>();
  private batches = new Map<string, BatchStatus>();

  generateId(): string {
    return `rpt_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
  }

  generateBatchId(): string {
    return `batch_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
  }

  create(job: ReportJob): void {
    this.jobs.set(job.id, job);
  }

  get(id: string): ReportJob | undefined {
    return this.jobs.get(id);
  }

  update(id: string, updates: Partial<ReportJob>): ReportJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    Object.assign(job, updates);
    return job;
  }

  delete(id: string): boolean {
    return this.jobs.delete(id);
  }

  list(query: ListReportsQuery): { jobs: ReportJob[]; total: number } {
    let jobs = Array.from(this.jobs.values());

    // Apply filters
    if (query.competitor) {
      jobs = jobs.filter(j => j.competitor.toLowerCase().includes(query.competitor!.toLowerCase()));
    }
    if (query.format) {
      jobs = jobs.filter(j => j.formats.includes(query.format!));
    }
    if (query.status) {
      jobs = jobs.filter(j => j.status === query.status);
    }
    if (query.from) {
      const fromDate = new Date(query.from);
      jobs = jobs.filter(j => new Date(j.createdAt) >= fromDate);
    }
    if (query.to) {
      const toDate = new Date(query.to);
      jobs = jobs.filter(j => new Date(j.createdAt) <= toDate);
    }

    // Sort
    const sortField = query.sort || 'createdAt';
    const sortOrder = query.order || 'desc';
    jobs.sort((a, b) => {
      const aVal = sortField === 'createdAt' ? new Date(a.createdAt).getTime() : a.competitor;
      const bVal = sortField === 'createdAt' ? new Date(b.createdAt).getTime() : b.competitor;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = jobs.length;

    // Paginate
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const start = (page - 1) * limit;
    jobs = jobs.slice(start, start + limit);

    return { jobs, total };
  }

  // Batch operations
  createBatch(batch: BatchStatus): void {
    this.batches.set(batch.batchId, batch);
  }

  getBatch(id: string): BatchStatus | undefined {
    return this.batches.get(id);
  }

  updateBatch(id: string, updates: Partial<BatchStatus>): BatchStatus | undefined {
    const batch = this.batches.get(id);
    if (!batch) return undefined;
    Object.assign(batch, updates);
    return batch;
  }
}

// ============================================================================
// Webhook Service
// ============================================================================

class WebhookService {
  private readonly maxRetries = 3;
  private readonly backoffMs = [1000, 5000, 30000];

  async deliver(config: WebhookConfig, payload: WebhookPayload): Promise<boolean> {
    // Sign the payload if secret is configured
    if (config.secret) {
      payload.signature = this.sign(payload, config.secret);
    }

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': payload.signature || '',
            'X-Webhook-Event': payload.event,
            ...config.headers,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          logger.info(`Webhook delivered successfully to ${config.url}`);
          return true;
        }

        logger.warn(`Webhook delivery failed (${response.status}), attempt ${attempt + 1}/${this.maxRetries}`);
      } catch (error) {
        logger.warn(`Webhook delivery error: ${(error as Error).message}, attempt ${attempt + 1}/${this.maxRetries}`);
      }

      if (attempt < this.maxRetries - 1) {
        await this.sleep(this.backoffMs[attempt]);
      }
    }

    logger.error(`Webhook delivery failed after ${this.maxRetries} attempts`);
    return false;
  }

  private sign(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload.data));
    return hmac.digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Report Generation Service
// ============================================================================

export class ReportService extends EventEmitter {
  private store = new ReportJobStore();
  private webhookService = new WebhookService();
  private outputDir: string;

  constructor(outputDir?: string) {
    super();
    this.outputDir = outputDir || defaultConfig.output.directory;
  }

  // --------------------------------------------------------------------------
  // Report Generation
  // --------------------------------------------------------------------------

  async createReportJob(request: GenerateReportRequest): Promise<GenerateReportResponse> {
    const jobId = this.store.generateId();
    const now = new Date().toISOString();

    const job: ReportJob = {
      id: jobId,
      status: 'queued',
      competitor: request.competitor,
      formats: request.formats,
      options: request.options || {},
      progress: 0,
      message: 'Report queued',
      createdAt: now,
      sourceType: request.source || 'ads',
      sourceId: request.sourceData?.jobId,
      sourceAds: request.sourceData?.ads,
      webhook: request.webhook,
    };

    this.store.create(job);
    this.emit('job:created', job);

    // Start processing in background
    this.processReportJob(jobId);

    // Estimate duration based on formats and options
    const estimatedDuration = this.estimateDuration(request);

    return {
      reportJobId: jobId,
      status: 'queued',
      estimatedDuration,
      formats: request.formats,
      createdAt: now,
      links: {
        status: `/api/v1/reports/${jobId}`,
        cancel: `/api/v1/reports/${jobId}/cancel`,
      },
    };
  }

  private estimateDuration(request: GenerateReportRequest): number {
    // Base: 2 seconds per format
    let duration = request.formats.length * 2000;

    // Add time for analysis options
    if (request.options?.includeCampaignAnalysis) duration += 3000;
    if (request.options?.includeSentimentAnalysis) duration += 2000;
    if (request.options?.includeLandingPageAnalysis) duration += 5000;

    // PDF takes longer
    if (request.formats.includes('pdf')) duration += 5000;

    return duration;
  }

  private async processReportJob(jobId: string): Promise<void> {
    const job = this.store.get(jobId);
    if (!job) return;

    try {
      // Update status to processing
      this.store.update(jobId, {
        status: 'processing',
        startedAt: new Date().toISOString(),
        message: 'Starting report generation...',
      });
      this.emit('job:updated', job);
      await this.sendWebhookProgress(job);

      // Get ads from source
      let ads: Ad[] = [];
      if (job.sourceAds && job.sourceAds.length > 0) {
        ads = job.sourceAds;
      } else {
        // No ads provided - return error
        throw new Error('No ads provided for report generation');
      }

      // Update progress
      this.updateProgress(jobId, 10, 'Categorizing ads...');

      // Categorize ads
      const categorizedAds = categorizeAds(ads);

      // Update progress
      this.updateProgress(jobId, 30, 'Running analysis...');

      // Run analysis
      const analysis = analyzeCompetitor(job.competitor, categorizedAds);

      // Generate reports
      const outputs: ReportOutput[] = [];
      const totalFormats = job.formats.length;
      let completedFormats = 0;

      for (const format of job.formats) {
        this.store.update(jobId, {
          currentFormat: format,
          message: `Generating ${format} report...`,
        });

        const progressBase = 30 + ((completedFormats / totalFormats) * 60);
        this.updateProgress(jobId, progressBase, `Generating ${format} report...`);

        try {
          const output = await this.generateSingleFormat(
            job.competitor,
            categorizedAds,
            analysis,
            format,
            job.options
          );
          if (output) {
            outputs.push(output);
          }
        } catch (error) {
          logger.error(`Failed to generate ${format} report: ${(error as Error).message}`);
        }

        completedFormats++;
      }

      // Calculate metadata
      const metadata: ReportMetadata = {
        totalAds: ads.length,
        campaigns: Object.keys(analysis.categoryBreakdown).length,
        platforms: [...new Set(ads.map(a => a.platform))],
        dateRange: {
          earliest: ads.length > 0 ? this.findEarliestDate(ads) : undefined,
          latest: ads.length > 0 ? this.findLatestDate(ads) : undefined,
        },
        analysisDate: new Date().toISOString(),
        processingTime: Date.now() - new Date(job.startedAt!).getTime(),
      };

      // Complete the job
      const updatedJob = this.store.update(jobId, {
        status: 'completed',
        progress: 100,
        message: 'Report generation complete',
        completedAt: new Date().toISOString(),
        outputs,
        metadata,
        currentFormat: undefined,
        sourceAds: undefined, // Clear to free memory
      });

      this.emit('job:completed', updatedJob);
      await this.sendWebhookCompleted(updatedJob!);

      logger.info(`Report job ${jobId} completed: ${outputs.length} outputs generated`);
    } catch (error) {
      const reportError: ReportError = {
        code: ReportErrorCodes.GENERATION_FAILED,
        message: (error as Error).message,
        retryable: true,
      };

      const updatedJob = this.store.update(jobId, {
        status: 'failed',
        message: 'Report generation failed',
        completedAt: new Date().toISOString(),
        error: reportError,
        sourceAds: undefined,
      });

      if (updatedJob) {
        this.emit('job:failed', updatedJob);
        await this.sendWebhookFailed(updatedJob);
      }

      logger.error(`Report job ${jobId} failed: ${(error as Error).message}`);
    }
  }

  private async generateSingleFormat(
    competitor: string,
    ads: Ad[],
    analysis: any,
    format: ReportFormat,
    options: ReportOptions
  ): Promise<ReportOutput | null> {
    const outputDir = this.outputDir;
    const timestamp = new Date().toISOString().split('T')[0];
    let filepath: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json': {
        const { JsonReporter } = await import('../reporters/json');
        const reporter = new JsonReporter({ outputDir });
        filepath = await reporter.save(competitor, ads, analysis);
        filename = path.basename(filepath);
        mimeType = 'application/json';
        break;
      }

      case 'markdown': {
        const { MarkdownReporter } = await import('../reporters/markdown');
        const reporter = new MarkdownReporter({ outputDir });
        filepath = await reporter.save(competitor, ads, analysis);
        filename = path.basename(filepath);
        mimeType = 'text/markdown';
        break;
      }

      case 'html': {
        const { HtmlReporter } = await import('../reporters/html');
        const reporter = new HtmlReporter({ outputDir });
        filepath = await reporter.save(competitor, ads, analysis);
        filename = path.basename(filepath);
        mimeType = 'text/html';
        break;
      }

      case 'intelligence': {
        const campaignAnalyzer = new CampaignAnalyzer();
        const campaignAnalysis = campaignAnalyzer.analyze(competitor, ads);
        const reporter = new IntelligenceReportGenerator({
          outputDir,
          branding: options.customBranding,
        });
        filepath = await reporter.save(campaignAnalysis);
        filename = path.basename(filepath);
        mimeType = 'text/html';
        break;
      }

      case 'excel':
        logger.warn('Excel reporter not yet implemented');
        return null;

      case 'pdf':
        logger.warn('PDF reporter not yet implemented');
        return null;

      default:
        logger.warn(`Unknown format: ${format}`);
        return null;
    }

    const stats = fs.statSync(filepath);

    return {
      format,
      filename,
      filepath,
      size: stats.size,
      mimeType,
      downloadUrl: `/api/v1/reports/${this.store.generateId()}/download/${format}`,
      generatedAt: new Date().toISOString(),
    };
  }

  private updateProgress(jobId: string, progress: number, message: string): void {
    const job = this.store.update(jobId, { progress, message });
    if (job) {
      this.emit('job:progress', { jobId, progress, message });
    }
  }

  private findEarliestDate(ads: Ad[]): string | undefined {
    const dates = ads.filter(a => a.startDate).map(a => new Date(a.startDate!).getTime());
    if (dates.length === 0) return undefined;
    return new Date(Math.min(...dates)).toISOString();
  }

  private findLatestDate(ads: Ad[]): string | undefined {
    const dates = ads.filter(a => a.startDate).map(a => new Date(a.startDate!).getTime());
    if (dates.length === 0) return undefined;
    return new Date(Math.max(...dates)).toISOString();
  }

  // --------------------------------------------------------------------------
  // Webhook Helpers
  // --------------------------------------------------------------------------

  private async sendWebhookProgress(job: ReportJob): Promise<void> {
    if (!job.webhook || !job.webhook.events.includes('progress')) return;

    const payload: WebhookPayload = {
      event: 'report.progress',
      timestamp: new Date().toISOString(),
      data: {
        reportJobId: job.id,
        competitor: job.competitor,
        status: job.status,
        progress: job.progress,
        message: job.message,
      },
    };

    await this.webhookService.deliver(job.webhook, payload);
  }

  private async sendWebhookCompleted(job: ReportJob): Promise<void> {
    if (!job.webhook || !job.webhook.events.includes('completed')) return;

    const payload: WebhookPayload = {
      event: 'report.completed',
      timestamp: new Date().toISOString(),
      data: {
        reportJobId: job.id,
        competitor: job.competitor,
        status: job.status,
        outputs: job.outputs,
      },
    };

    await this.webhookService.deliver(job.webhook, payload);
  }

  private async sendWebhookFailed(job: ReportJob): Promise<void> {
    if (!job.webhook || !job.webhook.events.includes('failed')) return;

    const payload: WebhookPayload = {
      event: 'report.failed',
      timestamp: new Date().toISOString(),
      data: {
        reportJobId: job.id,
        competitor: job.competitor,
        status: job.status,
        error: job.error,
      },
    };

    await this.webhookService.deliver(job.webhook, payload);
  }

  // --------------------------------------------------------------------------
  // Job Management
  // --------------------------------------------------------------------------

  getJob(jobId: string): ReportJob | undefined {
    return this.store.get(jobId);
  }

  getJobStatus(jobId: string): ReportStatusResponse | undefined {
    const job = this.store.get(jobId);
    if (!job) return undefined;

    return {
      reportJobId: job.id,
      status: job.status,
      competitor: job.competitor,
      formats: job.formats,
      progress: job.progress,
      message: job.message,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      outputs: job.outputs,
      metadata: job.metadata,
      error: job.error,
    };
  }

  listJobs(query: ListReportsQuery): ListReportsResponse {
    const { jobs, total } = this.store.list(query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(total / limit);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    const data: ReportStatusResponse[] = jobs.map(job => ({
      reportJobId: job.id,
      status: job.status,
      competitor: job.competitor,
      formats: job.formats,
      progress: job.progress,
      message: job.message,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      outputs: job.outputs,
      metadata: job.metadata,
      error: job.error,
    }));

    return { data, pagination };
  }

  cancelJob(jobId: string): ReportJob | undefined {
    const job = this.store.get(jobId);
    if (!job) return undefined;

    if (job.status !== 'queued' && job.status !== 'processing') {
      return undefined; // Can't cancel completed/failed/cancelled jobs
    }

    const updatedJob = this.store.update(jobId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      message: 'Job cancelled by user',
      sourceAds: undefined,
    });

    this.emit('job:cancelled', updatedJob);
    return updatedJob;
  }

  deleteJob(jobId: string): boolean {
    const job = this.store.get(jobId);
    if (!job) return false;

    // Delete associated files
    if (job.outputs) {
      for (const output of job.outputs) {
        try {
          if (fs.existsSync(output.filepath)) {
            fs.unlinkSync(output.filepath);
          }
        } catch (error) {
          logger.warn(`Failed to delete file ${output.filepath}: ${(error as Error).message}`);
        }
      }
    }

    return this.store.delete(jobId);
  }

  // --------------------------------------------------------------------------
  // Batch Generation
  // --------------------------------------------------------------------------

  async createBatch(request: BatchGenerateRequest): Promise<BatchGenerateResponse> {
    const batchId = this.store.generateBatchId();
    const now = new Date().toISOString();
    const jobs: { competitor: string; reportJobId: string; status: ReportJobStatus }[] = [];

    for (const competitor of request.competitors) {
      const response = await this.createReportJob({
        competitor,
        formats: request.formats,
        options: request.options,
        webhook: request.webhook,
      });

      jobs.push({
        competitor,
        reportJobId: response.reportJobId,
        status: 'queued',
      });
    }

    const batch: BatchStatus = {
      batchId,
      status: 'processing',
      jobs,
      completedCount: 0,
      totalCount: request.competitors.length,
      createdAt: now,
    };

    this.store.createBatch(batch);

    // Track batch completion
    this.trackBatchCompletion(batchId);

    return {
      batchId,
      jobs,
      statusUrl: `/api/v1/reports/batch/${batchId}`,
      createdAt: now,
    };
  }

  private async trackBatchCompletion(batchId: string): Promise<void> {
    const checkInterval = setInterval(() => {
      const batch = this.store.getBatch(batchId);
      if (!batch) {
        clearInterval(checkInterval);
        return;
      }

      let completedCount = 0;
      let failedCount = 0;

      for (const jobStatus of batch.jobs) {
        const job = this.store.get(jobStatus.reportJobId);
        if (job) {
          jobStatus.status = job.status;
          if (job.status === 'completed') completedCount++;
          if (job.status === 'failed') failedCount++;
        }
      }

      batch.completedCount = completedCount + failedCount;

      if (batch.completedCount === batch.totalCount) {
        batch.status = failedCount > 0 ? (completedCount > 0 ? 'partial' : 'failed') : 'completed';
        batch.completedAt = new Date().toISOString();
        clearInterval(checkInterval);
      }
    }, 1000);
  }

  getBatchStatus(batchId: string): BatchStatus | undefined {
    return this.store.getBatch(batchId);
  }

  // --------------------------------------------------------------------------
  // Templates
  // --------------------------------------------------------------------------

  getTemplates(): ReportTemplate[] {
    return DEFAULT_TEMPLATES;
  }

  getTemplate(templateId: string): ReportTemplate | undefined {
    return DEFAULT_TEMPLATES.find(t => t.id === templateId);
  }

  // --------------------------------------------------------------------------
  // File Management (for existing reports)
  // --------------------------------------------------------------------------

  listReportFiles(query: ListReportsQuery): { files: ReportFileInfo[]; total: number } {
    if (!fs.existsSync(this.outputDir)) {
      return { files: [], total: 0 };
    }

    let files = fs.readdirSync(this.outputDir)
      .filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.json', '.md', '.html', '.pdf', '.xlsx'].includes(ext);
      })
      .map(f => {
        const filepath = path.join(this.outputDir, f);
        const stats = fs.statSync(filepath);
        const ext = path.extname(f).toLowerCase();

        let format = 'unknown';
        let mimeType = 'application/octet-stream';

        switch (ext) {
          case '.json':
            format = 'json';
            mimeType = 'application/json';
            break;
          case '.md':
            format = 'markdown';
            mimeType = 'text/markdown';
            break;
          case '.html':
            format = 'html';
            mimeType = 'text/html';
            break;
          case '.pdf':
            format = 'pdf';
            mimeType = 'application/pdf';
            break;
          case '.xlsx':
            format = 'excel';
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;
        }

        // Try to extract competitor name from filename
        const competitor = f.split('_')[0];

        return {
          name: f,
          path: filepath,
          format,
          size: stats.size,
          mimeType,
          modified: stats.mtime,
          competitor,
        };
      });

    // Apply filters
    if (query.competitor) {
      files = files.filter(f =>
        f.competitor?.toLowerCase().includes(query.competitor!.toLowerCase()) ||
        f.name.toLowerCase().includes(query.competitor!.toLowerCase())
      );
    }
    if (query.format) {
      files = files.filter(f => f.format === query.format);
    }
    if (query.from) {
      const fromDate = new Date(query.from);
      files = files.filter(f => f.modified >= fromDate);
    }
    if (query.to) {
      const toDate = new Date(query.to);
      files = files.filter(f => f.modified <= toDate);
    }

    // Sort
    const sortOrder = query.order || 'desc';
    files.sort((a, b) => {
      const aTime = a.modified.getTime();
      const bTime = b.modified.getTime();
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });

    const total = files.length;

    // Paginate
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const start = (page - 1) * limit;
    files = files.slice(start, start + limit);

    return { files, total };
  }

  deleteReportFile(filename: string): boolean {
    const filepath = path.join(this.outputDir, filename);

    // Security check - ensure file is within output directory
    const resolvedPath = path.resolve(filepath);
    const resolvedOutputDir = path.resolve(this.outputDir);
    if (!resolvedPath.startsWith(resolvedOutputDir)) {
      logger.warn(`Attempted to delete file outside output directory: ${filename}`);
      return false;
    }

    if (!fs.existsSync(filepath)) {
      return false;
    }

    try {
      fs.unlinkSync(filepath);
      logger.info(`Deleted report file: ${filename}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file ${filename}: ${(error as Error).message}`);
      return false;
    }
  }

  getReportFile(filename: string): { filepath: string; mimeType: string } | undefined {
    const filepath = path.join(this.outputDir, filename);

    // Security check
    const resolvedPath = path.resolve(filepath);
    const resolvedOutputDir = path.resolve(this.outputDir);
    if (!resolvedPath.startsWith(resolvedOutputDir)) {
      return undefined;
    }

    if (!fs.existsSync(filepath)) {
      return undefined;
    }

    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'application/octet-stream';

    switch (ext) {
      case '.json':
        mimeType = 'application/json';
        break;
      case '.md':
        mimeType = 'text/markdown';
        break;
      case '.html':
        mimeType = 'text/html';
        break;
      case '.pdf':
        mimeType = 'application/pdf';
        break;
      case '.xlsx':
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
    }

    return { filepath, mimeType };
  }
}

// Export singleton instance
export const reportService = new ReportService();
