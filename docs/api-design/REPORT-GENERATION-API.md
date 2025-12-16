# Report Generation API Design Specification

## Overview

This document provides a comprehensive API design for the Ad Extraction Tool's Report Generation service. The API enables programmatic generation, customization, and retrieval of competitive intelligence reports in multiple formats.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [OpenAPI Specification](#openapi-specification)
5. [Integration Patterns](#integration-patterns)
6. [Error Handling](#error-handling)
7. [Rate Limiting & Quotas](#rate-limiting--quotas)
8. [Authentication](#authentication)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Report Generation API                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌──────────────────┐    ┌────────────────────────────┐ │
│  │   Client    │───▶│   API Gateway    │───▶│  Report Generation Service │ │
│  │  (Web/CLI)  │    │  (Express + WS)  │    │                            │ │
│  └─────────────┘    └──────────────────┘    │  ┌──────────────────────┐  │ │
│                              │               │  │   Report Generators  │  │ │
│                              │               │  │  ┌────────────────┐  │  │ │
│                              │               │  │  │ JSON Reporter  │  │  │ │
│                              │               │  │  ├────────────────┤  │  │ │
│                              │               │  │  │ MD Reporter    │  │  │ │
│                              │               │  │  ├────────────────┤  │  │ │
│                              │               │  │  │ HTML Reporter  │  │  │ │
│                              │               │  │  ├────────────────┤  │  │ │
│                              │               │  │  │ Intelligence   │  │  │ │
│                              │               │  │  │ Reporter       │  │  │ │
│                              │               │  │  ├────────────────┤  │  │ │
│                              │               │  │  │ Excel Reporter │  │  │ │
│                              │               │  │  ├────────────────┤  │  │ │
│                              ▼               │  │  │ PDF Reporter   │  │  │ │
│                     ┌────────────────┐      │  │  └────────────────┘  │  │ │
│                     │  Job Queue     │      │  └──────────────────────┘  │ │
│                     │  (In-Memory)   │─────▶│                            │ │
│                     └────────────────┘      │  ┌──────────────────────┐  │ │
│                                             │  │   Analyzers          │  │ │
│                                             │  │  ├─ CampaignAnalyzer │  │ │
│                                             │  │  ├─ CopyAnalyzer     │  │ │
│                                             │  │  └─ Categorizer      │  │ │
│                                             │  └──────────────────────┘  │ │
│                                             └────────────────────────────┘ │
│                                                          │                 │
│                                                          ▼                 │
│                                             ┌────────────────────────────┐ │
│                                             │   Storage Layer            │ │
│                                             │  ├─ File System (./output) │ │
│                                             │  └─ SQLite (future)        │ │
│                                             └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **API Gateway** | Route requests, authentication, rate limiting |
| **Job Queue** | Manage async report generation jobs |
| **Report Generators** | Format-specific report creation |
| **Analyzers** | Campaign analysis, copy analysis, categorization |
| **Storage Layer** | Persist reports, manage retrieval |

---

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Reports Resource

#### 1. Generate Report

**POST** `/reports/generate`

Generate a new report from existing extraction data or trigger new extraction.

**Request Body:**
```json
{
  "competitor": "string (required)",
  "source": "extraction | job_id | ads",
  "sourceData": {
    "jobId": "uuid (if source=job_id)",
    "ads": "Ad[] (if source=ads)"
  },
  "formats": ["json", "markdown", "html", "intelligence", "excel", "pdf"],
  "options": {
    "includeCampaignAnalysis": true,
    "includeExecutiveSummary": true,
    "includeAdExamples": true,
    "maxCampaigns": 10,
    "confidenceThreshold": 0.5,
    "customBranding": {
      "logo": "url",
      "primaryColor": "#3b82f6",
      "companyName": "string"
    }
  },
  "webhook": {
    "url": "https://example.com/webhook",
    "events": ["completed", "failed"]
  }
}
```

**Response (202 Accepted):**
```json
{
  "reportJobId": "rpt_abc123",
  "status": "queued",
  "estimatedDuration": 5000,
  "formats": ["intelligence", "json"],
  "createdAt": "2024-12-16T10:00:00Z",
  "links": {
    "status": "/api/v1/reports/rpt_abc123",
    "cancel": "/api/v1/reports/rpt_abc123/cancel"
  }
}
```

---

#### 2. Get Report Status

**GET** `/reports/:reportId`

**Response (200 OK):**
```json
{
  "reportJobId": "rpt_abc123",
  "status": "completed",
  "competitor": "Shopify",
  "formats": ["intelligence", "json"],
  "progress": 100,
  "message": "Report generation complete",
  "createdAt": "2024-12-16T10:00:00Z",
  "completedAt": "2024-12-16T10:00:05Z",
  "outputs": [
    {
      "format": "intelligence",
      "filename": "shopify_intelligence_2024-12-16.html",
      "size": 45678,
      "downloadUrl": "/api/v1/reports/rpt_abc123/download/intelligence"
    },
    {
      "format": "json",
      "filename": "shopify_2024-12-16.json",
      "size": 12345,
      "downloadUrl": "/api/v1/reports/rpt_abc123/download/json"
    }
  ],
  "metadata": {
    "totalAds": 50,
    "campaigns": 5,
    "analysisDate": "2024-12-16T10:00:00Z"
  }
}
```

---

#### 3. Download Report

**GET** `/reports/:reportId/download/:format`

**Response Headers:**
```
Content-Type: application/octet-stream (or appropriate mime type)
Content-Disposition: attachment; filename="shopify_intelligence_2024-12-16.html"
Content-Length: 45678
```

**Query Parameters:**
- `inline=true` - Return for inline viewing instead of download

---

#### 4. List Reports

**GET** `/reports`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `competitor` | string | Filter by competitor name |
| `format` | string | Filter by format (json, html, etc.) |
| `status` | string | Filter by status (completed, failed) |
| `from` | ISO date | Reports created after this date |
| `to` | ISO date | Reports created before this date |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `sort` | string | Sort field (createdAt, competitor) |
| `order` | string | Sort order (asc, desc) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "reportJobId": "rpt_abc123",
      "competitor": "Shopify",
      "status": "completed",
      "formats": ["intelligence", "json"],
      "createdAt": "2024-12-16T10:00:00Z",
      "metadata": {
        "totalAds": 50,
        "campaigns": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

#### 5. Delete Report

**DELETE** `/reports/:reportId`

**Response (204 No Content)**

---

#### 6. Cancel Report Generation

**POST** `/reports/:reportId/cancel`

**Response (200 OK):**
```json
{
  "reportJobId": "rpt_abc123",
  "status": "cancelled",
  "cancelledAt": "2024-12-16T10:00:03Z"
}
```

---

#### 7. Regenerate Report

**POST** `/reports/:reportId/regenerate`

Create a new report from the same source data with optional format changes.

**Request Body:**
```json
{
  "formats": ["pdf", "excel"],
  "options": {
    "includeExecutiveSummary": false
  }
}
```

---

### Report Templates Resource

#### 8. List Templates

**GET** `/reports/templates`

**Response (200 OK):**
```json
{
  "templates": [
    {
      "id": "intelligence",
      "name": "Intelligence Report",
      "description": "Marketly-style strategic intelligence analysis",
      "outputFormats": ["html"],
      "features": ["campaignAnalysis", "investmentEstimate", "swot"]
    },
    {
      "id": "executive",
      "name": "Executive Summary",
      "description": "High-level competitive overview for stakeholders",
      "outputFormats": ["html", "pdf"],
      "features": ["keyFindings", "strategicOpportunities"]
    },
    {
      "id": "detailed",
      "name": "Detailed Analysis",
      "description": "Full ad-by-ad breakdown with all metrics",
      "outputFormats": ["json", "markdown", "excel"],
      "features": ["fullAdList", "copyAnalysis", "mediaAnalysis"]
    }
  ]
}
```

---

#### 9. Get Template Details

**GET** `/reports/templates/:templateId`

**Response (200 OK):**
```json
{
  "id": "intelligence",
  "name": "Intelligence Report",
  "description": "Marketly-style strategic intelligence analysis",
  "version": "1.0.0",
  "outputFormats": ["html"],
  "sections": [
    { "id": "title", "name": "Title Slide", "required": true },
    { "id": "overview", "name": "Campaign Overview", "required": true },
    { "id": "campaigns", "name": "Campaign Breakdown", "required": false },
    { "id": "painPoints", "name": "Pain Points Analysis", "required": false },
    { "id": "valueProps", "name": "Value Propositions", "required": false },
    { "id": "creative", "name": "Creative Execution", "required": false },
    { "id": "audience", "name": "Audience Targeting", "required": false },
    { "id": "strengths", "name": "Strategic Strengths", "required": false },
    { "id": "weaknesses", "name": "Strategic Weaknesses", "required": false },
    { "id": "insights", "name": "Key Insights Summary", "required": true },
    { "id": "examples", "name": "Ad Examples", "required": false }
  ],
  "customizationOptions": {
    "branding": true,
    "sectionOrder": true,
    "sectionToggle": true,
    "colorScheme": true
  },
  "sampleOutput": "/api/v1/reports/templates/intelligence/sample"
}
```

---

### Analysis Resource

#### 10. Get Campaign Analysis

**POST** `/analysis/campaigns`

Run campaign analysis on provided ads without generating a full report.

**Request Body:**
```json
{
  "competitor": "string",
  "ads": "Ad[]",
  "options": {
    "maxCampaigns": 10,
    "includeWeaknesses": true
  }
}
```

**Response (200 OK):**
```json
{
  "competitor": "Shopify",
  "totalAds": 50,
  "activePeriod": "3+ months",
  "campaigns": [
    {
      "id": "campaign-1",
      "name": "Case Studies",
      "theme": "case_study",
      "percentage": 35,
      "variations": 18,
      "hook": "\"See how Dr. Smith grew his practice 300%\"",
      "offer": "Free consultation",
      "cta": "Learn More",
      "ctaPercentage": 85
    }
  ],
  "investmentEstimate": {
    "conservative": 15000,
    "aggressive": 60000,
    "duration": "3+ months active",
    "signal": "Primary acquisition channel"
  },
  "strategicStrengths": ["..."],
  "strategicWeaknesses": ["..."]
}
```

---

#### 11. Get Copy Analysis

**POST** `/analysis/copy`

Analyze ad copy patterns and keywords.

**Request Body:**
```json
{
  "ads": "Ad[]"
}
```

**Response (200 OK):**
```json
{
  "topKeywords": ["growth", "results", "proven"],
  "commonPhrases": ["get started today", "see the results"],
  "ctaDistribution": {
    "Learn More": 45,
    "Sign Up": 30,
    "Get Started": 25
  },
  "avgCopyLength": 156,
  "readabilityScore": 72,
  "emojiUsage": ["🚀", "✅", "💰"],
  "themes": ["Value/Price", "Results/Benefits", "Trust/Social Proof"]
}
```

---

### Real-time Updates (WebSocket)

#### WebSocket Endpoint
```
ws://localhost:3000/ws
```

#### Events

**Subscribe to Report Progress:**
```json
{
  "action": "subscribe",
  "channel": "reports",
  "reportJobId": "rpt_abc123"
}
```

**Progress Event:**
```json
{
  "event": "report:progress",
  "data": {
    "reportJobId": "rpt_abc123",
    "progress": 65,
    "message": "Generating campaign analysis...",
    "currentFormat": "intelligence"
  }
}
```

**Completion Event:**
```json
{
  "event": "report:completed",
  "data": {
    "reportJobId": "rpt_abc123",
    "outputs": [
      { "format": "intelligence", "downloadUrl": "/api/v1/reports/rpt_abc123/download/intelligence" }
    ]
  }
}
```

---

## Data Models

### ReportJob

```typescript
interface ReportJob {
  id: string;                              // Unique identifier (rpt_xxx)
  status: ReportJobStatus;                 // queued | processing | completed | failed | cancelled
  competitor: string;                      // Competitor being analyzed
  formats: ReportFormat[];                 // Requested output formats
  options: ReportOptions;                  // Generation options

  // Progress tracking
  progress: number;                        // 0-100
  message: string;                         // Current operation
  currentFormat?: ReportFormat;            // Format currently being generated

  // Timestamps
  createdAt: string;                       // ISO 8601
  startedAt?: string;                      // When processing began
  completedAt?: string;                    // When completed/failed

  // Results
  outputs?: ReportOutput[];                // Generated files
  metadata?: ReportMetadata;               // Summary data
  error?: ReportError;                     // Error details if failed

  // Source tracking
  sourceType: 'extraction' | 'job' | 'ads';
  sourceId?: string;                       // Extraction job ID if applicable
}

type ReportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
type ReportFormat = 'json' | 'markdown' | 'html' | 'intelligence' | 'excel' | 'pdf';
```

### ReportOptions

```typescript
interface ReportOptions {
  // Content options
  includeCampaignAnalysis: boolean;
  includeExecutiveSummary: boolean;
  includeAdExamples: boolean;
  includeLandingPageAnalysis: boolean;

  // Analysis options
  maxCampaigns: number;                    // Max campaigns to include
  confidenceThreshold: number;             // Category confidence threshold

  // Sections (for intelligence report)
  sections?: {
    id: string;
    enabled: boolean;
    order: number;
  }[];

  // Branding
  customBranding?: {
    logo?: string;                         // URL to logo
    primaryColor?: string;                 // Hex color
    secondaryColor?: string;               // Hex color
    companyName?: string;
    footerText?: string;
  };
}
```

### ReportOutput

```typescript
interface ReportOutput {
  format: ReportFormat;
  filename: string;
  filepath: string;                        // Server path
  size: number;                            // Bytes
  mimeType: string;
  downloadUrl: string;
  previewUrl?: string;                     // For HTML/PDF
  generatedAt: string;
}
```

### ReportMetadata

```typescript
interface ReportMetadata {
  totalAds: number;
  campaigns: number;
  platforms: string[];
  dateRange: {
    earliest?: string;
    latest?: string;
  };
  analysisDate: string;
  processingTime: number;                  // Milliseconds
}
```

### ReportError

```typescript
interface ReportError {
  code: string;                            // Error code
  message: string;                         // Human-readable message
  details?: Record<string, unknown>;       // Additional context
  retryable: boolean;
}
```

---

## OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: Ad Extraction Tool - Report Generation API
  description: API for generating competitive intelligence reports
  version: 1.0.0
  contact:
    name: API Support
    email: support@example.com

servers:
  - url: http://localhost:3000/api/v1
    description: Development server

paths:
  /reports/generate:
    post:
      summary: Generate a new report
      operationId: generateReport
      tags:
        - Reports
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateReportRequest'
      responses:
        '202':
          description: Report generation queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportJobCreated'
        '400':
          $ref: '#/components/responses/BadRequest'
        '429':
          $ref: '#/components/responses/TooManyRequests'

  /reports/{reportId}:
    get:
      summary: Get report status and details
      operationId: getReport
      tags:
        - Reports
      parameters:
        - $ref: '#/components/parameters/ReportId'
      responses:
        '200':
          description: Report details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportJob'
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      summary: Delete a report
      operationId: deleteReport
      tags:
        - Reports
      parameters:
        - $ref: '#/components/parameters/ReportId'
      responses:
        '204':
          description: Report deleted
        '404':
          $ref: '#/components/responses/NotFound'

  /reports/{reportId}/download/{format}:
    get:
      summary: Download report file
      operationId: downloadReport
      tags:
        - Reports
      parameters:
        - $ref: '#/components/parameters/ReportId'
        - name: format
          in: path
          required: true
          schema:
            $ref: '#/components/schemas/ReportFormat'
        - name: inline
          in: query
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: Report file
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
        '404':
          $ref: '#/components/responses/NotFound'

  /reports:
    get:
      summary: List reports
      operationId: listReports
      tags:
        - Reports
      parameters:
        - name: competitor
          in: query
          schema:
            type: string
        - name: format
          in: query
          schema:
            $ref: '#/components/schemas/ReportFormat'
        - name: status
          in: query
          schema:
            $ref: '#/components/schemas/ReportJobStatus'
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/Limit'
      responses:
        '200':
          description: List of reports
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportListResponse'

  /reports/{reportId}/cancel:
    post:
      summary: Cancel report generation
      operationId: cancelReport
      tags:
        - Reports
      parameters:
        - $ref: '#/components/parameters/ReportId'
      responses:
        '200':
          description: Report cancelled
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportJob'
        '400':
          description: Report cannot be cancelled
        '404':
          $ref: '#/components/responses/NotFound'

  /reports/templates:
    get:
      summary: List available report templates
      operationId: listTemplates
      tags:
        - Templates
      responses:
        '200':
          description: List of templates
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TemplateListResponse'

  /analysis/campaigns:
    post:
      summary: Run campaign analysis
      operationId: analyzeCampaigns
      tags:
        - Analysis
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CampaignAnalysisRequest'
      responses:
        '200':
          description: Campaign analysis results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CampaignAnalysis'

  /analysis/copy:
    post:
      summary: Run copy analysis
      operationId: analyzeCopy
      tags:
        - Analysis
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CopyAnalysisRequest'
      responses:
        '200':
          description: Copy analysis results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CopyAnalysis'

components:
  schemas:
    GenerateReportRequest:
      type: object
      required:
        - competitor
        - formats
      properties:
        competitor:
          type: string
          minLength: 1
          maxLength: 200
        source:
          type: string
          enum: [extraction, job_id, ads]
          default: extraction
        sourceData:
          type: object
          properties:
            jobId:
              type: string
              format: uuid
            ads:
              type: array
              items:
                $ref: '#/components/schemas/Ad'
        formats:
          type: array
          minItems: 1
          items:
            $ref: '#/components/schemas/ReportFormat'
        options:
          $ref: '#/components/schemas/ReportOptions'
        webhook:
          $ref: '#/components/schemas/WebhookConfig'

    ReportFormat:
      type: string
      enum: [json, markdown, html, intelligence, excel, pdf]

    ReportJobStatus:
      type: string
      enum: [queued, processing, completed, failed, cancelled]

    ReportOptions:
      type: object
      properties:
        includeCampaignAnalysis:
          type: boolean
          default: true
        includeExecutiveSummary:
          type: boolean
          default: true
        includeAdExamples:
          type: boolean
          default: true
        maxCampaigns:
          type: integer
          minimum: 1
          maximum: 20
          default: 10
        confidenceThreshold:
          type: number
          minimum: 0
          maximum: 1
          default: 0.5
        customBranding:
          $ref: '#/components/schemas/BrandingConfig'

    BrandingConfig:
      type: object
      properties:
        logo:
          type: string
          format: uri
        primaryColor:
          type: string
          pattern: '^#[0-9A-Fa-f]{6}$'
        secondaryColor:
          type: string
          pattern: '^#[0-9A-Fa-f]{6}$'
        companyName:
          type: string
          maxLength: 100
        footerText:
          type: string
          maxLength: 200

    WebhookConfig:
      type: object
      properties:
        url:
          type: string
          format: uri
        events:
          type: array
          items:
            type: string
            enum: [completed, failed, progress]
        headers:
          type: object
          additionalProperties:
            type: string

    ReportJobCreated:
      type: object
      properties:
        reportJobId:
          type: string
        status:
          $ref: '#/components/schemas/ReportJobStatus'
        estimatedDuration:
          type: integer
          description: Estimated time in milliseconds
        formats:
          type: array
          items:
            $ref: '#/components/schemas/ReportFormat'
        createdAt:
          type: string
          format: date-time
        links:
          type: object
          properties:
            status:
              type: string
            cancel:
              type: string

    ReportJob:
      type: object
      properties:
        reportJobId:
          type: string
        status:
          $ref: '#/components/schemas/ReportJobStatus'
        competitor:
          type: string
        formats:
          type: array
          items:
            $ref: '#/components/schemas/ReportFormat'
        progress:
          type: integer
          minimum: 0
          maximum: 100
        message:
          type: string
        createdAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
        outputs:
          type: array
          items:
            $ref: '#/components/schemas/ReportOutput'
        metadata:
          $ref: '#/components/schemas/ReportMetadata'
        error:
          $ref: '#/components/schemas/ReportError'

    ReportOutput:
      type: object
      properties:
        format:
          $ref: '#/components/schemas/ReportFormat'
        filename:
          type: string
        size:
          type: integer
        mimeType:
          type: string
        downloadUrl:
          type: string
        previewUrl:
          type: string

    ReportMetadata:
      type: object
      properties:
        totalAds:
          type: integer
        campaigns:
          type: integer
        platforms:
          type: array
          items:
            type: string
        analysisDate:
          type: string
          format: date-time
        processingTime:
          type: integer

    ReportError:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object
        retryable:
          type: boolean

    ReportListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/ReportJob'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
        hasNext:
          type: boolean
        hasPrev:
          type: boolean

    TemplateListResponse:
      type: object
      properties:
        templates:
          type: array
          items:
            $ref: '#/components/schemas/ReportTemplate'

    ReportTemplate:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        outputFormats:
          type: array
          items:
            $ref: '#/components/schemas/ReportFormat'
        features:
          type: array
          items:
            type: string

    Ad:
      type: object
      properties:
        id:
          type: string
        competitor:
          type: string
        platform:
          type: string
        primaryText:
          type: string
        headline:
          type: string
        cta:
          type: string
        mediaType:
          type: string
          enum: [image, video, carousel]
        startDate:
          type: string
          format: date-time

    CampaignAnalysisRequest:
      type: object
      required:
        - competitor
        - ads
      properties:
        competitor:
          type: string
        ads:
          type: array
          items:
            $ref: '#/components/schemas/Ad'
        options:
          type: object
          properties:
            maxCampaigns:
              type: integer
            includeWeaknesses:
              type: boolean

    CampaignAnalysis:
      type: object
      properties:
        competitor:
          type: string
        totalAds:
          type: integer
        activePeriod:
          type: string
        campaigns:
          type: array
          items:
            $ref: '#/components/schemas/Campaign'
        investmentEstimate:
          $ref: '#/components/schemas/InvestmentEstimate'
        strategicStrengths:
          type: array
          items:
            type: string
        strategicWeaknesses:
          type: array
          items:
            type: string

    Campaign:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        theme:
          type: string
        percentage:
          type: number
        variations:
          type: integer
        hook:
          type: string
        offer:
          type: string
        cta:
          type: string
        ctaPercentage:
          type: number

    InvestmentEstimate:
      type: object
      properties:
        conservative:
          type: number
        aggressive:
          type: number
        duration:
          type: string
        signal:
          type: string

    CopyAnalysisRequest:
      type: object
      required:
        - ads
      properties:
        ads:
          type: array
          items:
            $ref: '#/components/schemas/Ad'

    CopyAnalysis:
      type: object
      properties:
        topKeywords:
          type: array
          items:
            type: string
        commonPhrases:
          type: array
          items:
            type: string
        ctaDistribution:
          type: object
          additionalProperties:
            type: integer
        avgCopyLength:
          type: number
        readabilityScore:
          type: number
        themes:
          type: array
          items:
            type: string

  parameters:
    ReportId:
      name: reportId
      in: path
      required: true
      schema:
        type: string
    Page:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
    Limit:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              details:
                type: array
                items:
                  type: object
                  properties:
                    field:
                      type: string
                    message:
                      type: string

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string

    TooManyRequests:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
        X-RateLimit-Remaining:
          schema:
            type: integer
        X-RateLimit-Reset:
          schema:
            type: integer
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              retryAfter:
                type: integer

  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

security:
  - ApiKeyAuth: []

tags:
  - name: Reports
    description: Report generation and management
  - name: Templates
    description: Report template management
  - name: Analysis
    description: Ad analysis endpoints
```

---

## Integration Patterns

### 1. Synchronous Report Generation (Small Datasets)

For small datasets (< 20 ads), consider a synchronous endpoint:

```typescript
// POST /api/v1/reports/generate-sync
// For immediate response with small datasets

app.post('/api/v1/reports/generate-sync', async (req, res) => {
  const { competitor, ads, formats } = req.body;

  if (ads.length > 20) {
    return res.status(400).json({
      error: 'Dataset too large for sync generation. Use async endpoint.'
    });
  }

  const reports = await generateReportsSync(competitor, ads, formats);
  res.json({ reports });
});
```

### 2. Webhook Integration

```typescript
// Webhook payload for completed reports
interface WebhookPayload {
  event: 'report.completed' | 'report.failed';
  timestamp: string;
  data: {
    reportJobId: string;
    competitor: string;
    status: string;
    outputs?: ReportOutput[];
    error?: ReportError;
  };
  signature: string;  // HMAC-SHA256 signature
}

// Webhook delivery with retry
async function deliverWebhook(config: WebhookConfig, payload: WebhookPayload) {
  const maxRetries = 3;
  const backoff = [1000, 5000, 30000];  // ms

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': generateSignature(payload),
          ...config.headers
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) return;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await sleep(backoff[attempt]);
      }
    }
  }
}
```

### 3. Batch Report Generation

```typescript
// POST /api/v1/reports/batch
// Generate reports for multiple competitors

interface BatchRequest {
  competitors: string[];
  formats: ReportFormat[];
  options: ReportOptions;
}

interface BatchResponse {
  batchId: string;
  jobs: Array<{
    competitor: string;
    reportJobId: string;
    status: string;
  }>;
  statusUrl: string;
}

app.post('/api/v1/reports/batch', async (req, res) => {
  const { competitors, formats, options } = req.body;

  const batchId = generateBatchId();
  const jobs = [];

  for (const competitor of competitors) {
    const jobId = await queueReportJob({ competitor, formats, options });
    jobs.push({ competitor, reportJobId: jobId, status: 'queued' });
  }

  res.json({
    batchId,
    jobs,
    statusUrl: `/api/v1/reports/batch/${batchId}`
  });
});
```

### 4. Streaming Progress Updates

```typescript
// Server-Sent Events for progress
app.get('/api/v1/reports/:reportId/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reportId = req.params.reportId;

  const sendProgress = (data: any) => {
    res.write(`event: progress\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const sendComplete = (data: any) => {
    res.write(`event: complete\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.end();
  };

  // Subscribe to job updates
  jobEmitter.on(`job:${reportId}:progress`, sendProgress);
  jobEmitter.on(`job:${reportId}:complete`, sendComplete);

  req.on('close', () => {
    jobEmitter.off(`job:${reportId}:progress`, sendProgress);
    jobEmitter.off(`job:${reportId}:complete`, sendComplete);
  });
});
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request validation failed |
| `INVALID_FORMAT` | 400 | Unsupported report format |
| `INVALID_SOURCE` | 400 | Invalid source data |
| `REPORT_NOT_FOUND` | 404 | Report job not found |
| `TEMPLATE_NOT_FOUND` | 404 | Template not found |
| `GENERATION_FAILED` | 500 | Report generation failed |
| `ANALYSIS_FAILED` | 500 | Analysis processing failed |
| `STORAGE_ERROR` | 500 | File storage error |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `JOB_CANCELLED` | 409 | Job was cancelled |

### Error Response Format

```json
{
  "error": {
    "code": "GENERATION_FAILED",
    "message": "Failed to generate intelligence report",
    "details": {
      "format": "intelligence",
      "stage": "campaign_analysis",
      "reason": "Insufficient data for campaign grouping"
    },
    "retryable": true,
    "documentation": "https://docs.example.com/errors/GENERATION_FAILED"
  },
  "requestId": "req_abc123",
  "timestamp": "2024-12-16T10:00:00Z"
}
```

---

## Rate Limiting & Quotas

### Default Limits

| Tier | Reports/Hour | Reports/Day | Concurrent Jobs | Max Ads/Report |
|------|--------------|-------------|-----------------|----------------|
| Free | 5 | 20 | 1 | 50 |
| Basic | 20 | 100 | 3 | 200 |
| Pro | 100 | 500 | 10 | 1000 |
| Enterprise | Unlimited | Unlimited | 50 | 5000 |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702720800
X-RateLimit-Policy: "100;w=3600"
```

---

## Authentication

### API Key Authentication

```bash
curl -X POST https://api.example.com/api/v1/reports/generate \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"competitor": "Shopify", "formats": ["intelligence"]}'
```

### JWT Authentication (Future)

```typescript
// Authorization header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Token payload
{
  "sub": "user_123",
  "org": "org_456",
  "permissions": ["reports:create", "reports:read", "reports:delete"],
  "exp": 1702720800
}
```

---

## Implementation Roadmap

### Phase 1: Core API (Current)
- [x] Basic report generation endpoint
- [x] Job status tracking
- [x] File download endpoints
- [ ] Report listing with pagination
- [ ] Report deletion

### Phase 2: Enhanced Features
- [ ] Template system
- [ ] Custom branding
- [ ] Webhook support
- [ ] Batch generation

### Phase 3: Advanced Features
- [ ] API key authentication
- [ ] Rate limiting
- [ ] Report scheduling
- [ ] Report comparison
- [ ] Export to third-party integrations

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { AdExtractorClient } from '@ad-extractor/sdk';

const client = new AdExtractorClient({
  baseUrl: 'http://localhost:3000/api/v1',
  apiKey: 'your_api_key'
});

// Generate report
const job = await client.reports.generate({
  competitor: 'Shopify',
  formats: ['intelligence', 'json'],
  options: {
    includeCampaignAnalysis: true,
    customBranding: {
      primaryColor: '#3b82f6',
      companyName: 'My Agency'
    }
  }
});

// Wait for completion
const result = await client.reports.waitForCompletion(job.reportJobId, {
  onProgress: (progress) => console.log(`Progress: ${progress}%`)
});

// Download report
const file = await client.reports.download(job.reportJobId, 'intelligence');
await fs.writeFile('report.html', file);
```

### Python

```python
from ad_extractor import Client

client = Client(
    base_url="http://localhost:3000/api/v1",
    api_key="your_api_key"
)

# Generate report
job = client.reports.generate(
    competitor="Shopify",
    formats=["intelligence", "json"],
    options={
        "include_campaign_analysis": True,
        "custom_branding": {
            "primary_color": "#3b82f6",
            "company_name": "My Agency"
        }
    }
)

# Wait for completion with progress
for progress in client.reports.stream_progress(job.report_job_id):
    print(f"Progress: {progress.percent}% - {progress.message}")

# Download
client.reports.download(job.report_job_id, "intelligence", "report.html")
```

---

*Document Version: 1.0.0*
*Last Updated: December 2024*
