"""
Automated Contradiction Detection Engine
Analyzes documents to find contradictions, inconsistencies, and conflicting statements
"""

import sqlite3
import re
from datetime import datetime
from collections import defaultdict, Counter
import json
import hashlib
from typing import List, Dict, Tuple, Optional
import spacy
from sentence_transformers import SentenceTransformer
import numpy as np

# Load models lazily
_nlp = None
_embedder = None

def get_nlp():
    """Lazy load spaCy model"""
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load('en_core_web_sm')
        except:
            import os
            os.system('python3 -m spacy download en_core_web_sm')
            _nlp = spacy.load('en_core_web_sm')
    return _nlp

def get_embedder():
    """Lazy load sentence transformer model"""
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedder

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_contradiction_tables():
    """Initialize database tables for contradiction detection"""
    conn = get_db()
    c = conn.cursor()

    # Claims table - stores extracted claims from documents
    c.execute('''CREATE TABLE IF NOT EXISTS claims
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  source_doc_id INTEGER NOT NULL,
                  claim_text TEXT NOT NULL,
                  claim_type TEXT,
                  speaker TEXT,
                  subject TEXT,
                  predicate TEXT,
                  object TEXT,
                  temporal_info TEXT,
                  location_info TEXT,
                  has_negation BOOLEAN DEFAULT 0,
                  certainty_level TEXT,
                  extracted_date TEXT,
                  context TEXT,
                  embedding_vector TEXT,
                  FOREIGN KEY (source_doc_id) REFERENCES documents(id))''')

    # Contradictions table - stores detected contradictions
    c.execute('''CREATE TABLE IF NOT EXISTS contradictions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  claim1_id INTEGER NOT NULL,
                  claim2_id INTEGER NOT NULL,
                  contradiction_type TEXT NOT NULL,
                  severity TEXT NOT NULL,
                  confidence_score REAL NOT NULL,
                  semantic_similarity REAL,
                  explanation TEXT,
                  detected_date TEXT NOT NULL,
                  verified BOOLEAN DEFAULT 0,
                  investigator_notes TEXT,
                  FOREIGN KEY (claim1_id) REFERENCES claims(id),
                  FOREIGN KEY (claim2_id) REFERENCES claims(id))''')

    # Claim entities - links claims to entities
    c.execute('''CREATE TABLE IF NOT EXISTS claim_entities
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  claim_id INTEGER NOT NULL,
                  entity_id INTEGER NOT NULL,
                  entity_role TEXT,
                  FOREIGN KEY (claim_id) REFERENCES claims(id),
                  FOREIGN KEY (entity_id) REFERENCES entities(id))''')

    # Create indexes for performance
    c.execute('CREATE INDEX IF NOT EXISTS idx_claims_doc ON claims(source_doc_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_claims_speaker ON claims(speaker)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_contradictions_claims ON contradictions(claim1_id, claim2_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_contradictions_severity ON contradictions(severity)')

    conn.commit()
    conn.close()

def extract_claims_from_text(text: str, doc_id: int, speaker: Optional[str] = None) -> List[Dict]:
    """
    Extract structured claims from text using NLP
    Returns list of claim dictionaries
    """
    nlp = get_nlp()
    claims = []

    # Split into sentences
    doc = nlp(text)

    for sent in doc.sents:
        sent_text = sent.text.strip()
        if len(sent_text) < 10:  # Skip very short sentences
            continue

        # Extract claim components
        claim = {
            'claim_text': sent_text,
            'speaker': speaker,
            'subject': None,
            'predicate': None,
            'object': None,
            'temporal_info': None,
            'location_info': None,
            'has_negation': False,
            'certainty_level': 'medium',
            'context': text[max(0, sent.start_char - 100):min(len(text), sent.end_char + 100)]
        }

        # Detect negation
        negation_words = {'no', 'not', 'never', 'neither', 'nobody', 'nothing', 'nowhere', 'none'}
        if any(token.text.lower() in negation_words for token in sent):
            claim['has_negation'] = True

        # Extract subject-verb-object
        for token in sent:
            if token.dep_ == 'nsubj' or token.dep_ == 'nsubjpass':
                claim['subject'] = token.text
            elif token.pos_ == 'VERB' and token.dep_ in ['ROOT', 'aux', 'auxpass']:
                claim['predicate'] = token.lemma_
            elif token.dep_ in ['dobj', 'pobj', 'attr']:
                claim['object'] = token.text

        # Extract temporal information
        temporal_entities = [ent.text for ent in sent.ents if ent.label_ == 'DATE']
        if temporal_entities:
            claim['temporal_info'] = ', '.join(temporal_entities)

        # Extract location information
        location_entities = [ent.text for ent in sent.ents if ent.label_ in ['GPE', 'LOC']]
        if location_entities:
            claim['location_info'] = ', '.join(location_entities)

        # Determine certainty level
        uncertainty_words = {'maybe', 'perhaps', 'possibly', 'might', 'could', 'allegedly', 'reportedly'}
        certainty_words = {'definitely', 'certainly', 'absolutely', 'always', 'never'}

        tokens_lower = {token.text.lower() for token in sent}
        if any(word in tokens_lower for word in uncertainty_words):
            claim['certainty_level'] = 'low'
        elif any(word in tokens_lower for word in certainty_words):
            claim['certainty_level'] = 'high'

        # Determine claim type
        claim['claim_type'] = determine_claim_type(sent_text, claim)

        claims.append(claim)

    return claims

def determine_claim_type(text: str, claim: Dict) -> str:
    """Determine the type of claim"""
    text_lower = text.lower()

    # Temporal claims
    if claim['temporal_info'] or any(word in text_lower for word in ['when', 'date', 'time', 'year', 'month']):
        return 'temporal'

    # Location claims
    if claim['location_info'] or any(word in text_lower for word in ['where', 'location', 'place', 'at', 'in ']):
        return 'location'

    # Financial claims
    if any(word in text_lower for word in ['$', 'paid', 'money', 'payment', 'transfer', 'amount']):
        return 'financial'

    # Relationship claims
    if any(word in text_lower for word in ['met', 'know', 'friend', 'relationship', 'worked with', 'associated']):
        return 'relationship'

    # Action claims
    if claim['predicate']:
        return 'action'

    return 'general'

def save_claim(claim: Dict, doc_id: int) -> int:
    """Save a claim to the database and return its ID"""
    conn = get_db()
    c = conn.cursor()

    # Generate embedding for semantic similarity
    embedder = get_embedder()
    embedding = embedder.encode([claim['claim_text']])[0]
    embedding_json = json.dumps(embedding.tolist())

    c.execute('''INSERT INTO claims
                 (source_doc_id, claim_text, claim_type, speaker, subject, predicate, object,
                  temporal_info, location_info, has_negation, certainty_level, extracted_date,
                  context, embedding_vector)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
              (doc_id, claim['claim_text'], claim['claim_type'], claim.get('speaker'),
               claim.get('subject'), claim.get('predicate'), claim.get('object'),
               claim.get('temporal_info'), claim.get('location_info'), claim['has_negation'],
               claim['certainty_level'], datetime.now().isoformat(), claim.get('context'),
               embedding_json))

    claim_id = c.lastrowid
    conn.commit()
    conn.close()

    return claim_id

def detect_contradictions_for_claim(claim_id: int, threshold: float = 0.7) -> List[Dict]:
    """
    Detect contradictions for a specific claim against all other claims
    Returns list of contradiction dictionaries
    """
    conn = get_db()
    c = conn.cursor()

    # Get the claim
    c.execute('SELECT * FROM claims WHERE id = ?', (claim_id,))
    claim1 = dict(c.fetchone())

    if not claim1['embedding_vector']:
        return []

    embedding1 = np.array(json.loads(claim1['embedding_vector']))

    # Get all other claims
    c.execute('SELECT * FROM claims WHERE id != ?', (claim_id,))
    all_claims = [dict(row) for row in c.fetchall()]

    contradictions = []

    for claim2 in all_claims:
        if not claim2['embedding_vector']:
            continue

        embedding2 = np.array(json.loads(claim2['embedding_vector']))

        # Calculate semantic similarity
        similarity = float(np.dot(embedding1, embedding2) /
                          (np.linalg.norm(embedding1) * np.linalg.norm(embedding2)))

        # Check for contradictions
        contradiction = check_contradiction(claim1, claim2, similarity, threshold)

        if contradiction:
            contradictions.append(contradiction)

    conn.close()
    return contradictions

def check_contradiction(claim1: Dict, claim2: Dict, similarity: float, threshold: float) -> Optional[Dict]:
    """
    Check if two claims contradict each other
    Returns contradiction dict if found, None otherwise
    """

    # High semantic similarity but different truth values (negation)
    if similarity > threshold:
        if claim1['has_negation'] != claim2['has_negation']:
            if same_core_content(claim1, claim2):
                return {
                    'claim1_id': claim1['id'],
                    'claim2_id': claim2['id'],
                    'type': 'negation',
                    'severity': 'high',
                    'confidence': similarity,
                    'similarity': similarity,
                    'explanation': f"Direct contradiction via negation. One claim states: '{claim1['claim_text']}' while the other states: '{claim2['claim_text']}'"
                }

    # Temporal contradictions
    if claim1['claim_type'] == 'temporal' and claim2['claim_type'] == 'temporal':
        temporal_contradiction = check_temporal_contradiction(claim1, claim2, similarity)
        if temporal_contradiction:
            return temporal_contradiction

    # Location contradictions
    if claim1['claim_type'] == 'location' and claim2['claim_type'] == 'location':
        location_contradiction = check_location_contradiction(claim1, claim2, similarity)
        if location_contradiction:
            return location_contradiction

    # Financial contradictions
    if claim1['claim_type'] == 'financial' and claim2['claim_type'] == 'financial':
        financial_contradiction = check_financial_contradiction(claim1, claim2, similarity)
        if financial_contradiction:
            return financial_contradiction

    # Relationship contradictions (met vs never met)
    if claim1['claim_type'] == 'relationship' and claim2['claim_type'] == 'relationship':
        relationship_contradiction = check_relationship_contradiction(claim1, claim2, similarity)
        if relationship_contradiction:
            return relationship_contradiction

    return None

def same_core_content(claim1: Dict, claim2: Dict) -> bool:
    """Check if claims have the same subject, predicate, and object"""
    return (claim1.get('subject') == claim2.get('subject') and
            claim1.get('predicate') == claim2.get('predicate') and
            claim1.get('object') == claim2.get('object'))

def check_temporal_contradiction(claim1: Dict, claim2: Dict, similarity: float) -> Optional[Dict]:
    """Check for temporal contradictions"""
    if similarity > 0.6:
        # Same event, different times
        if claim1['temporal_info'] and claim2['temporal_info']:
            if claim1['temporal_info'] != claim2['temporal_info']:
                return {
                    'claim1_id': claim1['id'],
                    'claim2_id': claim2['id'],
                    'type': 'temporal',
                    'severity': 'high',
                    'confidence': similarity,
                    'similarity': similarity,
                    'explanation': f"Temporal contradiction: '{claim1['claim_text']}' (time: {claim1['temporal_info']}) vs '{claim2['claim_text']}' (time: {claim2['temporal_info']})"
                }
    return None

def check_location_contradiction(claim1: Dict, claim2: Dict, similarity: float) -> Optional[Dict]:
    """Check for location contradictions"""
    if similarity > 0.6:
        # Same event/person, different locations
        if claim1['location_info'] and claim2['location_info']:
            if claim1['location_info'].lower() != claim2['location_info'].lower():
                # Check if they share subjects
                if claim1.get('subject') and claim1.get('subject') == claim2.get('subject'):
                    return {
                        'claim1_id': claim1['id'],
                        'claim2_id': claim2['id'],
                        'type': 'location',
                        'severity': 'high',
                        'confidence': similarity,
                        'similarity': similarity,
                        'explanation': f"Location contradiction: '{claim1['claim_text']}' (location: {claim1['location_info']}) vs '{claim2['claim_text']}' (location: {claim2['location_info']})"
                    }
    return None

def check_financial_contradiction(claim1: Dict, claim2: Dict, similarity: float) -> Optional[Dict]:
    """Check for financial contradictions (different amounts for same transaction)"""
    if similarity > 0.6:
        # Extract amounts from both claims
        amount1 = extract_amount(claim1['claim_text'])
        amount2 = extract_amount(claim2['claim_text'])

        if amount1 and amount2 and amount1 != amount2:
            # Different amounts for similar claims
            return {
                'claim1_id': claim1['id'],
                'claim2_id': claim2['id'],
                'type': 'financial',
                'severity': 'medium',
                'confidence': similarity,
                'similarity': similarity,
                'explanation': f"Financial contradiction: '{claim1['claim_text']}' (${amount1}) vs '{claim2['claim_text']}' (${amount2})"
            }
    return None

def check_relationship_contradiction(claim1: Dict, claim2: Dict, similarity: float) -> Optional[Dict]:
    """Check for relationship contradictions (met vs never met)"""
    if similarity > 0.5:
        # Check for contradictory relationship statements
        positive_words = {'met', 'know', 'friend', 'worked with', 'associated', 'relationship'}
        negative_words = {'never met', 'never knew', "don't know", 'no relationship', 'no association'}

        text1_lower = claim1['claim_text'].lower()
        text2_lower = claim2['claim_text'].lower()

        has_positive1 = any(word in text1_lower for word in positive_words)
        has_negative1 = any(word in text1_lower for word in negative_words)
        has_positive2 = any(word in text2_lower for word in positive_words)
        has_negative2 = any(word in text2_lower for word in negative_words)

        if (has_positive1 and has_negative2) or (has_negative1 and has_positive2):
            return {
                'claim1_id': claim1['id'],
                'claim2_id': claim2['id'],
                'type': 'relationship',
                'severity': 'high',
                'confidence': similarity * 0.9,  # Slightly lower confidence for relationship contradictions
                'similarity': similarity,
                'explanation': f"Relationship contradiction: '{claim1['claim_text']}' vs '{claim2['claim_text']}'"
            }
    return None

def extract_amount(text: str) -> Optional[float]:
    """Extract monetary amount from text"""
    # Match patterns like $1,000 or $1000 or $1,000.00
    pattern = r'\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'
    match = re.search(pattern, text)
    if match:
        amount_str = match.group(1).replace(',', '')
        try:
            return float(amount_str)
        except:
            return None
    return None

def save_contradiction(contradiction: Dict):
    """Save a detected contradiction to the database"""
    conn = get_db()
    c = conn.cursor()

    # Check if contradiction already exists (avoid duplicates)
    c.execute('''SELECT id FROM contradictions
                 WHERE (claim1_id = ? AND claim2_id = ?)
                 OR (claim1_id = ? AND claim2_id = ?)''',
              (contradiction['claim1_id'], contradiction['claim2_id'],
               contradiction['claim2_id'], contradiction['claim1_id']))

    if c.fetchone():
        conn.close()
        return  # Already exists

    c.execute('''INSERT INTO contradictions
                 (claim1_id, claim2_id, contradiction_type, severity, confidence_score,
                  semantic_similarity, explanation, detected_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
              (contradiction['claim1_id'], contradiction['claim2_id'],
               contradiction['type'], contradiction['severity'], contradiction['confidence'],
               contradiction['similarity'], contradiction['explanation'],
               datetime.now().isoformat()))

    conn.commit()
    conn.close()

def process_document_for_contradictions(doc_id: int, speaker: Optional[str] = None) -> Dict:
    """
    Process a document to extract claims and detect contradictions
    Returns statistics about processing
    """
    conn = get_db()
    c = conn.cursor()

    # Get document content
    c.execute('SELECT content, filename FROM documents WHERE id = ?', (doc_id,))
    row = c.fetchone()

    if not row:
        return {'error': 'Document not found'}

    content = row['content']
    filename = row['filename']

    # Extract speaker from filename if not provided (e.g., "deposition_jane_doe.txt")
    if not speaker:
        speaker_match = re.search(r'deposition[_\s]+([a-z_\s]+)', filename.lower())
        if speaker_match:
            speaker = speaker_match.group(1).replace('_', ' ').title()

    # Extract claims
    claims = extract_claims_from_text(content, doc_id, speaker)

    # Save claims and detect contradictions
    claims_saved = 0
    contradictions_found = 0

    for claim in claims:
        claim_id = save_claim(claim, doc_id)
        claims_saved += 1

        # Detect contradictions for this claim
        contradictions = detect_contradictions_for_claim(claim_id)
        for contradiction in contradictions:
            save_contradiction(contradiction)
            contradictions_found += 1

    conn.close()

    return {
        'doc_id': doc_id,
        'filename': filename,
        'claims_extracted': claims_saved,
        'contradictions_found': contradictions_found,
        'speaker': speaker
    }

def get_all_contradictions(min_confidence: float = 0.5, severity: Optional[str] = None) -> List[Dict]:
    """Get all contradictions, optionally filtered by confidence and severity"""
    conn = get_db()
    c = conn.cursor()

    query = '''SELECT c.*,
                      cl1.claim_text as claim1_text, cl1.speaker as speaker1,
                      cl1.source_doc_id as doc1_id,
                      cl2.claim_text as claim2_text, cl2.speaker as speaker2,
                      cl2.source_doc_id as doc2_id,
                      d1.filename as doc1_filename,
                      d2.filename as doc2_filename
               FROM contradictions c
               JOIN claims cl1 ON c.claim1_id = cl1.id
               JOIN claims cl2 ON c.claim2_id = cl2.id
               JOIN documents d1 ON cl1.source_doc_id = d1.id
               JOIN documents d2 ON cl2.source_doc_id = d2.id
               WHERE c.confidence_score >= ?'''

    params = [min_confidence]

    if severity:
        query += ' AND c.severity = ?'
        params.append(severity)

    query += ' ORDER BY c.severity DESC, c.confidence_score DESC'

    c.execute(query, params)

    contradictions = []
    for row in c.fetchall():
        contradictions.append(dict(row))

    conn.close()
    return contradictions

def get_contradiction_stats() -> Dict:
    """Get statistics about contradictions"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    # Total contradictions
    c.execute('SELECT COUNT(*) as total FROM contradictions')
    stats['total_contradictions'] = c.fetchone()['total']

    # By severity
    c.execute('SELECT severity, COUNT(*) as count FROM contradictions GROUP BY severity')
    stats['by_severity'] = {row['severity']: row['count'] for row in c.fetchall()}

    # By type
    c.execute('SELECT contradiction_type, COUNT(*) as count FROM contradictions GROUP BY contradiction_type')
    stats['by_type'] = {row['contradiction_type']: row['count'] for row in c.fetchall()}

    # Total claims
    c.execute('SELECT COUNT(*) as total FROM claims')
    stats['total_claims'] = c.fetchone()['total']

    # High confidence contradictions
    c.execute('SELECT COUNT(*) as total FROM contradictions WHERE confidence_score >= 0.8')
    stats['high_confidence_contradictions'] = c.fetchone()['total']

    # Top speakers with contradictions
    c.execute('''SELECT cl.speaker, COUNT(DISTINCT c.id) as contradiction_count
                 FROM contradictions c
                 JOIN claims cl ON c.claim1_id = cl.id OR c.claim2_id = cl.id
                 WHERE cl.speaker IS NOT NULL
                 GROUP BY cl.speaker
                 ORDER BY contradiction_count DESC
                 LIMIT 10''')
    stats['top_speakers'] = [{'speaker': row['speaker'], 'count': row['contradiction_count']}
                             for row in c.fetchall()]

    conn.close()
    return stats

def process_all_documents():
    """Process all documents in the database for contradictions"""
    conn = get_db()
    c = conn.cursor()

    c.execute('SELECT id FROM documents WHERE content IS NOT NULL')
    doc_ids = [row['id'] for row in c.fetchall()]

    results = []
    for doc_id in doc_ids:
        result = process_document_for_contradictions(doc_id)
        results.append(result)
        print(f"Processed {result.get('filename', f'doc {doc_id}')}: {result.get('claims_extracted', 0)} claims, {result.get('contradictions_found', 0)} contradictions")

    conn.close()
    return results

if __name__ == '__main__':
    # Initialize tables
    init_contradiction_tables()
    print("Contradiction detection tables initialized")

    # Process all documents
    print("\nProcessing all documents...")
    results = process_all_documents()

    # Show stats
    print("\n" + "="*60)
    stats = get_contradiction_stats()
    print(f"Total claims extracted: {stats['total_claims']}")
    print(f"Total contradictions found: {stats['total_contradictions']}")
    print(f"High confidence contradictions: {stats['high_confidence_contradictions']}")
    print(f"\nBy severity: {stats['by_severity']}")
    print(f"By type: {stats['by_type']}")
