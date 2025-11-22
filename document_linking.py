"""
Cross-Document Reference Linking (Smart Citations)
Automatically links related documents and builds evidence chains
"""

import sqlite3
import json
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, Counter
from datetime import datetime

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_linking_tables():
    """Initialize database tables for document linking"""
    conn = get_db()
    c = conn.cursor()

    # Document references table
    c.execute('''CREATE TABLE IF NOT EXISTS document_references
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  source_doc_id INTEGER NOT NULL,
                  target_doc_id INTEGER NOT NULL,
                  reference_type TEXT NOT NULL,
                  shared_entities TEXT,
                  shared_events TEXT,
                  link_strength REAL DEFAULT 0.0,
                  created_date TEXT NOT NULL,
                  UNIQUE(source_doc_id, target_doc_id),
                  FOREIGN KEY (source_doc_id) REFERENCES documents(id),
                  FOREIGN KEY (target_doc_id) REFERENCES documents(id))''')

    # Evidence chains table
    c.execute('''CREATE TABLE IF NOT EXISTS evidence_chains
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  chain_name TEXT NOT NULL,
                  document_ids TEXT NOT NULL,
                  entity_ids TEXT,
                  chain_type TEXT,
                  strength_score REAL DEFAULT 0.0,
                  created_date TEXT NOT NULL)''')

    # Citation index for faster lookups
    c.execute('CREATE INDEX IF NOT EXISTS idx_doc_refs_source ON document_references(source_doc_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_doc_refs_target ON document_references(target_doc_id)')

    conn.commit()
    conn.close()

def build_document_links() -> Dict:
    """
    Build links between all documents based on shared entities, events, and content
    Returns statistics about links created
    """
    conn = get_db()
    c = conn.cursor()

    # Get all documents with their entities
    c.execute('''SELECT d.id, d.filename, d.content,
                        GROUP_CONCAT(e.name) as entities
                 FROM documents d
                 LEFT JOIN entity_mentions em ON d.id = em.doc_id
                 LEFT JOIN entities e ON em.entity_id = e.id
                 WHERE d.content IS NOT NULL
                 GROUP BY d.id''')

    documents = [dict(row) for row in c.fetchall()]
    total_docs = len(documents)

    if total_docs < 2:
        conn.close()
        return {'success': False, 'message': 'Need at least 2 documents to build links'}

    links_created = 0
    links_updated = 0

    # Compare each document pair
    for i, doc1 in enumerate(documents):
        for doc2 in documents[i+1:]:
            link = analyze_document_pair(doc1, doc2)

            if link and link['link_strength'] > 0.1:  # Minimum threshold
                # Check if link already exists
                c.execute('''SELECT id FROM document_references
                             WHERE (source_doc_id = ? AND target_doc_id = ?)
                             OR (source_doc_id = ? AND target_doc_id = ?)''',
                          (doc1['id'], doc2['id'], doc2['id'], doc1['id']))

                if c.fetchone():
                    # Update existing
                    c.execute('''UPDATE document_references
                                 SET reference_type = ?,
                                     shared_entities = ?,
                                     link_strength = ?,
                                     created_date = ?
                                 WHERE (source_doc_id = ? AND target_doc_id = ?)
                                 OR (source_doc_id = ? AND target_doc_id = ?)''',
                              (link['reference_type'], link['shared_entities'],
                               link['link_strength'], datetime.now().isoformat(),
                               doc1['id'], doc2['id'], doc2['id'], doc1['id']))
                    links_updated += 1
                else:
                    # Insert new
                    c.execute('''INSERT INTO document_references
                                 (source_doc_id, target_doc_id, reference_type,
                                  shared_entities, link_strength, created_date)
                                 VALUES (?, ?, ?, ?, ?, ?)''',
                              (doc1['id'], doc2['id'], link['reference_type'],
                               link['shared_entities'], link['link_strength'],
                               datetime.now().isoformat()))
                    links_created += 1

        if (i + 1) % 10 == 0:
            conn.commit()
            print(f"Processed {i + 1}/{total_docs} documents...")

    conn.commit()
    conn.close()

    return {
        'success': True,
        'documents_processed': total_docs,
        'links_created': links_created,
        'links_updated': links_updated,
        'total_links': links_created + links_updated
    }

def analyze_document_pair(doc1: Dict, doc2: Dict) -> Optional[Dict]:
    """Analyze two documents to determine if they should be linked"""

    # Parse entities
    entities1 = set(doc1['entities'].split(',')) if doc1['entities'] else set()
    entities2 = set(doc2['entities'].split(',')) if doc2['entities'] else set()

    # Find shared entities
    shared_entities = entities1 & entities2
    shared_entities = {e for e in shared_entities if e.strip()}  # Remove empty

    if not shared_entities:
        return None

    # Calculate link strength based on shared entities and other factors
    link_strength = calculate_link_strength(doc1, doc2, shared_entities)

    # Determine reference type
    reference_type = determine_reference_type(doc1, doc2, shared_entities)

    return {
        'reference_type': reference_type,
        'shared_entities': json.dumps(list(shared_entities)),
        'link_strength': link_strength
    }

def calculate_link_strength(doc1: Dict, doc2: Dict, shared_entities: Set[str]) -> float:
    """Calculate strength of link between two documents"""

    strength = 0.0

    # Base score from number of shared entities
    strength += min(len(shared_entities) * 0.1, 0.5)

    # Boost for important entities (people names)
    important_entities = {'Epstein', 'Maxwell', 'Ghislaine', 'Jeffrey', 'Clinton', 'Trump', 'Andrew'}
    if any(name in ' '.join(shared_entities) for name in important_entities):
        strength += 0.2

    # Boost for same document type
    if doc1['filename'].split('.')[-1] == doc2['filename'].split('.')[-1]:
        strength += 0.1

    # Boost for date proximity (if dates in filenames)
    # Could enhance this to extract actual dates from content

    return min(strength, 1.0)  # Cap at 1.0

def determine_reference_type(doc1: Dict, doc2: Dict, shared_entities: Set[str]) -> str:
    """Determine the type of reference between documents"""

    filename1_lower = doc1['filename'].lower()
    filename2_lower = doc2['filename'].lower()

    # Deposition cross-references
    if 'deposition' in filename1_lower and 'deposition' in filename2_lower:
        return 'cross_deposition'

    # Financial cross-references
    if any(term in filename1_lower and term in filename2_lower
           for term in ['financial', 'transaction', 'payment', 'wire']):
        return 'financial_corroboration'

    # Flight log cross-references
    if 'flight' in filename1_lower and 'flight' in filename2_lower:
        return 'travel_corroboration'

    # Email threads
    if 'email' in filename1_lower and 'email' in filename2_lower:
        return 'email_thread'

    # Mixed type - deposition + evidence
    if 'deposition' in filename1_lower or 'deposition' in filename2_lower:
        return 'deposition_evidence'

    # General entity mention
    return 'entity_mention'

def get_related_documents(doc_id: int, min_strength: float = 0.2, limit: int = 20) -> List[Dict]:
    """Get documents related to a specific document"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT
                    CASE
                        WHEN dr.source_doc_id = ? THEN dr.target_doc_id
                        ELSE dr.source_doc_id
                    END as related_doc_id,
                    dr.reference_type,
                    dr.shared_entities,
                    dr.link_strength,
                    d.filename,
                    d.file_type,
                    d.uploaded_date
                 FROM document_references dr
                 JOIN documents d ON (
                    CASE
                        WHEN dr.source_doc_id = ? THEN dr.target_doc_id
                        ELSE dr.source_doc_id
                    END = d.id
                 )
                 WHERE (dr.source_doc_id = ? OR dr.target_doc_id = ?)
                 AND dr.link_strength >= ?
                 ORDER BY dr.link_strength DESC
                 LIMIT ?''',
              (doc_id, doc_id, doc_id, doc_id, min_strength, limit))

    results = []
    for row in c.fetchall():
        result = dict(row)
        result['shared_entities'] = json.loads(result['shared_entities']) if result['shared_entities'] else []
        results.append(result)

    conn.close()
    return results

def build_evidence_chain(start_doc_id: int, target_entity: str, max_depth: int = 5) -> List[Dict]:
    """
    Build an evidence chain from a starting document through related documents
    that all mention a target entity
    """
    conn = get_db()
    c = conn.cursor()

    visited = set()
    chain = []
    queue = [(start_doc_id, 0, [])]  # (doc_id, depth, path)

    while queue:
        current_doc, depth, path = queue.pop(0)

        if current_doc in visited or depth >= max_depth:
            continue

        visited.add(current_doc)

        # Check if this document mentions the target entity
        c.execute('''SELECT d.*, GROUP_CONCAT(e.name) as entities
                     FROM documents d
                     LEFT JOIN entity_mentions em ON d.id = em.doc_id
                     LEFT JOIN entities e ON em.entity_id = e.id
                     WHERE d.id = ?
                     GROUP BY d.id''', (current_doc,))

        doc = c.fetchone()
        if not doc:
            continue

        entities = doc['entities'].split(',') if doc['entities'] else []

        if target_entity in ' '.join(entities):
            current_path = path + [{
                'doc_id': doc['id'],
                'filename': doc['filename'],
                'depth': depth,
                'entities': entities
            }]

            chain.append(current_path)

            # Get related documents
            related = get_related_documents(current_doc, min_strength=0.3, limit=10)

            for rel in related:
                if rel['related_doc_id'] not in visited:
                    queue.append((rel['related_doc_id'], depth + 1, current_path))

    conn.close()

    # Sort chains by length (longer chains = more corroboration)
    chain.sort(key=lambda x: len(x), reverse=True)

    return chain[:10]  # Return top 10 chains

def get_citation_network(entity_name: str) -> Dict:
    """
    Get a network of documents that cite/reference each other
    related to a specific entity
    """
    conn = get_db()
    c = conn.cursor()

    # Get all documents mentioning the entity
    c.execute('''SELECT DISTINCT d.id, d.filename
                 FROM documents d
                 JOIN entity_mentions em ON d.id = em.doc_id
                 JOIN entities e ON em.entity_id = e.id
                 WHERE e.name LIKE ?''', (f'%{entity_name}%',))

    docs = [dict(row) for row in c.fetchall()]
    doc_ids = [d['id'] for d in docs]

    if not doc_ids:
        conn.close()
        return {'nodes': [], 'edges': []}

    # Get links between these documents
    placeholders = ','.join('?' * len(doc_ids))
    c.execute(f'''SELECT source_doc_id, target_doc_id, reference_type, link_strength
                  FROM document_references
                  WHERE source_doc_id IN ({placeholders})
                  AND target_doc_id IN ({placeholders})''',
              doc_ids + doc_ids)

    edges = [dict(row) for row in c.fetchall()]

    conn.close()

    # Format for network visualization
    nodes = [{'id': d['id'], 'label': d['filename'], 'title': d['filename']} for d in docs]

    formatted_edges = [{
        'from': e['source_doc_id'],
        'to': e['target_doc_id'],
        'label': e['reference_type'].replace('_', ' ').title(),
        'value': e['link_strength'],
        'title': f"Link strength: {e['link_strength']:.2f}"
    } for e in edges]

    return {
        'nodes': nodes,
        'edges': formatted_edges,
        'entity': entity_name
    }

def get_linking_stats() -> Dict:
    """Get statistics about document linking"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    # Total links
    c.execute('SELECT COUNT(*) as total FROM document_references')
    stats['total_links'] = c.fetchone()['total']

    # Links by type
    c.execute('''SELECT reference_type, COUNT(*) as count
                 FROM document_references
                 GROUP BY reference_type''')
    stats['by_type'] = {row['reference_type']: row['count'] for row in c.fetchall()}

    # Average link strength
    c.execute('SELECT AVG(link_strength) as avg_strength FROM document_references')
    stats['average_link_strength'] = c.fetchone()['avg_strength'] or 0.0

    # Most referenced documents
    c.execute('''SELECT d.filename, COUNT(*) as ref_count
                 FROM document_references dr
                 JOIN documents d ON (d.id = dr.source_doc_id OR d.id = dr.target_doc_id)
                 GROUP BY d.id
                 ORDER BY ref_count DESC
                 LIMIT 10''')
    stats['most_referenced'] = [{'filename': row['filename'], 'count': row['ref_count']}
                                 for row in c.fetchall()]

    # Total evidence chains
    c.execute('SELECT COUNT(*) as total FROM evidence_chains')
    stats['total_chains'] = c.fetchone()['total']

    conn.close()
    return stats

if __name__ == '__main__':
    print("Initializing Cross-Document Reference Linking...")
    init_linking_tables()
    print("✓ Tables initialized")

    print("\nBuilding document links...")
    result = build_document_links()

    if result['success']:
        print(f"✓ Processed {result['documents_processed']} documents")
        print(f"✓ Created {result['links_created']} new links")
        print(f"✓ Updated {result['links_updated']} existing links")
        print(f"✓ Total links: {result['total_links']}")

        # Show stats
        print("\n" + "="*60)
        stats = get_linking_stats()
        print(f"Total document links: {stats['total_links']}")
        print(f"Average link strength: {stats['average_link_strength']:.2f}")
        print(f"\nLinks by type:")
        for ref_type, count in stats['by_type'].items():
            print(f"  {ref_type}: {count}")
    else:
        print(f"✗ Error: {result['message']}")
