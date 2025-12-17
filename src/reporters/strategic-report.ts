/**
 * Strategic Report Generator
 *
 * Generates beautiful HTML/PDF reports matching the example format
 */

import { StrategicAnalysis } from '../analyzers/strategic-intelligence';
import * as fs from 'fs';
import * as path from 'path';

export function generateStrategicReportHTML(analysis: StrategicAnalysis): string {
  const {
    competitor,
    platform,
    dateRange,
    totalAds,
    activeDuration,
    coreCampaigns,
    campaigns,
    investment,
    caseStudies,
    painPointCategories,
    valuePropositions,
    creativeExecution,
    audienceTargeting,
    strengths,
    weaknesses,
    keyInsights,
    adExamples
  } = analysis;

  const platformDisplay = platform.charAt(0).toUpperCase() + platform.slice(1);
  const now = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${competitor} - Ad Intelligence Analysis</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.6;
    }

    .page {
      width: 100%;
      min-height: 100vh;
      padding: 60px;
      page-break-after: always;
      position: relative;
    }

    .page:last-child {
      page-break-after: auto;
    }

    /* Cover Page */
    .cover-page {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 80px;
    }

    .cover-title {
      font-size: 72px;
      font-weight: 800;
      margin-bottom: 20px;
      line-height: 1.1;
    }

    .cover-subtitle {
      font-size: 28px;
      font-weight: 400;
      opacity: 0.9;
      margin-bottom: 40px;
    }

    .cover-meta {
      font-size: 18px;
      opacity: 0.8;
    }

    /* Section Headers */
    .section-title {
      font-size: 36px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 40px;
    }

    .subsection-title {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 20px;
    }

    /* Stat Cards */
    .stats-row {
      display: flex;
      gap: 20px;
      margin-bottom: 40px;
    }

    .stat-card {
      flex: 1;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 16px;
      padding: 30px;
      color: white;
      text-align: center;
    }

    .stat-value {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 16px;
      opacity: 0.9;
    }

    /* Info Cards */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }

    .info-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      border-left: 4px solid #3b82f6;
    }

    .info-card-title {
      font-size: 18px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 16px;
    }

    .info-item {
      margin-bottom: 10px;
      font-size: 15px;
    }

    .info-item strong {
      color: #1a1a2e;
    }

    /* Campaign Card */
    .campaign-card {
      background: #fff;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    .campaign-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .campaign-name {
      font-size: 28px;
      font-weight: 700;
      color: #3b82f6;
    }

    .campaign-metrics {
      text-align: right;
    }

    .campaign-percentage {
      font-size: 32px;
      font-weight: 800;
      color: #3b82f6;
    }

    .campaign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    /* Highlight Box */
    .highlight-box {
      background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%);
      border-radius: 12px;
      padding: 24px;
      color: white;
      text-align: center;
      margin-bottom: 30px;
    }

    .highlight-value {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .highlight-label {
      font-size: 16px;
      opacity: 0.9;
    }

    /* Component Card */
    .component-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }

    .component-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid #3b82f6;
    }

    .component-title {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 10px;
    }

    .component-text {
      font-size: 14px;
      color: #4b5563;
    }

    /* Case Study Grid */
    .case-study-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }

    .case-study-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      border-left: 4px solid #3b82f6;
    }

    .case-study-name {
      font-size: 14px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 8px;
    }

    .case-study-result {
      font-size: 28px;
      font-weight: 800;
      color: #1a1a2e;
      margin-bottom: 12px;
    }

    .case-study-detail {
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 6px;
    }

    /* Purple variant */
    .case-study-card.purple {
      border-left-color: #8b5cf6;
    }

    .case-study-card.purple .case-study-name {
      color: #8b5cf6;
    }

    /* Pain Points Grid */
    .pain-points-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      margin-bottom: 40px;
    }

    .pain-category {
      background: #fff;
    }

    .pain-category-title {
      font-size: 18px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 16px;
    }

    .pain-item {
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 10px;
      padding-left: 16px;
      position: relative;
    }

    .pain-item::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #3b82f6;
    }

    /* Value Props */
    .value-props-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 40px;
    }

    .value-prop {
      font-size: 15px;
      margin-bottom: 12px;
    }

    .value-prop strong {
      color: #1a1a2e;
    }

    /* Key Insights */
    .insight-card {
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .insight-card.blue {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
    }

    .insight-card.yellow {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
    }

    .insight-card.purple {
      background: #ede9fe;
      border-left: 4px solid #8b5cf6;
    }

    .insight-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .insight-card.blue .insight-title { color: #3b82f6; }
    .insight-card.yellow .insight-title { color: #d97706; }
    .insight-card.purple .insight-title { color: #7c3aed; }

    .insight-description {
      font-size: 15px;
      color: #4b5563;
    }

    /* Vulnerabilities Grid */
    .vulnerabilities-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 24px;
    }

    .vulnerability-item {
      background: #f8fafc;
      border-radius: 8px;
      padding: 16px;
      border-left: 4px solid #3b82f6;
    }

    .vulnerability-label {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 4px;
    }

    .vulnerability-text {
      font-size: 13px;
      color: #6b7280;
    }

    /* Ad Examples */
    .ad-examples-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }

    .ad-example-card {
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid;
    }

    .ad-example-card.blue { border-color: #3b82f6; }
    .ad-example-card.orange { border-color: #f97316; }
    .ad-example-card.purple { border-color: #8b5cf6; }
    .ad-example-card.green { border-color: #10b981; }

    .ad-example-header {
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }

    .ad-example-card.blue .ad-example-header { background: #3b82f6; }
    .ad-example-card.orange .ad-example-header { background: #f97316; }
    .ad-example-card.purple .ad-example-header { background: #8b5cf6; }
    .ad-example-card.green .ad-example-header { background: #10b981; }

    .ad-example-body {
      padding: 20px;
      background: white;
    }

    .ad-example-hook {
      font-size: 14px;
      margin-bottom: 8px;
    }

    .ad-example-hook strong {
      color: #1a1a2e;
    }

    .ad-example-details {
      font-size: 13px;
      color: #6b7280;
    }

    .ad-example-result {
      font-size: 24px;
      font-weight: 800;
      color: #8b5cf6;
      margin-bottom: 12px;
    }

    /* Strengths/Weaknesses List */
    .sw-list {
      list-style: none;
    }

    .sw-item {
      font-size: 18px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 16px;
    }

    /* Note Box */
    .note-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
      font-size: 15px;
      color: #92400e;
    }

    /* Inference Box */
    .inference-box {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
      font-size: 15px;
      color: #1e40af;
    }

    .inference-box strong {
      color: #1e40af;
    }

    /* Two Column Layout */
    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }

    /* Print Styles */
    @media print {
      .page {
        padding: 40px;
        page-break-inside: avoid;
      }

      .cover-page {
        padding: 60px;
      }

      .cover-title {
        font-size: 56px;
      }
    }

    @page {
      size: A4 landscape;
      margin: 0;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover-page">
    <h1 class="cover-title">${competitor}</h1>
    <p class="cover-subtitle">Ad Intelligence Analysis</p>
    <p class="cover-meta">${platformDisplay} Ad Library Deep Dive | ${currentMonth}</p>
  </div>

  <!-- Campaign Overview -->
  <div class="page">
    <h2 class="section-title">Campaign Overview</h2>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">${totalAds}+</div>
        <div class="stat-label">Active ${platformDisplay} Ads</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${activeDuration}</div>
        <div class="stat-label">Sustained</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${coreCampaigns}</div>
        <div class="stat-label">Core Campaigns</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-title">Campaign Distribution</div>
        ${campaigns.slice(0, 4).map(c => `
          <div class="info-item"><strong>${c.name}:</strong> ${c.percentage}% (${c.variations} variations)</div>
        `).join('')}
      </div>
      <div class="info-card">
        <div class="info-card-title">Investment Estimate</div>
        <div class="info-item"><strong>Conservative:</strong> ${investment.conservative}</div>
        <div class="info-item"><strong>Aggressive:</strong> ${investment.aggressive}</div>
        <div class="info-item"><strong>Duration:</strong> ${investment.duration}</div>
        <div class="info-item"><strong>Signal:</strong> ${investment.signal}</div>
      </div>
    </div>
  </div>

  ${campaigns.slice(0, 4).map((campaign, index) => `
  <!-- Campaign #${index + 1} -->
  <div class="page">
    <h2 class="section-title">Campaign #${index + 1}: ${campaign.name}</h2>

    <div class="campaign-grid">
      <div>
        <h3 class="subsection-title">Core Message</h3>
        <div class="info-item"><strong>Hook:</strong> "${campaign.hook}"</div>
        ${campaign.offer ? `<div class="info-item"><strong>Offer:</strong> ${campaign.offer}</div>` : ''}
        <div class="info-item"><strong>CTA:</strong> ${campaign.cta} (${campaign.ctaPercentage}% of ads)</div>
        <div class="info-item"><strong>Landing:</strong> ${campaign.landingPage}</div>

        ${campaign.targetAudience.length > 0 ? `
        <h3 class="subsection-title" style="margin-top: 24px;">Target Audience</h3>
        <ul style="list-style: disc; padding-left: 20px;">
          ${campaign.targetAudience.map(a => `<li style="margin-bottom: 8px;">${a}</li>`).join('')}
        </ul>
        ` : ''}
      </div>
      <div>
        <h3 class="subsection-title">Campaign Metrics</h3>
        <div class="info-card">
          <div class="info-item"><strong>Volume:</strong> ${campaign.percentage}% of total ad portfolio</div>
          <div class="info-item"><strong>Variations:</strong> ${campaign.variations} different creative executions</div>
          <div class="info-item"><strong>Format:</strong> ${campaign.format}</div>
        </div>

        ${campaign.insights.length > 0 ? `
        <div class="note-box" style="margin-top: 20px;">
          ${campaign.insights[0]}
        </div>
        ` : ''}
      </div>
    </div>
  </div>
  `).join('')}

  ${caseStudies.length > 0 ? `
  <!-- Case Studies -->
  <div class="page">
    <h2 class="section-title">Case Study Factory</h2>
    <p style="margin-bottom: 30px; color: #6b7280;">${caseStudies.length} case studies with specific numbers targeting different pain points</p>

    <div class="case-study-grid">
      ${caseStudies.slice(0, 6).map((cs, i) => `
      <div class="case-study-card ${i % 2 === 0 ? '' : 'purple'}">
        <div class="case-study-name">${cs.name}</div>
        <div class="case-study-result">${cs.result}</div>
        <div class="case-study-detail"><strong>Pain Point:</strong> ${cs.painPoint}</div>
        <div class="case-study-detail"><strong>Solution Angle:</strong> ${cs.solutionAngle}</div>
        <div class="case-study-detail"><strong>Hook:</strong> "${cs.hook.substring(0, 50)}..."</div>
      </div>
      `).join('')}
    </div>

    <div class="note-box">
      <strong>Pattern:</strong> Each case study video uses oddly-specific numbers (196% not 200%, $91K not $100K) to signal authenticity and bypass skepticism.
    </div>
  </div>
  ` : ''}

  <!-- Pain Points Analysis -->
  <div class="page">
    <h2 class="section-title">Messaging: Pain Points Addressed</h2>

    <div class="pain-points-grid">
      ${painPointCategories.map(cat => `
      <div class="pain-category">
        <div class="pain-category-title">${cat.category}</div>
        ${cat.painPoints.map(p => `<div class="pain-item">${p}</div>`).join('')}
      </div>
      `).join('')}
    </div>
  </div>

  <!-- Value Propositions -->
  <div class="page">
    <h2 class="section-title">Core Value Propositions</h2>

    <div class="value-props-grid">
      ${valuePropositions.map(vp => `
      <div class="value-prop">
        <strong>${vp.label}:</strong> ${vp.description}
      </div>
      `).join('')}
    </div>
  </div>

  <!-- Creative Execution -->
  <div class="page">
    <h2 class="section-title">Creative Execution</h2>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-title">Format</div>
        <div class="info-item"><strong>Length:</strong> ${creativeExecution.lengthRange}</div>
        <div class="info-item"><strong>Style:</strong> ${creativeExecution.style}</div>
        <div class="info-item"><strong>Production:</strong> ${creativeExecution.production}</div>
      </div>
      <div class="info-card">
        <div class="info-card-title">CTA Distribution</div>
        ${creativeExecution.ctaDistribution.slice(0, 4).map(cta => `
          <div class="info-item"><strong>${cta.cta}:</strong> ${cta.percentage}%</div>
        `).join('')}
      </div>
    </div>

    <div class="info-grid" style="margin-top: 20px;">
      <div class="info-card">
        <div class="info-card-title">Landing Pages</div>
        <div class="info-item"><strong>${creativeExecution.variations}+ variations</strong> of campaign themes</div>
        <div class="info-item"><strong>${creativeExecution.duration}</strong> sustained</div>
      </div>
      <div class="info-card">
        <div class="info-card-title">Optimization</div>
        <div class="info-item">${creativeExecution.optimization}</div>
      </div>
    </div>
  </div>

  <!-- Audience Targeting -->
  <div class="page">
    <h2 class="section-title">Audience Targeting</h2>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-title">Primary Audience</div>
        <div class="info-item"><strong>Core Target:</strong> ${audienceTargeting.primary.coreTarget}</div>
        <div class="info-item"><strong>Secondary:</strong> ${audienceTargeting.primary.secondary}</div>
        <div class="info-item"><strong>Geography:</strong> ${audienceTargeting.primary.geography}</div>
        <div class="info-item"><strong>Demographics:</strong> ${audienceTargeting.primary.demographics}</div>
      </div>
      <div class="info-card">
        <div class="info-card-title">Segmentation by Message</div>
        ${audienceTargeting.segmentation.map(s => `
          <div class="info-item"><strong>${s.segment}:</strong> ${s.message}</div>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- Strategic Strengths -->
  <div class="page">
    <h2 class="section-title">Strategic Strengths</h2>

    <div class="two-column">
      <ol class="sw-list">
        ${strengths.slice(0, 3).map((s, i) => `
          <li class="sw-item">${i + 1}. ${s.title}</li>
        `).join('')}
      </ol>
      <ol class="sw-list" start="${Math.min(strengths.length, 3) + 1}">
        ${strengths.slice(3, 6).map((s, i) => `
          <li class="sw-item">${i + 4}. ${s.title}</li>
        `).join('')}
      </ol>
    </div>
  </div>

  <!-- Strategic Weaknesses -->
  <div class="page">
    <h2 class="section-title">Strategic Weaknesses + Gaps</h2>

    <div class="two-column">
      <ol class="sw-list">
        ${weaknesses.slice(0, 3).map((w, i) => `
          <li class="sw-item">${i + 1}. ${w.title}</li>
        `).join('')}
      </ol>
      <ol class="sw-list" start="${Math.min(weaknesses.length, 3) + 1}">
        ${weaknesses.slice(3, 6).map((w, i) => `
          <li class="sw-item">${i + 4}. ${w.title}</li>
        `).join('')}
      </ol>
    </div>
  </div>

  <!-- Key Insights Summary -->
  <div class="page">
    <h2 class="section-title">Key Insights Summary</h2>

    ${keyInsights.map(insight => `
    <div class="insight-card ${insight.color}">
      <div class="insight-title">${insight.title}</div>
      <div class="insight-description">${insight.description}</div>
    </div>
    `).join('')}

    <h3 class="subsection-title" style="margin-top: 30px;">Vulnerabilities</h3>
    <div class="vulnerabilities-grid">
      ${weaknesses.slice(0, 6).map(w => `
      <div class="vulnerability-item">
        <div class="vulnerability-label">${w.title.split(':')[0]}</div>
        <div class="vulnerability-text">${w.description.substring(0, 60)}...</div>
      </div>
      `).join('')}
    </div>
  </div>

  ${adExamples.length > 0 ? `
  <!-- Ad Examples -->
  <div class="page">
    <h2 class="section-title">Ad Examples</h2>

    ${adExamples.map(group => `
    <h3 class="subsection-title">${group.category}</h3>
    <div class="ad-examples-grid">
      ${group.ads.slice(0, 4).map((ad, i) => `
      <div class="ad-example-card ${i % 4 === 0 ? 'blue' : i % 4 === 1 ? 'orange' : i % 4 === 2 ? 'purple' : 'green'}">
        <div class="ad-example-header">${ad.label}</div>
        <div class="ad-example-body">
          ${ad.result ? `<div class="ad-example-result">${ad.result}</div>` : ''}
          <div class="ad-example-hook"><strong>Hook:</strong> "${ad.hook.substring(0, 60)}${ad.hook.length > 60 ? '...' : ''}"</div>
          <div class="ad-example-details">${ad.details}</div>
        </div>
      </div>
      `).join('')}
    </div>
    `).join('')}

    <div class="inference-box">
      <strong>Pattern:</strong> All ads are video format, 30-60 seconds, landing on lead magnet pages or case study pages for nurturing.
    </div>
  </div>
  ` : ''}

</body>
</html>`;
}

export async function generateStrategicReportPDF(
  analysis: StrategicAnalysis,
  outputPath: string
): Promise<string> {
  const html = generateStrategicReportHTML(analysis);

  // Save HTML first
  const htmlPath = outputPath.replace('.pdf', '.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  // Try to use Puppeteer for PDF
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();

    return outputPath;
  } catch (error) {
    console.warn('Puppeteer PDF generation failed, HTML report saved:', htmlPath);
    return htmlPath;
  }
}

export async function saveStrategicReport(
  analysis: StrategicAnalysis,
  outputDir: string
): Promise<{ html: string; pdf?: string; json: string }> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const baseName = `${analysis.competitor.replace(/[^a-zA-Z0-9]/g, '_')}_strategic_${timestamp}`;

  // Save JSON
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(analysis, null, 2), 'utf-8');

  // Save HTML
  const htmlPath = path.join(outputDir, `${baseName}.html`);
  const html = generateStrategicReportHTML(analysis);
  fs.writeFileSync(htmlPath, html, 'utf-8');

  // Try PDF
  const pdfPath = path.join(outputDir, `${baseName}.pdf`);
  let finalPdfPath: string | undefined;

  try {
    finalPdfPath = await generateStrategicReportPDF(analysis, pdfPath);
    if (finalPdfPath.endsWith('.html')) {
      finalPdfPath = undefined;
    }
  } catch (error) {
    console.warn('PDF generation failed');
  }

  return {
    html: htmlPath,
    pdf: finalPdfPath,
    json: jsonPath
  };
}
