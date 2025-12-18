/**
 * Tests for Report Generation API
 */

import { ReportService } from '../server/report-service';
import {
  ReportJobStatus,
  ReportFormat,
  GenerateReportRequest,
  ListReportsQuery,
  DEFAULT_TEMPLATES,
} from '../types/report';
import { Ad, AdCategory } from '../types/ad';

describe('ReportService', () => {
  let reportService: ReportService;

  beforeEach(() => {
    reportService = new ReportService('./test-output');
  });

  // Helper to create mock ads
  function createMockAd(overrides: Partial<Ad> = {}): Ad {
    return {
      id: `ad-${Math.random().toString(36).substring(7)}`,
      competitor: 'TestCompetitor',
      platform: 'meta',
      extractedAt: new Date().toISOString(),
      primaryText: 'This is a test ad with great features.',
      headline: 'Test Headline',
      description: 'Test description',
      cta: 'Learn More',
      hashtags: ['#test'],
      startDate: new Date().toISOString(),
      destinationUrl: 'https://example.com',
      category: AdCategory.PRODUCT_FEATURE,
      ...overrides,
    };
  }

  describe('createReportJob', () => {
    it('should create a report job with valid request', async () => {
      const request: GenerateReportRequest = {
        competitor: 'TestCompetitor',
        formats: ['json'],
        sourceData: {
          ads: [createMockAd()],
        },
      };

      const response = await reportService.createReportJob(request);

      expect(response).toBeDefined();
      expect(response.reportJobId).toMatch(/^rpt_/);
      expect(response.status).toBe('queued');
      expect(response.formats).toEqual(['json']);
      expect(response.links.status).toContain(response.reportJobId);
      expect(response.links.cancel).toContain(response.reportJobId);
    });

    it('should estimate duration based on formats', async () => {
      const simpleRequest: GenerateReportRequest = {
        competitor: 'Test',
        formats: ['json'],
        sourceData: { ads: [createMockAd()] },
      };

      const complexRequest: GenerateReportRequest = {
        competitor: 'Test',
        formats: ['json', 'html', 'intelligence', 'pdf'],
        options: {
          includeCampaignAnalysis: true,
          includeSentimentAnalysis: true,
        },
        sourceData: { ads: [createMockAd()] },
      };

      const simpleResponse = await reportService.createReportJob(simpleRequest);
      const complexResponse = await reportService.createReportJob(complexRequest);

      expect(complexResponse.estimatedDuration).toBeGreaterThan(simpleResponse.estimatedDuration);
    });

    it('should emit job:created event', async () => {
      const eventPromise = new Promise<any>((resolve) => {
        reportService.once('job:created', resolve);
      });

      await reportService.createReportJob({
        competitor: 'Test',
        formats: ['json'],
        sourceData: { ads: [createMockAd()] },
      });

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect(event.competitor).toBe('Test');
    });
  });

  describe('getJob', () => {
    it('should return undefined for non-existent job', () => {
      const job = reportService.getJob('non-existent');
      expect(job).toBeUndefined();
    });

    it('should return job after creation', async () => {
      const response = await reportService.createReportJob({
        competitor: 'Test',
        formats: ['json'],
        sourceData: { ads: [createMockAd()] },
      });

      const job = reportService.getJob(response.reportJobId);
      expect(job).toBeDefined();
      expect(job!.competitor).toBe('Test');
    });
  });

  describe('getJobStatus', () => {
    it('should return formatted status response', async () => {
      const response = await reportService.createReportJob({
        competitor: 'TestCompetitor',
        formats: ['json', 'html'],
        sourceData: { ads: [createMockAd()] },
      });

      const status = reportService.getJobStatus(response.reportJobId);

      expect(status).toBeDefined();
      expect(status!.reportJobId).toBe(response.reportJobId);
      expect(status!.competitor).toBe('TestCompetitor');
      expect(status!.formats).toEqual(['json', 'html']);
      expect(typeof status!.progress).toBe('number');
      expect(status!.message).toBeDefined();
    });
  });

  describe('listJobs', () => {
    beforeEach(async () => {
      // Create multiple jobs for testing
      await reportService.createReportJob({
        competitor: 'CompanyA',
        formats: ['json'],
        sourceData: { ads: [createMockAd({ competitor: 'CompanyA' })] },
      });
      await reportService.createReportJob({
        competitor: 'CompanyB',
        formats: ['html'],
        sourceData: { ads: [createMockAd({ competitor: 'CompanyB' })] },
      });
      await reportService.createReportJob({
        competitor: 'CompanyC',
        formats: ['json', 'html'],
        sourceData: { ads: [createMockAd({ competitor: 'CompanyC' })] },
      });
    });

    it('should return paginated results', () => {
      const query: ListReportsQuery = { page: 1, limit: 2 };
      const response = reportService.listJobs(query);

      expect(response.data.length).toBeLessThanOrEqual(2);
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(2);
      expect(response.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter by competitor', () => {
      const query: ListReportsQuery = { competitor: 'CompanyA' };
      const response = reportService.listJobs(query);

      expect(response.data.every(j => j.competitor.includes('CompanyA'))).toBe(true);
    });

    it('should filter by format', () => {
      const query: ListReportsQuery = { format: 'html' };
      const response = reportService.listJobs(query);

      expect(response.data.every(j => j.formats.includes('html'))).toBe(true);
    });

    it('should sort by createdAt descending by default', () => {
      const response = reportService.listJobs({});

      for (let i = 1; i < response.data.length; i++) {
        const prevDate = new Date(response.data[i - 1].createdAt).getTime();
        const currDate = new Date(response.data[i].createdAt).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('should include pagination info', () => {
      const response = reportService.listJobs({ page: 1, limit: 2 });

      expect(response.pagination).toBeDefined();
      expect(typeof response.pagination.total).toBe('number');
      expect(typeof response.pagination.totalPages).toBe('number');
      expect(typeof response.pagination.hasNext).toBe('boolean');
      expect(typeof response.pagination.hasPrev).toBe('boolean');
    });
  });

  describe('cancelJob', () => {
    it('should cancel a queued job', async () => {
      const response = await reportService.createReportJob({
        competitor: 'Test',
        formats: ['json'],
        sourceData: { ads: [createMockAd()] },
      });

      const cancelled = reportService.cancelJob(response.reportJobId);

      expect(cancelled).toBeDefined();
      expect(cancelled!.status).toBe('cancelled');
      expect(cancelled!.cancelledAt).toBeDefined();
    });

    it('should return undefined for non-existent job', () => {
      const result = reportService.cancelJob('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteJob', () => {
    it('should delete a job', async () => {
      const response = await reportService.createReportJob({
        competitor: 'Test',
        formats: ['json'],
        sourceData: { ads: [createMockAd()] },
      });

      const deleted = reportService.deleteJob(response.reportJobId);
      expect(deleted).toBe(true);

      const job = reportService.getJob(response.reportJobId);
      expect(job).toBeUndefined();
    });

    it('should return false for non-existent job', () => {
      const deleted = reportService.deleteJob('non-existent');
      expect(deleted).toBe(false);
    });
  });
});

describe('Report Templates', () => {
  let reportService: ReportService;

  beforeEach(() => {
    reportService = new ReportService('./test-output');
  });

  describe('getTemplates', () => {
    it('should return all default templates', () => {
      const templates = reportService.getTemplates();

      expect(templates.length).toBe(DEFAULT_TEMPLATES.length);
      expect(templates.map(t => t.id)).toContain('intelligence');
      expect(templates.map(t => t.id)).toContain('executive');
      expect(templates.map(t => t.id)).toContain('detailed');
      expect(templates.map(t => t.id)).toContain('sentiment');
    });

    it('should include template details', () => {
      const templates = reportService.getTemplates();
      const intelligence = templates.find(t => t.id === 'intelligence');

      expect(intelligence).toBeDefined();
      expect(intelligence!.name).toBe('Intelligence Report');
      expect(intelligence!.outputFormats).toContain('html');
      expect(intelligence!.features).toContain('campaignAnalysis');
      expect(intelligence!.sections).toBeDefined();
      expect(intelligence!.customizationOptions).toBeDefined();
    });
  });

  describe('getTemplate', () => {
    it('should return specific template by id', () => {
      const template = reportService.getTemplate('intelligence');

      expect(template).toBeDefined();
      expect(template!.id).toBe('intelligence');
    });

    it('should return undefined for non-existent template', () => {
      const template = reportService.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });

    it('should include sections for intelligence template', () => {
      const template = reportService.getTemplate('intelligence');

      expect(template!.sections).toBeDefined();
      expect(template!.sections!.length).toBeGreaterThan(0);
      expect(template!.sections!.find(s => s.id === 'title')).toBeDefined();
      expect(template!.sections!.find(s => s.id === 'campaigns')).toBeDefined();
    });
  });
});

describe('Batch Generation', () => {
  let reportService: ReportService;

  beforeEach(() => {
    reportService = new ReportService('./test-output');
  });

  function createMockAd(competitor: string): Ad {
    return {
      id: `ad-${Math.random().toString(36).substring(7)}`,
      competitor,
      platform: 'meta',
      extractedAt: new Date().toISOString(),
      primaryText: 'Test ad copy',
      cta: 'Learn More',
      hashtags: [],
      startDate: new Date().toISOString(),
      destinationUrl: 'https://example.com',
      category: AdCategory.PRODUCT_FEATURE,
    };
  }

  describe('createBatch', () => {
    it('should create batch with multiple competitors', async () => {
      // Note: This test creates report jobs but they will fail without ads
      // In real usage, ads would be provided per competitor
      const response = await reportService.createBatch({
        competitors: ['CompanyA', 'CompanyB', 'CompanyC'],
        formats: ['json'],
      });

      expect(response.batchId).toMatch(/^batch_/);
      expect(response.jobs.length).toBe(3);
      expect(response.jobs[0].competitor).toBe('CompanyA');
      expect(response.jobs[1].competitor).toBe('CompanyB');
      expect(response.jobs[2].competitor).toBe('CompanyC');
      expect(response.statusUrl).toContain(response.batchId);
    });

    it('should create individual jobs for each competitor', async () => {
      const response = await reportService.createBatch({
        competitors: ['CompanyA', 'CompanyB'],
        formats: ['json', 'html'],
      });

      // Verify each job was created
      for (const jobStatus of response.jobs) {
        const job = reportService.getJob(jobStatus.reportJobId);
        expect(job).toBeDefined();
        expect(job!.formats).toEqual(['json', 'html']);
      }
    });
  });

  describe('getBatchStatus', () => {
    it('should return batch status', async () => {
      const createResponse = await reportService.createBatch({
        competitors: ['CompanyA', 'CompanyB'],
        formats: ['json'],
      });

      const status = reportService.getBatchStatus(createResponse.batchId);

      expect(status).toBeDefined();
      expect(status!.batchId).toBe(createResponse.batchId);
      expect(status!.jobs.length).toBe(2);
      expect(status!.totalCount).toBe(2);
    });

    it('should return undefined for non-existent batch', () => {
      const status = reportService.getBatchStatus('non-existent');
      expect(status).toBeUndefined();
    });
  });
});

describe('Report Types', () => {
  describe('ReportFormat', () => {
    it('should include all supported formats', () => {
      const formats: ReportFormat[] = ['json', 'markdown', 'html', 'intelligence', 'excel', 'pdf'];
      expect(formats.length).toBe(6);
    });
  });

  describe('ReportJobStatus', () => {
    it('should include all statuses', () => {
      const statuses: ReportJobStatus[] = ['queued', 'processing', 'completed', 'failed', 'cancelled'];
      expect(statuses.length).toBe(5);
    });
  });

  describe('DEFAULT_TEMPLATES', () => {
    it('should have valid template structure', () => {
      for (const template of DEFAULT_TEMPLATES) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.outputFormats.length).toBeGreaterThan(0);
        expect(template.features.length).toBeGreaterThan(0);
      }
    });

    it('should have unique template ids', () => {
      const ids = DEFAULT_TEMPLATES.map(t => t.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });
});

describe('Webhook Integration', () => {
  let reportService: ReportService;

  beforeEach(() => {
    reportService = new ReportService('./test-output');
  });

  it('should include webhook config in job', async () => {
    const response = await reportService.createReportJob({
      competitor: 'Test',
      formats: ['json'],
      sourceData: {
        ads: [{
          id: 'test-ad',
          competitor: 'Test',
          platform: 'meta',
          extractedAt: new Date().toISOString(),
          primaryText: 'Test',
          cta: 'Learn More',
          hashtags: [],
          startDate: new Date().toISOString(),
          destinationUrl: 'https://example.com',
          category: AdCategory.PRODUCT_FEATURE,
        }],
      },
      webhook: {
        url: 'https://example.com/webhook',
        events: ['completed', 'failed'],
      },
    });

    const job = reportService.getJob(response.reportJobId);
    expect(job!.webhook).toBeDefined();
    expect(job!.webhook!.url).toBe('https://example.com/webhook');
    expect(job!.webhook!.events).toContain('completed');
  });

  function createMockAd(): Ad {
    return {
      id: 'test-ad',
      competitor: 'Test',
      platform: 'meta',
      extractedAt: new Date().toISOString(),
      primaryText: 'Test',
      cta: 'Learn More',
      hashtags: [],
      startDate: new Date().toISOString(),
      destinationUrl: 'https://example.com',
      category: AdCategory.PRODUCT_FEATURE,
    };
  }
});

describe('File Management', () => {
  let reportService: ReportService;

  beforeEach(() => {
    reportService = new ReportService('./output');
  });

  describe('listReportFiles', () => {
    it('should return paginated file list', () => {
      const { files, total } = reportService.listReportFiles({ page: 1, limit: 10 });

      expect(Array.isArray(files)).toBe(true);
      expect(typeof total).toBe('number');
    });

    it('should include file metadata', () => {
      const { files } = reportService.listReportFiles({});

      for (const file of files) {
        expect(file.name).toBeDefined();
        expect(file.path).toBeDefined();
        expect(file.format).toBeDefined();
        expect(typeof file.size).toBe('number');
        expect(file.mimeType).toBeDefined();
        expect(file.modified instanceof Date).toBe(true);
      }
    });

    it('should filter by format', () => {
      const { files } = reportService.listReportFiles({ format: 'json' });

      for (const file of files) {
        expect(file.format).toBe('json');
      }
    });
  });

  describe('getReportFile', () => {
    it('should return undefined for non-existent file', () => {
      const result = reportService.getReportFile('non-existent-file.json');
      expect(result).toBeUndefined();
    });

    it('should prevent path traversal', () => {
      const result = reportService.getReportFile('../../../etc/passwd');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteReportFile', () => {
    it('should return false for non-existent file', () => {
      const result = reportService.deleteReportFile('non-existent-file.json');
      expect(result).toBe(false);
    });

    it('should prevent path traversal on delete', () => {
      const result = reportService.deleteReportFile('../../../etc/passwd');
      expect(result).toBe(false);
    });
  });
});
