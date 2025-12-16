import fs from 'fs';
import path from 'path';
import { Ad } from '../types/ad';
import { CampaignAnalysis, Campaign } from '../analyzers/campaign-analyzer';
import { createLogger } from '../utils/logger';

const logger = createLogger('intelligence-report');

export interface IntelligenceReportOptions {
  outputDir: string;
  filename?: string;
}

export class IntelligenceReportGenerator {
  private options: IntelligenceReportOptions;

  constructor(options: IntelligenceReportOptions) {
    this.options = options;
  }

  generate(analysis: CampaignAnalysis): string {
    const date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(analysis.competitor)} - Ad Intelligence Analysis</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }

    .slide {
      max-width: 1200px;
      margin: 0 auto;
      padding: 60px 80px;
      background: white;
      min-height: 100vh;
      page-break-after: always;
    }

    .slide-title {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 80px;
    }

    .slide-title h1 {
      font-size: 72px;
      font-weight: 800;
      color: white;
      margin-bottom: 24px;
    }

    .slide-title .subtitle {
      font-size: 28px;
      color: rgba(255,255,255,0.9);
      margin-bottom: 48px;
    }

    .slide-title .meta {
      font-size: 18px;
      color: rgba(255,255,255,0.7);
    }

    h2 {
      font-size: 42px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 40px;
    }

    h3 {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 16px;
    }

    h4 {
      font-size: 18px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 12px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 48px;
    }

    .stat-card {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      color: white;
    }

    .stat-card .number {
      font-size: 48px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .stat-card .label {
      font-size: 16px;
      opacity: 0.9;
    }

    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      margin-bottom: 40px;
    }

    .info-box {
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      padding: 24px;
      margin-bottom: 16px;
    }

    .info-box .label {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;
    }

    .info-box .value {
      font-size: 16px;
      color: #1e293b;
    }

    .campaign-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .campaign-card.featured {
      border-left: 4px solid #3b82f6;
      background: #f8fafc;
    }

    .campaign-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .campaign-name {
      font-size: 20px;
      font-weight: 700;
      color: #3b82f6;
    }

    .campaign-pct {
      font-size: 14px;
      color: #64748b;
      background: #f1f5f9;
      padding: 4px 12px;
      border-radius: 20px;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
    }

    .metric-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .metric-value {
      font-size: 15px;
      color: #1e293b;
    }

    .insight-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin-top: 24px;
      font-style: italic;
      color: #92400e;
    }

    .case-study-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 40px;
    }

    .case-study-card {
      border: 1px solid #e2e8f0;
      border-left: 4px solid #3b82f6;
      padding: 24px;
      background: white;
    }

    .case-study-name {
      font-size: 14px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 8px;
    }

    .case-study-result {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 16px;
    }

    .pain-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      margin-bottom: 40px;
    }

    .pain-category h4 {
      margin-bottom: 16px;
    }

    .pain-category ul {
      list-style: none;
    }

    .pain-category li {
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }

    .pain-category li:last-child {
      border-bottom: none;
    }

    .prop-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .prop-item {
      display: flex;
      gap: 12px;
      padding: 12px 0;
    }

    .prop-key {
      font-weight: 600;
      color: #3b82f6;
      min-width: 120px;
    }

    .prop-value {
      color: #64748b;
    }

    .strength-list, .weakness-list {
      columns: 2;
      column-gap: 48px;
    }

    .strength-list li, .weakness-list li {
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
      page-break-inside: avoid;
    }

    .ad-example-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .ad-example {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .ad-example-header {
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ad-example-header.blue { background: #3b82f6; color: white; }
    .ad-example-header.orange { background: #f59e0b; color: white; }
    .ad-example-header.purple { background: #8b5cf6; color: white; }

    .ad-example-body {
      padding: 20px;
      background: white;
    }

    .ad-example-body .hook {
      font-weight: 600;
      margin-bottom: 12px;
    }

    .ad-example-body .detail {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .highlight-box {
      padding: 32px;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .highlight-box.blue { background: #dbeafe; }
    .highlight-box.yellow { background: #fef3c7; }
    .highlight-box.purple { background: #ede9fe; }

    .highlight-box h4 {
      margin-bottom: 8px;
    }

    .highlight-box p {
      color: #475569;
    }

    .vulnerability-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }

    .vulnerability-item {
      border-left: 4px solid #3b82f6;
      padding-left: 16px;
    }

    .vulnerability-item .label {
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 4px;
    }

    .vulnerability-item .desc {
      font-size: 14px;
      color: #64748b;
    }

    @media print {
      .slide { page-break-after: always; }
      body { background: white; }
    }
  </style>
</head>
<body>

  <!-- Slide 1: Title -->
  <div class="slide slide-title">
    <h1>${this.escapeHtml(analysis.competitor)}</h1>
    <p class="subtitle">Ad Intelligence Analysis</p>
    <p class="meta">Meta Ad Library Deep Dive | ${date}</p>
  </div>

  <!-- Slide 2: Campaign Overview -->
  <div class="slide">
    <h2>Campaign Overview</h2>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="number">${analysis.totalAds}+</div>
        <div class="label">Active Ads</div>
      </div>
      <div class="stat-card">
        <div class="number">${analysis.activePeriod}</div>
        <div class="label">Active Period</div>
      </div>
      <div class="stat-card">
        <div class="number">${analysis.campaigns.length}</div>
        <div class="label">Core Campaigns</div>
      </div>
    </div>

    <div class="two-col">
      <div>
        <h4>Campaign Distribution</h4>
        ${analysis.campaigns.slice(0, 5).map(c => `
          <div class="info-box">
            <div class="label">${this.escapeHtml(c.name)}</div>
            <div class="value">${c.percentage}% (${c.variations} variations)</div>
          </div>
        `).join('')}
      </div>
      <div>
        <h4>Investment Estimate</h4>
        <div class="info-box">
          <div class="label">Conservative</div>
          <div class="value">$${analysis.investmentEstimate.conservative.toLocaleString()}/month</div>
        </div>
        <div class="info-box">
          <div class="label">Aggressive</div>
          <div class="value">$${analysis.investmentEstimate.aggressive.toLocaleString()}/month</div>
        </div>
        <div class="info-box">
          <div class="label">Duration</div>
          <div class="value">${analysis.investmentEstimate.duration}</div>
        </div>
        <div class="info-box">
          <div class="label">Signal</div>
          <div class="value">${analysis.investmentEstimate.signal}</div>
        </div>
      </div>
    </div>
  </div>

  ${this.renderCampaignSlides(analysis.campaigns)}

  <!-- Slide: Pain Points -->
  <div class="slide">
    <h2>Messaging: Pain Points Addressed</h2>

    <div class="pain-grid">
      ${analysis.painPointCategories.map(cat => `
        <div class="pain-category">
          <h4>${this.escapeHtml(cat.category)}</h4>
          <ul>
            ${cat.points.map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Slide: Value Propositions -->
  <div class="slide">
    <h2>Core Value Propositions</h2>

    <div class="prop-grid">
      ${analysis.valuePropositions.map(vp => `
        <div class="prop-item">
          <span class="prop-key">${this.escapeHtml(vp.key)}:</span>
          <span class="prop-value">${this.escapeHtml(vp.description)}</span>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Slide: Creative Execution -->
  <div class="slide">
    <h2>Creative Execution</h2>

    <div class="two-col">
      <div>
        <h4>Format</h4>
        ${analysis.creativeExecution.formats.map(f => `
          <div class="info-box">
            <div class="label">${f.type}</div>
            <div class="value">${f.percentage}% of ads</div>
          </div>
        `).join('')}
        <div class="info-box">
          <div class="label">Style</div>
          <div class="value">${analysis.creativeExecution.style}</div>
        </div>
        <div class="info-box">
          <div class="label">Production</div>
          <div class="value">${analysis.creativeExecution.production}</div>
        </div>
      </div>
      <div>
        <h4>CTA Distribution</h4>
        ${analysis.ctaDistribution.slice(0, 5).map(cta => `
          <div class="info-box">
            <div class="label">${this.escapeHtml(cta.cta)}</div>
            <div class="value">${cta.percentage}%</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- Slide: Audience Targeting -->
  <div class="slide">
    <h2>Audience Targeting</h2>

    <div class="two-col">
      <div>
        <h4>Primary Audience</h4>
        <div class="info-box">
          <div class="label">Core Target</div>
          <div class="value">${analysis.audienceTargeting.primary.join(', ')}</div>
        </div>
        <div class="info-box">
          <div class="label">Secondary</div>
          <div class="value">${analysis.audienceTargeting.secondary.join(', ')}</div>
        </div>
        <div class="info-box">
          <div class="label">Geography</div>
          <div class="value">${analysis.audienceTargeting.geography}</div>
        </div>
        <div class="info-box">
          <div class="label">Demographics</div>
          <div class="value">${analysis.audienceTargeting.demographics}</div>
        </div>
      </div>
      <div>
        <h4>Segmentation by Message</h4>
        ${analysis.audienceTargeting.segmentationByMessage.map(seg => `
          <div class="info-box">
            <div class="label">${this.escapeHtml(seg.segment)}</div>
            <div class="value">${this.escapeHtml(seg.approach)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- Slide: Strategic Strengths -->
  <div class="slide">
    <h2>Strategic Strengths</h2>

    <div class="prop-grid">
      ${analysis.strategicStrengths.map((s, i) => `
        <div class="prop-item">
          <span class="prop-key">${i + 1}.</span>
          <span class="prop-value">${this.escapeHtml(s)}</span>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Slide: Strategic Weaknesses -->
  <div class="slide">
    <h2>Strategic Weaknesses + Gaps</h2>

    <div class="prop-grid">
      ${analysis.strategicWeaknesses.map((w, i) => `
        <div class="prop-item">
          <span class="prop-key">${i + 1}.</span>
          <span class="prop-value">${this.escapeHtml(w)}</span>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Slide: Key Insights Summary -->
  <div class="slide">
    <h2>Key Insights Summary</h2>

    ${analysis.strategicStrengths.slice(0, 3).map((s, i) => {
      const colors = ['blue', 'yellow', 'purple'];
      return `
        <div class="highlight-box ${colors[i]}">
          <h4>${this.escapeHtml(s.split(' ').slice(0, 3).join(' '))}</h4>
          <p>${this.escapeHtml(s)}</p>
        </div>
      `;
    }).join('')}

    <h3 style="margin-top: 40px;">Vulnerabilities</h3>
    <div class="vulnerability-grid">
      ${analysis.strategicWeaknesses.slice(0, 6).map(w => {
        const [first, ...rest] = w.split(':');
        return `
          <div class="vulnerability-item">
            <div class="label">${this.escapeHtml(first)}</div>
            <div class="desc">${rest.length > 0 ? this.escapeHtml(rest.join(':')) : ''}</div>
          </div>
        `;
      }).join('')}
    </div>
  </div>

  ${this.renderAdExamplesSlide(analysis.campaigns)}

</body>
</html>`;
  }

  private renderCampaignSlides(campaigns: Campaign[]): string {
    return campaigns.slice(0, 4).map((campaign, index) => `
      <!-- Slide: Campaign #${index + 1} -->
      <div class="slide">
        <h2>Campaign #${index + 1}: ${this.escapeHtml(campaign.name)}</h2>

        <div class="two-col">
          <div>
            <h3>Core Message</h3>
            <div class="info-box">
              <div class="label">Hook</div>
              <div class="value">${this.escapeHtml(campaign.hook)}</div>
            </div>
            <div class="info-box">
              <div class="label">Offer</div>
              <div class="value">${this.escapeHtml(campaign.offer)}</div>
            </div>
            <div class="info-box">
              <div class="label">CTA</div>
              <div class="value">${this.escapeHtml(campaign.cta)} (${campaign.ctaPercentage}% of ads)</div>
            </div>
            ${campaign.landingPage ? `
              <div class="info-box">
                <div class="label">Landing</div>
                <div class="value">${this.escapeHtml(campaign.landingPage)}</div>
              </div>
            ` : ''}

            <h3 style="margin-top: 32px;">Target Audience</h3>
            <ul style="margin-left: 20px;">
              ${campaign.targetAudience.map(t => `<li>${this.escapeHtml(t)}</li>`).join('')}
            </ul>
          </div>

          <div>
            <h3>Campaign Metrics</h3>
            <div class="info-box">
              <div class="label">Volume</div>
              <div class="value">${campaign.percentage}% of total ad portfolio</div>
            </div>
            <div class="info-box">
              <div class="label">Variations</div>
              <div class="value">${campaign.variations} different creative executions</div>
            </div>
            <div class="info-box">
              <div class="label">Format</div>
              <div class="value">${campaign.format}</div>
            </div>

            ${campaign.caseStudy ? `
              <div class="insight-box">
                <strong>${campaign.caseStudy.name}:</strong> ${campaign.caseStudy.result}<br>
                Pain Point: ${campaign.caseStudy.painPoint}<br>
                Solution: ${campaign.caseStudy.solutionAngle}
              </div>
            ` : campaign.variations >= 5 ? `
              <div class="insight-box">
                ${campaign.variations}+ variations of the same core message shows systematic
                creative testing. This indicates a mature advertising operation.
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  private renderAdExamplesSlide(campaigns: Campaign[]): string {
    const examples = campaigns.slice(0, 4);

    const colors = ['blue', 'blue', 'orange', 'purple'];

    return `
      <!-- Slide: Ad Examples -->
      <div class="slide">
        <h2>Ad Examples: Visual Representations</h2>

        <div class="ad-example-grid">
          ${examples.map((c, i) => `
            <div class="ad-example">
              <div class="ad-example-header ${colors[i]}">${this.escapeHtml(c.name).toUpperCase()}</div>
              <div class="ad-example-body">
                <div class="hook">Hook: ${this.escapeHtml(c.hook)}</div>
                <div class="detail">Format: ${c.format}</div>
                <div class="detail">CTA: ${this.escapeHtml(c.cta)}</div>
                ${c.caseStudy ? `<div class="detail">Result: ${c.caseStudy.result}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <p style="margin-top: 24px; color: #64748b; font-size: 14px;">
          All ads analyzed from Meta Ad Library. Formats include video, image, and carousel.
        </p>
      </div>
    `;
  }

  async save(analysis: CampaignAnalysis): Promise<string> {
    const html = this.generate(analysis);

    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    const filename = this.options.filename || this.generateFilename(analysis.competitor);
    const filepath = path.join(this.options.outputDir, filename);

    fs.writeFileSync(filepath, html, 'utf-8');
    logger.info(`Intelligence report saved: ${filepath}`);

    return filepath;
  }

  private generateFilename(competitor: string): string {
    const sanitized = competitor.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitized}_intelligence_${timestamp}.html`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export function generateIntelligenceReport(
  analysis: CampaignAnalysis,
  outputDir: string
): Promise<string> {
  const generator = new IntelligenceReportGenerator({ outputDir });
  return generator.save(analysis);
}
