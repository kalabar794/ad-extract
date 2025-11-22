# AI-Powered Investigation Features

## Overview

This system now includes **AI-powered investigative analysis** using Claude to actively UNCOVER CRIMES, identify perpetrators, build criminal networks, and generate investigative leads for bringing JUSTICE to victims.

## Setup

### 1. Get Anthropic API Key

Get a free API key at: https://console.anthropic.com/

### 2. Set Environment Variable

```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

### 3. Restart Flask App

```bash
python3 app.py
```

## AI Investigation Features

### 🔍 Full Investigation Report
**URL:** `http://localhost:5001/investigate`

Analyzes ALL documents to generate comprehensive report including:
- **Documented Crimes** - Evidence of trafficking, abuse, conspiracy
- **Key Suspects** - Perpetrators and their roles
- **Criminal Network** - How the network operated
- **Victims** - Evidence of harm to victims
- **Strongest Evidence** - Most compelling evidence found
- **Investigative Leads** - What needs further investigation
- **Recommended Actions** - Next steps for justice

### 📄 Document Analysis
Analyze specific documents for:
- Criminal activity (trafficking, abuse, obstruction)
- Potential victims
- Perpetrators and facilitators
- Suspicious patterns
- Evidence of wrongdoing
- Investigative leads

### 🕸️ Relationship Network Analysis
AI-powered analysis of entity relationships:
- Key players in criminal networks
- Suspicious connections
- Facilitators and enablers
- Criminal network structure
- Investigation priorities

### 🚨 Suspicious Pattern Detection
Automatically finds documents with:
- Multiple suspicious keywords
- Evidence of cover-ups
- Coordinated communications
- Unusual transactions
- Witness tampering indicators

## API Endpoints

### Generate Investigation Report
```bash
GET /api/ai/investigation-report
```

### Analyze Document
```bash
POST /api/ai/analyze-document/<doc_id>
```

### Relationship Network
```bash
GET /api/ai/relationship-network?entity=<name>&min=5
```

### Suspicious Patterns
```bash
GET /api/ai/suspicious-patterns
```

## Python Usage

```python
from ai_investigator import (
    analyze_document_for_crimes,
    build_relationship_network,
    generate_investigation_report,
    find_suspicious_patterns
)

# Analyze a document
analysis = analyze_document_for_crimes(doc_id=2900)
print(analysis['criminal_activity_found'])
print(analysis['investigative_leads'])

# Build relationship network
network = build_relationship_network('Jeffrey Epstein', min_cooccurrence=5)
print(network['key_players'])
print(network['suspicious_connections'])

# Generate full report
report = generate_investigation_report()
print(report['executive_summary'])
print(report['documented_crimes'])
print(report['key_suspects'])

# Find suspicious patterns
patterns = find_suspicious_patterns()
print(f"Found {patterns['total_suspicious']} suspicious documents")
```

## What AI Analysis Looks For

### Criminal Activity:
- Sex trafficking
- Sexual abuse of minors
- Recruitment of victims
- Transportation of victims across state/international lines
- Financial payments related to abuse
- Conspiracy to commit crimes
- Obstruction of justice
- Witness tampering
- Evidence destruction

### Victim Indicators:
- References to young women/girls
- Ages mentioned
- Evidence of coercion
- Grooming patterns
- Recruitment methods

### Network Analysis:
- Who facilitated crimes
- Who had knowledge but didn't act
- Financial enablers
- Transportation facilitators
- Property facilitators (providing locations)
- Communication patterns

### Suspicious Patterns:
- Code words/euphemisms
- Unusual travel with minors
- Large cash payments
- NDAs and settlements
- Document destruction
- Coordinated communications
- Suspicious timing of events

## Important Notes

1. **Focus on Evidence** - AI looks for EVIDENCE of crimes, not speculation
2. **Victim Protection** - Analysis prioritizes victim safety and justice
3. **Actionable Leads** - AI generates specific investigative leads to pursue
4. **Network Mapping** - Identifies entire criminal networks, not just individuals
5. **Justice-Oriented** - All analysis focused on bringing justice to victims

## Cost

- Claude API costs approximately $0.03 per 1000 input tokens
- Full investigation report: ~$0.30-0.60 per run
- Document analysis: ~$0.05-0.15 per document
- Network analysis: ~$0.10-0.30 per analysis

Free tier includes $5 credit (enough for ~10-15 full reports).

## Downloading More Documents

Use the bulk downloader to get 50,000+ pages of official documents:

```bash
# High priority sources (5GB, ~53,000 pages)
python3 bulk_downloader.py --high-only

# All sources (10-15GB, 50,000+ pages)
python3 bulk_downloader.py
```

## Output Examples

### Investigation Report
```json
{
  "executive_summary": "Analysis of 2,900 documents reveals extensive evidence of...",
  "documented_crimes": [
    "Sex trafficking of minors across state lines (evidence in docs 45, 234, 891)",
    "Conspiracy to obstruct justice (evidence in docs 123, 456)",
    "Financial fraud related to victim payments (evidence in docs 789)"
  ],
  "key_suspects": [
    {
      "name": "Person A",
      "role": "Primary perpetrator",
      "evidence": "Direct references in 45 documents, witness testimony"
    }
  ],
  "investigative_leads": [
    "Subpoena flight logs for dates mentioned in doc 234",
    "Interview witness mentioned in doc 456",
    "Obtain financial records for accounts referenced in doc 789"
  ]
}
```

## Next Steps

1. Set up API key
2. Visit http://localhost:5001/investigate
3. Generate full investigation report
4. Analyze suspicious documents
5. Build relationship networks
6. Follow investigative leads
7. Bring justice to victims

---

**This is about JUSTICE, not gossip. Every analysis focuses on evidence of crimes and harm to victims.**
