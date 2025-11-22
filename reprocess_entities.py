#!/usr/bin/env python3
"""
Reprocess documents to extract entities from documents that have no entity mentions
"""

import sqlite3
from app import extract_entities, get_db

def reprocess_documents():
    """Extract entities from documents that have none"""
    conn = get_db()
    c = conn.cursor()

    # Find documents with no entity mentions
    c.execute('''
        SELECT d.id, d.filename, d.content
        FROM documents d
        LEFT JOIN entity_mentions em ON d.id = em.doc_id
        WHERE d.file_type = 'txt'
        GROUP BY d.id
        HAVING COUNT(em.id) = 0
    ''')

    docs_to_process = c.fetchall()

    if not docs_to_process:
        print("✓ All documents have entities extracted!")
        conn.close()
        return

    print(f"Found {len(docs_to_process)} documents needing entity extraction")
    print("=" * 70)

    processed_count = 0
    error_count = 0

    for doc in docs_to_process:
        doc_id = doc['id']
        filename = doc['filename']
        content = doc['content']

        if not content or len(content) < 10:
            print(f"⊘ Skipping {filename} - no content")
            continue

        try:
            print(f"\nProcessing: {filename}")
            print(f"  Content length: {len(content)} chars")

            # Extract entities
            entities = extract_entities(content)

            entity_count = 0
            for entity_type, entity_names in entities.items():
                for name in entity_names:
                    # Insert or update entity
                    entity_type_singular = entity_type[:-1]  # Remove 's' from type
                    c.execute('''INSERT INTO entities (name, entity_type, mention_count)
                                VALUES (?, ?, 1)
                                ON CONFLICT(name, entity_type) DO UPDATE SET
                                mention_count = mention_count + 1''',
                             (name, entity_type_singular))
                    entity_id = c.lastrowid

                    # Get entity_id if it already existed
                    if entity_id == 0:
                        c.execute('SELECT id FROM entities WHERE name = ? AND entity_type = ?',
                                (name, entity_type_singular))
                        result = c.fetchone()
                        if result:
                            entity_id = result[0]

                    # Create mention
                    context = content[:200] if len(content) > 200 else content
                    c.execute('''INSERT INTO entity_mentions (doc_id, entity_id, context)
                                VALUES (?, ?, ?)''',
                             (doc_id, entity_id, context))
                    entity_count += 1

            # Add to FTS if not already there
            c.execute('SELECT COUNT(*) FROM documents_fts WHERE doc_id = ?', (doc_id,))
            if c.fetchone()[0] == 0:
                c.execute('INSERT INTO documents_fts (doc_id, filename, content) VALUES (?, ?, ?)',
                         (doc_id, filename, content))

            conn.commit()
            print(f"  ✓ Extracted {entity_count} entity mentions")
            processed_count += 1

        except Exception as e:
            print(f"  ✗ Error: {e}")
            error_count += 1
            conn.rollback()
            continue

    conn.close()

    print("\n" + "=" * 70)
    print("ENTITY EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"Processed: {processed_count}")
    print(f"Errors:    {error_count}")
    print(f"Total:     {len(docs_to_process)}")

if __name__ == '__main__':
    reprocess_documents()
