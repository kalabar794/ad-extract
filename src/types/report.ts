/**
 * Report Generation API Types
 * Based on docs/api-design/REPORT-GENERATION-API.md
 */

import { Ad } from './ad';

// ============================================================================
// Enums and Basic Types
// ============================================================================

export type ReportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ReportFormat = 'json' | 'markdown' | 'html' | 'intelligence' | 'excel' | 'pdf';
export type ReportSourceType = 'extraction' | 'job' | 'ads';

// ============================================================================
// Branding and Customization
// ============================================================================

export interface BrandingConfig {
  logo?: string;                    // URL to logo
  primaryColor?: string;            // Hex color (e.g., '#3b82f6')
  secondaryColor?: string;          // Hex color
  companyName?: string;
  footerText?: string;
}

// ============================================================================
// Webhook Configuration
// ============================================================================

export interface WebhookConfig {
  url: string;
  events: ('completed' | 'failed' | 'progress')[];
  headers?: Record<string, string>;
  secret?: string;                  // For HMAC signature verification
}

export interface WebhookPayload {
  event: 'report.completed' | 'report.failed' | 'report.progress';
  timestamp: string;
  data: {
    reportJobId: string;
    competitor: string;
    status: ReportJobStatus;
    progress?: number;
    message?: string;
    outputs?: ReportOutput[];
    error?: ReportError;
  };
  signature?: string;               // HMAC-SHA256 signature
}

// ============================================================================
// Report Options
// ============================================================================

export interface ReportSectionConfig {
  id: string;
  enabled: boolean;
  order: number;
}

export interface ReportOptions {
  // Content options
  includeCampaignAnalysis?: boolean;
  includeExecutiveSummary?: boolean;
  includeAdExamples?: boolean;
  includeLandingPageAnalysis?: boolean;
  includeSentimentAnalysis?: boolean;

  // Analysis options
  maxCampaigns?: number;            // Max campaigns to include (default: 10)
  confidenceThreshold?: number;     // Category confidence threshold (0-1)

  // Sections (for intelligence report)
  sections?: ReportSectionConfig[];

  // Branding
  customBranding?: BrandingConfig;
}

// ============================================================================
// Report Output
// ============================================================================

export interface ReportOutput {
  format: ReportFormat;
  filename: string;
  filepath: string;                 // Server path
  size: number;                     // Bytes
  mimeType: string;
  downloadUrl: string;
  previewUrl?: string;              // For HTML/PDF
  generatedAt: string;
}

// ============================================================================
// Report Metadata
// ============================================================================

export interface ReportMetadata {
  totalAds: number;
  campaigns: number;
  platforms: string[];
  dateRange: {
    earliest?: string;
    latest?: string;
  };
  analysisDate: string;
  processingTime: number;           // Milliseconds
}

// ============================================================================
// Report Error
// ============================================================================

export interface ReportError {
  code: string;                     // Error code
  message: string;                  // Human-readable message
  details?: Record<string, unknown>;
  retryable: boolean;
}

// Error codes
export const ReportErrorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_SOURCE: 'INVALID_SOURCE',
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  GENERATION_FAILED: 'GENERATION_FAILED',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  JOB_CANCELLED: 'JOB_CANCELLED',
} as const;

// ============================================================================
// Report Job
// ============================================================================

export interface ReportJob {
  id: string;                       // Unique identifier (rpt_xxx)
  status: ReportJobStatus;
  competitor: string;
  formats: ReportFormat[];
  options: ReportOptions;

  // Progress tracking
  progress: number;                 // 0-100
  message: string;
  currentFormat?: ReportFormat;

  // Timestamps
  createdAt: string;                // ISO 8601
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;

  // Results
  outputs?: ReportOutput[];
  metadata?: ReportMetadata;
  error?: ReportError;

  // Source tracking
  sourceType: ReportSourceType;
  sourceId?: string;                // Extraction job ID if applicable
  sourceAds?: Ad[];                 // Ads if source=ads (stored temporarily)

  // Webhook
  webhook?: WebhookConfig;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// Generate Report Request
export interface GenerateReportRequest {
  competitor: string;
  source?: ReportSourceType;
  sourceData?: {
    jobId?: string;
    ads?: Ad[];
  };
  formats: ReportFormat[];
  options?: ReportOptions;
  webhook?: WebhookConfig;
}

// Generate Report Response (202 Accepted)
export interface GenerateReportResponse {
  reportJobId: string;
  status: ReportJobStatus;
  estimatedDuration: number;        // Milliseconds
  formats: ReportFormat[];
  createdAt: string;
  links: {
    status: string;
    cancel: string;
  };
}

// Report Status Response (200 OK)
export interface ReportStatusResponse {
  reportJobId: string;
  status: ReportJobStatus;
  competitor: string;
  formats: ReportFormat[];
  progress: number;
  message: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  outputs?: ReportOutput[];
  metadata?: ReportMetadata;
  error?: ReportError;
}

// List Reports Request Query Parameters
export interface ListReportsQuery {
  competitor?: string;
  format?: ReportFormat;
  status?: ReportJobStatus;
  from?: string;                    // ISO date
  to?: string;                      // ISO date
  page?: number;
  limit?: number;
  sort?: 'createdAt' | 'competitor';
  order?: 'asc' | 'desc';
}

// Pagination Info
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// List Reports Response
export interface ListReportsResponse {
  data: ReportStatusResponse[];
  pagination: PaginationInfo;
}

// Cancel Report Response
export interface CancelReportResponse {
  reportJobId: string;
  status: 'cancelled';
  cancelledAt: string;
}

// Regenerate Report Request
export interface RegenerateReportRequest {
  formats?: ReportFormat[];
  options?: ReportOptions;
}

// ============================================================================
// Report Templates
// ============================================================================

export interface ReportTemplateSection {
  id: string;
  name: string;
  required: boolean;
}

export interface ReportTemplateCustomization {
  branding: boolean;
  sectionOrder: boolean;
  sectionToggle: boolean;
  colorScheme: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  outputFormats: ReportFormat[];
  features: string[];
  sections?: ReportTemplateSection[];
  customizationOptions?: ReportTemplateCustomization;
  sampleOutput?: string;            // URL to sample
}

export interface TemplateListResponse {
  templates: ReportTemplate[];
}

// ============================================================================
// Batch Generation
// ============================================================================

export interface BatchGenerateRequest {
  competitors: string[];
  formats: ReportFormat[];
  options?: ReportOptions;
  webhook?: WebhookConfig;
}

export interface BatchJobStatus {
  competitor: string;
  reportJobId: string;
  status: ReportJobStatus;
}

export interface BatchGenerateResponse {
  batchId: string;
  jobs: BatchJobStatus[];
  statusUrl: string;
  createdAt: string;
}

export interface BatchStatus {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  jobs: BatchJobStatus[];
  completedCount: number;
  totalCount: number;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// Synchronous Generation (Small Datasets)
// ============================================================================

export interface SyncGenerateRequest {
  competitor: string;
  ads: Ad[];
  formats: ReportFormat[];
  options?: ReportOptions;
}

export interface SyncGenerateResponse {
  competitor: string;
  outputs: ReportOutput[];
  metadata: ReportMetadata;
}

// ============================================================================
// Analysis API Types
// ============================================================================

export interface CampaignAnalysisRequest {
  competitor: string;
  ads: Ad[];
  options?: {
    maxCampaigns?: number;
    includeWeaknesses?: boolean;
  };
}

export interface CopyAnalysisRequest {
  ads: Ad[];
}

// ============================================================================
// File Info (for listing existing reports)
// ============================================================================

export interface ReportFileInfo {
  name: string;
  path: string;
  format: string;
  size: number;
  mimeType: string;
  modified: Date;
  competitor?: string;
}

// ============================================================================
// Default Templates
// ============================================================================

export const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'intelligence',
    name: 'Intelligence Report',
    description: 'Marketly-style strategic intelligence analysis with campaign breakdown',
    version: '1.0.0',
    outputFormats: ['html'],
    features: ['campaignAnalysis', 'investmentEstimate', 'swot', 'strategicInsights'],
    sections: [
      { id: 'title', name: 'Title Slide', required: true },
      { id: 'overview', name: 'Campaign Overview', required: true },
      { id: 'campaigns', name: 'Campaign Breakdown', required: false },
      { id: 'painPoints', name: 'Pain Points Analysis', required: false },
      { id: 'valueProps', name: 'Value Propositions', required: false },
      { id: 'creative', name: 'Creative Execution', required: false },
      { id: 'audience', name: 'Audience Targeting', required: false },
      { id: 'strengths', name: 'Strategic Strengths', required: false },
      { id: 'weaknesses', name: 'Strategic Weaknesses', required: false },
      { id: 'insights', name: 'Key Insights Summary', required: true },
      { id: 'examples', name: 'Ad Examples', required: false }
    ],
    customizationOptions: {
      branding: true,
      sectionOrder: true,
      sectionToggle: true,
      colorScheme: true
    }
  },
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'High-level competitive overview for stakeholders',
    version: '1.0.0',
    outputFormats: ['html', 'pdf', 'markdown'],
    features: ['keyFindings', 'strategicOpportunities', 'competitorOverview'],
    sections: [
      { id: 'summary', name: 'Executive Summary', required: true },
      { id: 'keyMetrics', name: 'Key Metrics', required: true },
      { id: 'findings', name: 'Key Findings', required: true },
      { id: 'opportunities', name: 'Strategic Opportunities', required: false },
      { id: 'recommendations', name: 'Recommendations', required: false }
    ],
    customizationOptions: {
      branding: true,
      sectionOrder: false,
      sectionToggle: true,
      colorScheme: true
    }
  },
  {
    id: 'detailed',
    name: 'Detailed Analysis',
    description: 'Full ad-by-ad breakdown with all metrics',
    version: '1.0.0',
    outputFormats: ['json', 'markdown', 'excel'],
    features: ['fullAdList', 'copyAnalysis', 'mediaAnalysis', 'categoryBreakdown'],
    sections: [
      { id: 'overview', name: 'Analysis Overview', required: true },
      { id: 'categories', name: 'Category Distribution', required: true },
      { id: 'copy', name: 'Copy Analysis', required: false },
      { id: 'media', name: 'Media Analysis', required: false },
      { id: 'ads', name: 'Full Ad List', required: true }
    ],
    customizationOptions: {
      branding: false,
      sectionOrder: false,
      sectionToggle: true,
      colorScheme: false
    }
  },
  {
    id: 'sentiment',
    name: 'Sentiment Analysis',
    description: 'Deep psychological and persuasion analysis of ad copy',
    version: '1.0.0',
    outputFormats: ['json', 'html'],
    features: ['emotionAnalysis', 'persuasionTechniques', 'toneAnalysis', 'psychologicalTriggers'],
    sections: [
      { id: 'overview', name: 'Sentiment Overview', required: true },
      { id: 'emotions', name: 'Emotion Distribution', required: true },
      { id: 'persuasion', name: 'Persuasion Techniques', required: false },
      { id: 'tone', name: 'Tone & Voice Analysis', required: false },
      { id: 'triggers', name: 'Psychological Triggers', required: false },
      { id: 'positioning', name: 'Competitive Positioning', required: false },
      { id: 'insights', name: 'Strategic Insights', required: true }
    ],
    customizationOptions: {
      branding: true,
      sectionOrder: false,
      sectionToggle: true,
      colorScheme: true
    }
  }
];
