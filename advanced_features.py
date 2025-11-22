"""
Advanced investigative features for document analysis
"""
import sqlite3
import re
from datetime import datetime
from collections import Counter, defaultdict
import json

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# ============================================================================
# ADVANCED SEARCH
# ============================================================================

def parse_boolean_query(query):
    """Parse Boolean search query into SQL FTS5 format"""
    # Convert common Boolean operators to FTS5 syntax
    # AND -> (implicit in FTS5)
    # OR -> OR
    # NOT -> NOT
    # "phrase" -> "phrase"
    # NEAR/n -> NEAR()

    query = query.strip()

    # Handle NEAR operator: "term1" NEAR/10 "term2"
    near_pattern = r'"([^"]+)"\s+NEAR/(\d+)\s+"([^"]+)"'
    query = re.sub(near_pattern, r'NEAR(\1 \3, \2)', query)

    # Convert NOT to FTS5 NOT
    query = re.sub(r'\bNOT\b', 'NOT', query, flags=re.IGNORECASE)

    # Convert AND to implicit (FTS5 uses space for AND)
    query = re.sub(r'\bAND\b', '', query, flags=re.IGNORECASE)

    # Convert OR to FTS5 OR
    query = re.sub(r'\bOR\b', 'OR', query, flags=re.IGNORECASE)

    return query

def advanced_search(query, filters=None):
    """
    Advanced search with Boolean operators and filters

    filters = {
        'start_date': '2005-01-01',
        'end_date': '2010-12-31',
        'entities': ['Jeffrey Epstein', 'Ghislaine Maxwell'],
        'tags': ['important', 'verified'],
        'file_type': 'txt'
    }
    """
    conn = get_db()
    c = conn.cursor()

    # Parse Boolean query
    fts_query = parse_boolean_query(query)

    # Build base query
    sql = '''SELECT d.id, d.filename, d.file_type, d.uploaded_date, d.content
             FROM documents_fts fts
             JOIN documents d ON fts.doc_id = d.id'''

    conditions = []
    params = []

    # FTS search condition
    conditions.append('documents_fts MATCH ?')
    params.append(fts_query)

    # Apply filters
    if filters:
        if filters.get('start_date'):
            conditions.append('d.uploaded_date >= ?')
            params.append(filters['start_date'])

        if filters.get('end_date'):
            conditions.append('d.uploaded_date <= ?')
            params.append(filters['end_date'])

        if filters.get('file_type'):
            conditions.append('d.file_type = ?')
            params.append(filters['file_type'])

        if filters.get('entities'):
            # Join with entity_mentions to filter by entities
            sql += ' JOIN entity_mentions em ON d.id = em.doc_id'
            sql += ' JOIN entities e ON em.entity_id = e.id'
            conditions.append('e.name IN ({})'.format(','.join('?' * len(filters['entities']))))
            params.extend(filters['entities'])

        if filters.get('tags'):
            # Join with tags
            sql += ' JOIN document_tags dt ON d.id = dt.doc_id'
            conditions.append('dt.tag IN ({})'.format(','.join('?' * len(filters['tags']))))
            params.extend(filters['tags'])

    if conditions:
        sql += ' WHERE ' + ' AND '.join(conditions)

    sql += ' GROUP BY d.id ORDER BY rank LIMIT 100'

    c.execute(sql, params)
    results = []
    for row in c.fetchall():
        # Generate snippet manually
        content = row['content'] if row['content'] else ''
        snippet = content[:200] + '...' if len(content) > 200 else content

        results.append({
            'id': row['id'],
            'filename': row['filename'],
            'type': row['file_type'],
            'uploaded_date': row['uploaded_date'],
            'snippet': snippet
        })

    conn.close()
    return results

# ============================================================================
# CO-OCCURRENCE ANALYSIS
# ============================================================================

def calculate_cooccurrences(force_recalculate=False, max_entities=1000):
    """Calculate and cache entity co-occurrences (fast in-memory algorithm)"""
    from itertools import combinations

    conn = get_db()
    c = conn.cursor()

    # Check if already calculated
    c.execute('SELECT COUNT(*) as count FROM entity_cooccurrence')
    if c.fetchone()['count'] > 0 and not force_recalculate:
        conn.close()
        return

    # Clear existing data if recalculating
    if force_recalculate:
        c.execute('DELETE FROM entity_cooccurrence')

    # Get top person entities by mention count (limit for performance)
    print(f"Fetching top {max_entities} persons by mention count...")
    c.execute("""SELECT id FROM entities
                 WHERE entity_type = 'person'
                 ORDER BY mention_count DESC
                 LIMIT ?""", (max_entities,))
    person_ids = set(row['id'] for row in c.fetchall())

    print(f"Fetching all entity mentions for {len(person_ids)} persons...")

    # Get all mentions for these persons in one query (much faster!)
    placeholders = ','.join('?' * len(person_ids))
    c.execute(f'''SELECT entity_id, doc_id FROM entity_mentions
                  WHERE entity_id IN ({placeholders})
                  ORDER BY doc_id''', tuple(person_ids))

    # Build document -> entities mapping
    doc_entities = defaultdict(set)
    for row in c.fetchall():
        doc_entities[row['doc_id']].add(row['entity_id'])

    print(f"Processing {len(doc_entities)} documents with entity mentions...")

    # Calculate co-occurrences from document-entity mapping
    cooccurrences = defaultdict(lambda: {'count': 0, 'docs': []})

    docs_processed = 0
    for doc_id, entities_in_doc in doc_entities.items():
        # Find all pairs of entities that co-occur in this document
        for e1, e2 in combinations(sorted(entities_in_doc), 2):
            key = (e1, e2)  # Already sorted via sorted()
            cooccurrences[key]['count'] += 1
            cooccurrences[key]['docs'].append(doc_id)

        docs_processed += 1
        if docs_processed % 500 == 0:
            print(f"  Processed {docs_processed}/{len(doc_entities)} documents, {len(cooccurrences)} co-occurrences found")

    print(f"✓ Found {len(cooccurrences)} co-occurrence pairs")

    # Insert into database
    print("Inserting co-occurrences into database...")
    inserted = 0
    for (e1_id, e2_id), data in cooccurrences.items():
        c.execute('''INSERT OR REPLACE INTO entity_cooccurrence
                     (entity1_id, entity2_id, cooccurrence_count, documents)
                     VALUES (?, ?, ?, ?)''',
                 (e1_id, e2_id, data['count'], json.dumps(data['docs'])))
        inserted += 1
        if inserted % 1000 == 0:
            print(f"  Inserted {inserted}/{len(cooccurrences)} pairs...")
            conn.commit()

    conn.commit()
    conn.close()
    print("✓ Co-occurrence calculation complete")

def get_cooccurrence_matrix(entity_type='person', min_cooccurrence=1):
    """Get co-occurrence matrix for visualization"""
    conn = get_db()
    c = conn.cursor()

    # Get all entities of type
    c.execute("SELECT id, name FROM entities WHERE entity_type = ? ORDER BY mention_count DESC LIMIT 50",
             (entity_type,))
    entities = {row['id']: row['name'] for row in c.fetchall()}
    entity_ids = list(entities.keys())

    # Get co-occurrences
    c.execute('''SELECT entity1_id, entity2_id, cooccurrence_count
                 FROM entity_cooccurrence
                 WHERE cooccurrence_count >= ?''',
             (min_cooccurrence,))

    # Build matrix
    matrix = []
    for row in c.fetchall():
        e1_id = row['entity1_id']
        e2_id = row['entity2_id']
        count = row['cooccurrence_count']

        if e1_id in entities and e2_id in entities:
            matrix.append({
                'entity1': entities[e1_id],
                'entity2': entities[e2_id],
                'count': count
            })

    conn.close()
    return {
        'entities': list(entities.values()),
        'cooccurrences': matrix
    }

# ============================================================================
# KWIC (Keyword in Context)
# ============================================================================

def get_kwic(keyword, context_words=10):
    """Get keyword-in-context concordance"""
    conn = get_db()
    c = conn.cursor()

    c.execute('SELECT id, filename, content FROM documents WHERE file_type = "txt"')

    results = []
    pattern = re.compile(r'\b' + re.escape(keyword) + r'\b', re.IGNORECASE)

    for row in c.fetchall():
        content = row['content']
        words = content.split()

        for i, word in enumerate(words):
            if pattern.search(word):
                # Get context
                start = max(0, i - context_words)
                end = min(len(words), i + context_words + 1)

                left_context = ' '.join(words[start:i])
                keyword_found = words[i]
                right_context = ' '.join(words[i+1:end])

                results.append({
                    'doc_id': row['id'],
                    'filename': row['filename'],
                    'left_context': left_context,
                    'keyword': keyword_found,
                    'right_context': right_context,
                    'position': i
                })

    conn.close()
    return results

# ============================================================================
# DOCUMENT TAGGING
# ============================================================================

def add_tag(doc_id, tag, tag_type='custom', color='#d32f2f'):
    """Add a tag to a document"""
    conn = get_db()
    c = conn.cursor()

    try:
        c.execute('''INSERT INTO document_tags (doc_id, tag, tag_type, color, created_date)
                     VALUES (?, ?, ?, ?, ?)''',
                 (doc_id, tag, tag_type, color, datetime.now().isoformat()))
        conn.commit()
        result = True
    except sqlite3.IntegrityError:
        result = False  # Tag already exists

    conn.close()
    return result

def remove_tag(doc_id, tag):
    """Remove a tag from a document"""
    conn = get_db()
    c = conn.cursor()

    c.execute('DELETE FROM document_tags WHERE doc_id = ? AND tag = ?', (doc_id, tag))
    conn.commit()
    conn.close()

def get_document_tags(doc_id):
    """Get all tags for a document"""
    conn = get_db()
    c = conn.cursor()

    c.execute('SELECT tag, tag_type, color FROM document_tags WHERE doc_id = ?', (doc_id,))
    tags = [{'tag': row['tag'], 'type': row['tag_type'], 'color': row['color']}
            for row in c.fetchall()]

    conn.close()
    return tags

# ============================================================================
# ANNOTATIONS
# ============================================================================

def add_annotation(doc_id, text_selection, note='', color='yellow', importance=1):
    """Add an annotation to a document"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''INSERT INTO annotations
                 (doc_id, text_selection, note, color, importance, created_date)
                 VALUES (?, ?, ?, ?, ?, ?)''',
             (doc_id, text_selection, note, color, importance, datetime.now().isoformat()))

    annotation_id = c.lastrowid
    conn.commit()
    conn.close()

    return annotation_id

def get_annotations(doc_id):
    """Get all annotations for a document"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT id, text_selection, note, color, importance, created_date
                 FROM annotations WHERE doc_id = ?
                 ORDER BY created_date DESC''',
             (doc_id,))

    annotations = []
    for row in c.fetchall():
        annotations.append({
            'id': row['id'],
            'text': row['text_selection'],
            'note': row['note'],
            'color': row['color'],
            'importance': row['importance'],
            'created_date': row['created_date']
        })

    conn.close()
    return annotations

# ============================================================================
# ANOMALY DETECTION
# ============================================================================

def detect_anomalies():
    """Detect anomalies in documents"""
    conn = get_db()
    c = conn.cursor()

    # Calculate document metadata
    c.execute('SELECT id, content FROM documents WHERE file_type = "txt"')

    word_counts = []
    for row in c.fetchall():
        doc_id = row['id']
        content = row['content']

        word_count = len(content.split())
        has_redactions = '[REDACTED]' in content or '█' in content
        redaction_count = content.count('[REDACTED]') + content.count('█')

        # Get entity count
        c.execute('SELECT COUNT(DISTINCT entity_id) as count FROM entity_mentions WHERE doc_id = ?',
                 (doc_id,))
        unique_entities = c.fetchone()['count']

        # Insert or update metadata
        c.execute('''INSERT OR REPLACE INTO document_metadata
                     (doc_id, word_count, unique_entities, has_redactions, redaction_count)
                     VALUES (?, ?, ?, ?, ?)''',
                 (doc_id, word_count, unique_entities, has_redactions, redaction_count))

        word_counts.append(word_count)

    # Calculate anomaly scores (simple z-score for now)
    if word_counts:
        mean_words = sum(word_counts) / len(word_counts)
        variance = sum((x - mean_words) ** 2 for x in word_counts) / len(word_counts)
        std_dev = variance ** 0.5

        c.execute('SELECT doc_id, word_count FROM document_metadata')
        for row in c.fetchall():
            if std_dev > 0:
                z_score = abs((row['word_count'] - mean_words) / std_dev)
                c.execute('UPDATE document_metadata SET anomaly_score = ? WHERE doc_id = ?',
                         (z_score, row['doc_id']))

    conn.commit()
    conn.close()

def get_anomalies(threshold=2.0):
    """Get documents with anomaly scores above threshold"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT d.id, d.filename, dm.word_count, dm.unique_entities,
                        dm.has_redactions, dm.redaction_count, dm.anomaly_score
                 FROM document_metadata dm
                 JOIN documents d ON dm.doc_id = d.id
                 WHERE dm.anomaly_score > ?
                 ORDER BY dm.anomaly_score DESC
                 LIMIT 50''',
             (threshold,))

    anomalies = []
    for row in c.fetchall():
        anomalies.append({
            'id': row['id'],
            'filename': row['filename'],
            'word_count': row['word_count'],
            'unique_entities': row['unique_entities'],
            'has_redactions': bool(row['has_redactions']),
            'redaction_count': row['redaction_count'],
            'anomaly_score': round(row['anomaly_score'], 2)
        })

    conn.close()
    return anomalies

# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

def export_search_results(results, format='json'):
    """Export search results in various formats"""
    if format == 'json':
        return json.dumps(results, indent=2)
    elif format == 'csv':
        import csv
        import io
        output = io.StringIO()
        if results:
            writer = csv.DictWriter(output, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
        return output.getvalue()
    else:
        return json.dumps(results)
