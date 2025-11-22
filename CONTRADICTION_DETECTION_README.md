# Automated Contradiction Detection Engine

## Overview

The Contradiction Detection Engine automatically identifies contradictions, inconsistencies, and conflicting statements across depositions, testimonies, flight logs, financial records, and other documents in the Epstein Archive investigation.

This AI-powered system can detect:
- **Direct contradictions** (e.g., "I met him" vs "I never met him")
- **Temporal contradictions** (e.g., "I was in NY on June 1" vs "Flight log shows Paris on June 1")
- **Location contradictions** (e.g., different locations claimed for same event)
- **Financial contradictions** (e.g., different amounts for same transaction)
- **Relationship contradictions** (e.g., "I know them" vs "I don't know them")

## Key Features

### 1. Automated Claim Extraction
- Uses **spaCy NLP** to parse documents and extract structured claims
- Identifies subject-verb-object triples
- Extracts temporal information (dates, times)
- Extracts location information
- Detects negation patterns
- Assesses claim certainty levels (high, medium, low)

### 2. Semantic Similarity Analysis
- Uses **Sentence Transformers** for deep semantic understanding
- Generates vector embeddings for each claim
- Calculates cosine similarity to find related claims
- Identifies semantically similar but contradictory statements

### 3. Multi-Type Contradiction Detection

#### Temporal Contradictions
Detects when the same person or event is placed at different times:
```
Claim 1: "I was in New York on July 4, 2001"
Claim 2: "On July 4, 2001, I was in Paris"
→ HIGH SEVERITY temporal contradiction
```

#### Location Contradictions
Identifies conflicting location claims:
```
Claim 1: "I never visited his island"
Claim 2: "I visited Little St. James twice in 2001"
→ HIGH SEVERITY location contradiction
```

#### Financial Contradictions
Flags different amounts for the same transaction:
```
Claim 1: "The business deal was worth $100,000"
Claim 2: "The transaction was for $500,000"
→ MEDIUM SEVERITY financial contradiction
```

#### Relationship Contradictions
Catches contradictory relationship statements:
```
Claim 1: "I met Jeffrey Epstein in June 2001"
Claim 2: "I don't recall ever meeting Jeffrey Epstein"
→ HIGH SEVERITY relationship contradiction
```

#### Negation Contradictions
Detects when claims have opposite truth values:
```
Claim 1: "I have no knowledge of illegal activities"
Claim 2: "I witnessed several concerning activities"
→ HIGH SEVERITY negation contradiction
```

### 4. Intelligent Scoring

Each contradiction receives:
- **Severity Level**: High, Medium, or Low
- **Confidence Score**: 0.0 to 1.0 based on semantic similarity
- **Type Classification**: temporal, location, financial, relationship, negation, action
- **Automated Explanation**: Natural language description of the contradiction

### 5. Cross-Document Analysis
- Compares claims across all documents
- Links contradictions to source documents
- Tracks speakers/witnesses
- Enables speaker-specific contradiction analysis

## Database Schema

### Claims Table
Stores extracted claims with full context:
```sql
- id: Unique identifier
- source_doc_id: Reference to source document
- claim_text: The actual claim
- claim_type: temporal, location, financial, relationship, action, general
- speaker: Person making the claim
- subject, predicate, object: Parsed claim components
- temporal_info: Extracted dates/times
- location_info: Extracted locations
- has_negation: Boolean flag
- certainty_level: high, medium, low
- context: Surrounding text
- embedding_vector: Semantic embedding for similarity
```

### Contradictions Table
Stores detected contradictions:
```sql
- id: Unique identifier
- claim1_id, claim2_id: References to conflicting claims
- contradiction_type: Type of contradiction
- severity: high, medium, low
- confidence_score: 0.0 to 1.0
- semantic_similarity: Similarity score
- explanation: Natural language explanation
- verified: Boolean (investigator confirmation)
- investigator_notes: Manual notes
```

## API Endpoints

### Initialize System
```http
POST /api/contradictions/init
```
Initializes database tables for contradiction detection.

### Process Single Document
```http
POST /api/contradictions/process/<doc_id>
Body: { "speaker": "John Doe" }
```
Processes one document to extract claims and detect contradictions.

### Process All Documents
```http
POST /api/contradictions/process-all
```
Processes entire document database. Returns statistics.

**Response:**
```json
{
  "success": true,
  "documents_processed": 50,
  "total_claims": 1247,
  "total_contradictions": 89
}
```

### Get All Contradictions
```http
GET /api/contradictions?confidence=0.7&severity=high
```
Retrieves contradictions with optional filters.

**Query Parameters:**
- `confidence`: Minimum confidence score (0.0-1.0)
- `severity`: Filter by severity (high, medium, low)

### Get Statistics
```http
GET /api/contradictions/stats
```
Returns comprehensive statistics.

**Response:**
```json
{
  "total_contradictions": 89,
  "total_claims": 1247,
  "high_confidence_contradictions": 34,
  "by_severity": {
    "high": 45,
    "medium": 28,
    "low": 16
  },
  "by_type": {
    "temporal": 23,
    "location": 18,
    "relationship": 15,
    "financial": 12,
    "negation": 21
  },
  "top_speakers": [
    {"speaker": "John Doe", "count": 12},
    {"speaker": "Jane Smith", "count": 8}
  ]
}
```

### Get High Priority Contradictions
```http
GET /api/contradictions/high-priority
```
Returns only high-severity, high-confidence contradictions.

### Get Contradictions by Speaker
```http
GET /api/contradictions/by-speaker/<speaker_name>
```
Returns all contradictions involving a specific person.

### Verify Contradiction
```http
POST /api/contradictions/verify/<contradiction_id>
Body: { "notes": "Confirmed after cross-referencing" }
```
Marks a contradiction as verified by an investigator.

## Web Interface

Access the Contradiction Detection Dashboard at:
```
http://localhost:5001/contradictions
```

### Dashboard Features

1. **Statistics Overview**
   - Total contradictions found
   - Breakdown by severity (High/Medium/Low)
   - Total claims analyzed
   - High-confidence contradiction count

2. **Controls**
   - Initialize system
   - Process all documents
   - Refresh data
   - Show high priority only

3. **Filters**
   - Filter by severity level
   - Minimum confidence threshold
   - Search by speaker name

4. **Contradiction Display**
   - Side-by-side claim comparison
   - Severity badges (color-coded)
   - Confidence scores
   - Automated analysis/explanation
   - Source document links
   - Verification controls

5. **Investigator Tools**
   - Verify contradictions
   - Add investigator notes
   - Track verified vs unverified contradictions

## Usage Workflow

### Initial Setup
```python
# 1. Install dependencies
pip install sentence-transformers

# 2. Initialize the system
python3 contradiction_detector.py
```

### Via Python API
```python
from contradiction_detector import (
    init_contradiction_tables,
    process_document_for_contradictions,
    get_all_contradictions,
    get_contradiction_stats
)

# Initialize tables
init_contradiction_tables()

# Process a document
result = process_document_for_contradictions(
    doc_id=42,
    speaker="John Doe"
)
print(f"Extracted {result['claims_extracted']} claims")
print(f"Found {result['contradictions_found']} contradictions")

# Get all high-severity contradictions
contradictions = get_all_contradictions(
    min_confidence=0.7,
    severity='high'
)

# Get statistics
stats = get_contradiction_stats()
print(f"Total: {stats['total_contradictions']}")
```

### Via Web Interface
1. Navigate to `http://localhost:5001/contradictions`
2. Click "Initialize System" (first time only)
3. Click "Process All Documents"
4. Review detected contradictions
5. Filter and sort as needed
6. Verify important contradictions
7. Add investigator notes

### Via API
```bash
# Initialize
curl -X POST http://localhost:5001/api/contradictions/init

# Process all documents
curl -X POST http://localhost:5001/api/contradictions/process-all

# Get high-priority contradictions
curl http://localhost:5001/api/contradictions/high-priority

# Get contradictions by specific person
curl http://localhost:5001/api/contradictions/by-speaker/John%20Doe

# Verify a contradiction
curl -X POST http://localhost:5001/api/contradictions/verify/5 \
  -H "Content-Type: application/json" \
  -d '{"notes": "Cross-referenced with flight logs"}'
```

## Testing

Run the test suite:
```bash
python3 test_contradiction_detector.py
```

The test creates sample contradictory documents and demonstrates:
- Claim extraction
- Contradiction detection across document types
- Different contradiction types
- Severity and confidence scoring

## Performance Considerations

### Computational Requirements
- **NLP Processing**: Requires spaCy models (~500MB)
- **Semantic Embeddings**: Sentence Transformers (~400MB)
- **First Run**: Models download automatically
- **Processing Speed**: ~10-50 claims per second (CPU-dependent)

### Scalability
- Claims are processed incrementally
- Embeddings are cached in database
- Indexes optimize query performance
- For large datasets (10,000+ documents):
  - Process in batches
  - Consider GPU acceleration for embeddings
  - Increase database connection pooling

### Memory Usage
- Typical: 1-2 GB RAM
- Large batch processing: 4-8 GB RAM
- Model loading: ~1 GB

## Advanced Features

### Custom Claim Types
Extend `determine_claim_type()` in `contradiction_detector.py` to detect domain-specific claim types.

### Adjust Similarity Threshold
Modify `threshold` parameter in `detect_contradictions_for_claim()`:
- Lower (0.5-0.6): More contradictions, some false positives
- Higher (0.8-0.9): Fewer contradictions, very high precision

### Speaker Attribution
System automatically extracts speaker from filenames like:
- `deposition_john_doe.txt` → Speaker: "John Doe"
- Or provide manually via API

## Integration with Other Systems

### Timeline Integration
Contradictions can be cross-referenced with timeline events to verify temporal claims.

### Flight Log Verification
Location and temporal claims are automatically checked against flight records.

### Financial Records
Financial contradiction detection integrates with the financial tracker.

## Troubleshooting

### Dependencies Not Installing
```bash
# Install spaCy model manually
python3 -m spacy download en_core_web_sm

# Install sentence-transformers
pip3 install sentence-transformers
```

### No Contradictions Found
- Ensure documents have been processed: `POST /api/contradictions/process-all`
- Lower confidence threshold
- Check that documents contain actual claims (not just file listings)

### Slow Performance
- First run downloads ML models (one-time)
- Embeddings are computed once per claim
- Use batch processing for large datasets
- Consider upgrading to GPU-enabled environment

## Future Enhancements

Potential improvements:
1. **Entity-aware detection**: Link contradictions to entity network
2. **Timeline visualization**: Show contradictions on timeline
3. **Automated report generation**: Create contradiction summaries
4. **Machine learning refinement**: Learn from verified contradictions
5. **Multi-language support**: Detect contradictions across languages
6. **Voice stress analysis**: Integrate with audio depositions

## Citations & Research

This system employs state-of-the-art NLP techniques:
- **spaCy**: Industrial-strength NLP (Explosion AI)
- **Sentence Transformers**: Semantic similarity (UKP Lab, TU Darmstadt)
- **BERT-based embeddings**: Deep contextual understanding

## License & Credits

Part of the Epstein Archive Investigator project.
Developed for investigative journalism and legal research purposes.

## Support

For issues or questions:
1. Check this documentation
2. Review test cases in `test_contradiction_detector.py`
3. Examine example contradictions in the web interface
4. Consult the API endpoint documentation above

---

**Last Updated**: November 2025
**Version**: 1.0
**Status**: Production Ready
