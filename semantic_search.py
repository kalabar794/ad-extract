"""
Semantic Search Engine
Enables meaning-based search beyond keyword matching using AI embeddings
"""

import sqlite3
import json
import re
from typing import List, Dict, Tuple, Optional
from sentence_transformers import SentenceTransformer
import numpy as np
from datetime import datetime

# Lazy load model
_embedder = None

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

def init_semantic_search_tables():
    """Initialize database tables for semantic search"""
    conn = get_db()
    c = conn.cursor()

    # Document embeddings table
    c.execute('''CREATE TABLE IF NOT EXISTS document_embeddings
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  doc_id INTEGER UNIQUE NOT NULL,
                  embedding_vector TEXT NOT NULL,
                  embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',
                  created_date TEXT NOT NULL,
                  FOREIGN KEY (doc_id) REFERENCES documents(id))''')

    # Search query cache for performance
    c.execute('''CREATE TABLE IF NOT EXISTS search_query_cache
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  query_text TEXT NOT NULL,
                  query_embedding TEXT NOT NULL,
                  created_date TEXT NOT NULL,
                  hit_count INTEGER DEFAULT 1)''')

    # Search analytics
    c.execute('''CREATE TABLE IF NOT EXISTS search_analytics
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  query_text TEXT NOT NULL,
                  search_type TEXT NOT NULL,
                  results_count INTEGER,
                  search_date TEXT NOT NULL)''')

    # Create indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_doc_embeddings ON document_embeddings(doc_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_query_cache ON search_query_cache(query_text)')

    conn.commit()
    conn.close()

def generate_document_embedding(doc_id: int, content: str) -> bool:
    """Generate and store embedding for a document"""
    try:
        embedder = get_embedder()

        # Generate embedding
        embedding = embedder.encode([content])[0]
        embedding_json = json.dumps(embedding.tolist())

        conn = get_db()
        c = conn.cursor()

        # Check if embedding already exists
        c.execute('SELECT id FROM document_embeddings WHERE doc_id = ?', (doc_id,))
        if c.fetchone():
            # Update existing
            c.execute('''UPDATE document_embeddings
                         SET embedding_vector = ?, created_date = ?
                         WHERE doc_id = ?''',
                      (embedding_json, datetime.now().isoformat(), doc_id))
        else:
            # Insert new
            c.execute('''INSERT INTO document_embeddings
                         (doc_id, embedding_vector, created_date)
                         VALUES (?, ?, ?)''',
                      (doc_id, embedding_json, datetime.now().isoformat()))

        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error generating embedding for doc {doc_id}: {e}")
        return False

def generate_all_embeddings(batch_size: int = 50) -> Dict:
    """Generate embeddings for all documents that don't have them"""
    conn = get_db()
    c = conn.cursor()

    # Get documents without embeddings
    c.execute('''SELECT d.id, d.content
                 FROM documents d
                 LEFT JOIN document_embeddings de ON d.id = de.doc_id
                 WHERE de.id IS NULL AND d.content IS NOT NULL AND d.content != ''
                 ORDER BY d.id''')

    docs_to_process = c.fetchall()
    total = len(docs_to_process)

    conn.close()

    if total == 0:
        return {'success': True, 'message': 'All documents already have embeddings', 'processed': 0}

    print(f"Generating embeddings for {total} documents...")

    processed = 0
    failed = 0

    # Process in batches for efficiency
    for i in range(0, total, batch_size):
        batch = docs_to_process[i:i+batch_size]

        for doc in batch:
            doc_id = doc['id']
            content = doc['content']

            if generate_document_embedding(doc_id, content):
                processed += 1
            else:
                failed += 1

            if (processed + failed) % 10 == 0:
                print(f"Progress: {processed + failed}/{total}")

    return {
        'success': True,
        'processed': processed,
        'failed': failed,
        'total': total
    }

def get_query_embedding(query: str) -> np.ndarray:
    """Get embedding for a search query (with caching)"""
    conn = get_db()
    c = conn.cursor()

    # Check cache
    c.execute('SELECT query_embedding, hit_count FROM search_query_cache WHERE query_text = ?', (query,))
    cached = c.fetchone()

    if cached:
        # Update hit count
        c.execute('UPDATE search_query_cache SET hit_count = hit_count + 1 WHERE query_text = ?', (query,))
        conn.commit()
        conn.close()
        return np.array(json.loads(cached['query_embedding']))

    # Generate new embedding
    embedder = get_embedder()
    embedding = embedder.encode([query])[0]

    # Cache it
    embedding_json = json.dumps(embedding.tolist())
    c.execute('''INSERT INTO search_query_cache (query_text, query_embedding, created_date)
                 VALUES (?, ?, ?)''',
              (query, embedding_json, datetime.now().isoformat()))
    conn.commit()
    conn.close()

    return embedding

def semantic_search(query: str, limit: int = 20, min_similarity: float = 0.3) -> List[Dict]:
    """
    Perform semantic search across all documents
    Returns documents ranked by semantic similarity
    """

    # Get query embedding
    query_embedding = get_query_embedding(query)

    # Get all document embeddings
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT de.doc_id, de.embedding_vector,
                        d.filename, d.content, d.uploaded_date, d.file_type
                 FROM document_embeddings de
                 JOIN documents d ON de.doc_id = d.id''')

    doc_embeddings = c.fetchall()

    if not doc_embeddings:
        conn.close()
        return []

    # Calculate similarities
    results = []
    for doc in doc_embeddings:
        doc_embedding = np.array(json.loads(doc['embedding_vector']))

        # Cosine similarity
        similarity = float(np.dot(query_embedding, doc_embedding) /
                          (np.linalg.norm(query_embedding) * np.linalg.norm(doc_embedding)))

        if similarity >= min_similarity:
            results.append({
                'doc_id': doc['doc_id'],
                'filename': doc['filename'],
                'file_type': doc['file_type'],
                'content': doc['content'],
                'uploaded_date': doc['uploaded_date'],
                'similarity_score': similarity,
                'relevance_percentage': int(similarity * 100)
            })

    # Sort by similarity (highest first)
    results.sort(key=lambda x: x['similarity_score'], reverse=True)

    # Limit results
    results = results[:limit]

    # Log search
    c.execute('''INSERT INTO search_analytics (query_text, search_type, results_count, search_date)
                 VALUES (?, ?, ?, ?)''',
              (query, 'semantic', len(results), datetime.now().isoformat()))
    conn.commit()
    conn.close()

    return results

def hybrid_search(query: str, limit: int = 20, semantic_weight: float = 0.7) -> List[Dict]:
    """
    Hybrid search combining semantic similarity and keyword matching
    semantic_weight: 0.0-1.0, weight given to semantic vs keyword results
    """

    # Semantic search
    semantic_results = semantic_search(query, limit=limit * 2, min_similarity=0.2)

    # Keyword search
    keyword_results = keyword_search(query, limit=limit * 2)

    # Combine and re-rank
    combined_scores = {}

    # Add semantic results
    for result in semantic_results:
        doc_id = result['doc_id']
        combined_scores[doc_id] = {
            'doc': result,
            'semantic_score': result['similarity_score'],
            'keyword_score': 0.0
        }

    # Add keyword results
    for result in keyword_results:
        doc_id = result['doc_id']
        if doc_id in combined_scores:
            combined_scores[doc_id]['keyword_score'] = result['keyword_score']
        else:
            combined_scores[doc_id] = {
                'doc': result,
                'semantic_score': 0.0,
                'keyword_score': result['keyword_score']
            }

    # Calculate hybrid scores
    final_results = []
    for doc_id, scores in combined_scores.items():
        hybrid_score = (semantic_weight * scores['semantic_score'] +
                       (1 - semantic_weight) * scores['keyword_score'])

        result = scores['doc'].copy()
        result['hybrid_score'] = hybrid_score
        result['semantic_score'] = scores['semantic_score']
        result['keyword_score'] = scores['keyword_score']
        result['relevance_percentage'] = int(hybrid_score * 100)

        final_results.append(result)

    # Sort by hybrid score
    final_results.sort(key=lambda x: x['hybrid_score'], reverse=True)

    # Log search
    conn = get_db()
    c = conn.cursor()
    c.execute('''INSERT INTO search_analytics (query_text, search_type, results_count, search_date)
                 VALUES (?, ?, ?, ?)''',
              (query, 'hybrid', len(final_results[:limit]), datetime.now().isoformat()))
    conn.commit()
    conn.close()

    return final_results[:limit]

def keyword_search(query: str, limit: int = 20) -> List[Dict]:
    """Traditional keyword-based search for comparison"""
    conn = get_db()
    c = conn.cursor()

    # Use FTS5 if available
    try:
        c.execute('''SELECT doc_id, filename FROM documents_fts
                     WHERE content MATCH ?
                     ORDER BY rank
                     LIMIT ?''', (query, limit))
        fts_results = c.fetchall()

        results = []
        for row in fts_results:
            c.execute('SELECT * FROM documents WHERE id = ?', (row['doc_id'],))
            doc = c.fetchone()
            if doc:
                # Calculate simple keyword score based on occurrence count
                content_lower = doc['content'].lower()
                query_terms = query.lower().split()
                keyword_count = sum(content_lower.count(term) for term in query_terms)
                keyword_score = min(1.0, keyword_count / 10.0)  # Normalize

                results.append({
                    'doc_id': doc['id'],
                    'filename': doc['filename'],
                    'file_type': doc['file_type'],
                    'content': doc['content'],
                    'uploaded_date': doc['uploaded_date'],
                    'keyword_score': keyword_score,
                    'relevance_percentage': int(keyword_score * 100)
                })
    except:
        # Fallback to simple LIKE search
        c.execute('''SELECT * FROM documents
                     WHERE content LIKE ?
                     LIMIT ?''', (f'%{query}%', limit))
        docs = c.fetchall()

        results = []
        for doc in docs:
            content_lower = doc['content'].lower()
            query_terms = query.lower().split()
            keyword_count = sum(content_lower.count(term) for term in query_terms)
            keyword_score = min(1.0, keyword_count / 10.0)

            results.append({
                'doc_id': doc['id'],
                'filename': doc['filename'],
                'file_type': doc['file_type'],
                'content': doc['content'],
                'uploaded_date': doc['uploaded_date'],
                'keyword_score': keyword_score,
                'relevance_percentage': int(keyword_score * 100)
            })

    conn.close()
    return results

def expand_query(query: str) -> List[str]:
    """
    Expand query with related terms and synonyms
    For investigative context
    """
    expansions = []

    # Domain-specific expansions for investigative work
    expansion_map = {
        'island': ['Little St. James', 'Virgin Islands', 'private island', 'St. Thomas'],
        'flight': ['airplane', 'aircraft', 'travel', 'passenger', 'manifest', 'jet'],
        'money': ['payment', 'transfer', 'wire', 'transaction', 'cash', 'check'],
        'minor': ['underage', 'young', 'girl', 'child', 'teenager', 'juvenile'],
        'meeting': ['met', 'meeting', 'encounter', 'visit', 'saw', 'spoke with'],
        'relationship': ['knew', 'know', 'friend', 'associate', 'acquaintance'],
        'trafficking': ['recruit', 'transport', 'supply', 'provide', 'arrange'],
        'mansion': ['home', 'residence', 'property', 'estate', 'house'],
        'party': ['event', 'gathering', 'social', 'entertainment'],
        'photo': ['picture', 'image', 'photograph', 'snapshot'],
    }

    query_lower = query.lower()

    for key, expansions_list in expansion_map.items():
        if key in query_lower:
            expansions.extend(expansions_list)

    return list(set(expansions))  # Remove duplicates

def get_semantic_search_stats() -> Dict:
    """Get statistics about semantic search system"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    # Total embeddings
    c.execute('SELECT COUNT(*) as total FROM document_embeddings')
    stats['total_embeddings'] = c.fetchone()['total']

    # Total documents
    c.execute('SELECT COUNT(*) as total FROM documents WHERE content IS NOT NULL')
    stats['total_documents'] = c.fetchone()['total']

    # Coverage percentage
    if stats['total_documents'] > 0:
        stats['coverage_percentage'] = int((stats['total_embeddings'] / stats['total_documents']) * 100)
    else:
        stats['coverage_percentage'] = 0

    # Recent searches
    c.execute('''SELECT search_type, COUNT(*) as count
                 FROM search_analytics
                 GROUP BY search_type''')
    stats['searches_by_type'] = {row['search_type']: row['count'] for row in c.fetchall()}

    # Popular queries
    c.execute('''SELECT query_text, COUNT(*) as count
                 FROM search_analytics
                 GROUP BY query_text
                 ORDER BY count DESC
                 LIMIT 10''')
    stats['popular_queries'] = [{'query': row['query_text'], 'count': row['count']}
                                for row in c.fetchall()]

    # Cache stats
    c.execute('SELECT COUNT(*) as total FROM search_query_cache')
    stats['cached_queries'] = c.fetchone()['total']

    conn.close()
    return stats

if __name__ == '__main__':
    # Initialize and generate embeddings
    print("Initializing Semantic Search...")
    init_semantic_search_tables()
    print("✓ Tables initialized")

    print("\nGenerating embeddings for all documents...")
    result = generate_all_embeddings()
    print(f"✓ Processed: {result['processed']}")
    print(f"✗ Failed: {result['failed']}")
    print(f"Total: {result['total']}")

    # Test search
    print("\n" + "="*60)
    print("Testing semantic search...")
    print("="*60)

    test_queries = [
        "flights to the island",
        "payments to young women",
        "meetings at the mansion",
        "evidence of trafficking"
    ]

    for query in test_queries:
        print(f"\nQuery: '{query}'")
        results = semantic_search(query, limit=3)
        print(f"Found {len(results)} results:")
        for i, result in enumerate(results, 1):
            print(f"  {i}. {result['filename']} ({result['relevance_percentage']}% relevant)")

    # Show stats
    print("\n" + "="*60)
    print("System Statistics")
    print("="*60)
    stats = get_semantic_search_stats()
    print(f"Documents with embeddings: {stats['total_embeddings']}/{stats['total_documents']} ({stats['coverage_percentage']}%)")
    print(f"Cached queries: {stats['cached_queries']}")
