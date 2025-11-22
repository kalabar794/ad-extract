"""
Re-extract all entities from documents using spaCy NER

This script:
1. Clears existing entity mentions
2. Re-processes all text documents with spaCy
3. Inserts new comprehensive entity data
4. Recalculates co-occurrence matrix
"""

import sqlite3
from spacy_extractor import extract_entities_spacy, get_nlp
from advanced_features import calculate_cooccurrences
import sys

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def clear_existing_entities():
    """Clear old entity data"""
    print("Clearing existing entity mentions...")
    conn = get_db()
    c = conn.cursor()

    c.execute('DELETE FROM entity_mentions')
    c.execute('DELETE FROM entity_cooccurrence')
    # Reset entity mention counts
    c.execute('UPDATE entities SET mention_count = 0')

    conn.commit()
    conn.close()
    print("✓ Cleared old entity data")

def reextract_all_entities():
    """Re-extract entities from all documents using spaCy"""
    conn = get_db()
    c = conn.cursor()

    # Get all text documents
    c.execute('SELECT id, filename, content FROM documents WHERE file_type = "txt"')
    documents = c.fetchall()
    total_docs = len(documents)

    print(f"\nProcessing {total_docs} documents with spaCy NER...")

    # Pre-load spaCy model
    print("Loading spaCy model...")
    nlp = get_nlp()
    print("✓ Model loaded")

    processed = 0
    total_entities = 0

    for doc in documents:
        doc_id = doc['id']
        filename = doc['filename']
        content = doc['content']

        if not content:
            processed += 1
            continue

        # Extract entities using spaCy
        try:
            entities = extract_entities_spacy(content)

            # Count entities found
            doc_entity_count = 0

            # Process each entity type
            for entity_type in ['persons', 'organizations', 'locations', 'dates', 'money']:
                db_type = entity_type[:-1]  # Remove trailing 's'

                for entity_name in entities[entity_type]:
                    # Insert or update entity using ON CONFLICT
                    c.execute('''INSERT INTO entities (name, entity_type, mention_count)
                                VALUES (?, ?, 1)
                                ON CONFLICT(name, entity_type)
                                DO UPDATE SET mention_count = mention_count + 1
                                RETURNING id''',
                             (entity_name, db_type))

                    result = c.fetchone()
                    entity_id = result['id'] if result else c.lastrowid

                    # Insert entity mention
                    c.execute('''INSERT OR IGNORE INTO entity_mentions (doc_id, entity_id)
                                VALUES (?, ?)''',
                             (doc_id, entity_id))

                    doc_entity_count += 1

            total_entities += doc_entity_count
            processed += 1

            # Show progress every 100 docs
            if processed % 100 == 0:
                print(f"  Processed {processed}/{total_docs} documents... ({total_entities} entities so far)")
                conn.commit()  # Commit periodically

        except Exception as e:
            print(f"  Error processing {filename}: {e}")
            processed += 1
            continue

    conn.commit()
    conn.close()

    print(f"\n✓ Completed processing {processed} documents")
    print(f"✓ Extracted {total_entities} total entity mentions")

    return processed, total_entities

def show_entity_stats():
    """Show statistics about extracted entities"""
    conn = get_db()
    c = conn.cursor()

    print("\n" + "="*60)
    print("ENTITY EXTRACTION STATISTICS")
    print("="*60)

    # Count by type
    c.execute('''SELECT entity_type, COUNT(*) as count, SUM(mention_count) as total_mentions
                 FROM entities
                 GROUP BY entity_type
                 ORDER BY total_mentions DESC''')

    for row in c.fetchall():
        print(f"\n{row['entity_type'].upper()}:")
        print(f"  Unique: {row['count']}")
        print(f"  Total mentions: {row['total_mentions']}")

    # Top entities
    print("\n" + "-"*60)
    print("TOP 10 MOST MENTIONED ENTITIES:")
    print("-"*60)

    c.execute('''SELECT name, entity_type, mention_count
                 FROM entities
                 ORDER BY mention_count DESC
                 LIMIT 10''')

    for i, row in enumerate(c.fetchall(), 1):
        print(f"{i:2}. {row['name']:30} ({row['entity_type']:12}) - {row['mention_count']:4} mentions")

    conn.close()

def main():
    """Main re-extraction process"""
    print("="*60)
    print("ENTITY RE-EXTRACTION WITH spaCy NER")
    print("="*60)

    # Step 1: Clear old data
    clear_existing_entities()

    # Step 2: Re-extract with spaCy
    docs_processed, entities_extracted = reextract_all_entities()

    # Step 3: Show stats
    show_entity_stats()

    # Step 4: Recalculate co-occurrences
    print("\n" + "="*60)
    print("Recalculating co-occurrence matrix...")
    calculate_cooccurrences(force_recalculate=True)

    # Show co-occurrence stats
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT COUNT(*) as count FROM entity_cooccurrence')
    cooccurrence_count = c.fetchone()['count']

    c.execute('''SELECT e1.name as name1, e2.name as name2, ec.cooccurrence_count
                 FROM entity_cooccurrence ec
                 JOIN entities e1 ON ec.entity1_id = e1.id
                 JOIN entities e2 ON ec.entity2_id = e2.id
                 ORDER BY ec.cooccurrence_count DESC
                 LIMIT 10''')

    print(f"✓ Found {cooccurrence_count} entity co-occurrence pairs")

    print("\nTOP 10 CO-OCCURRENCES:")
    print("-"*60)
    for i, row in enumerate(c.fetchall(), 1):
        print(f"{i:2}. {row['name1']:25} + {row['name2']:25} ({row['cooccurrence_count']} docs)")

    conn.close()

    print("\n" + "="*60)
    print("✓ RE-EXTRACTION COMPLETE")
    print("="*60)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
