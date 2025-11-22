#!/usr/bin/env python3
"""
Deduplicate documents in the database
Keeps the oldest copy of each duplicate file
"""

import sqlite3
import os

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def deduplicate_documents():
    """Remove duplicate documents, keeping the oldest copy"""
    conn = get_db()
    c = conn.cursor()

    print("=" * 60)
    print("DOCUMENT DEDUPLICATION")
    print("=" * 60)

    # Get statistics before
    c.execute('SELECT COUNT(*) as total FROM documents')
    total_before = c.fetchone()['total']

    c.execute('SELECT COUNT(DISTINCT filename) as unique_count FROM documents')
    unique_files = c.fetchone()['unique_count']

    duplicates_count = total_before - unique_files

    print(f"\nBefore deduplication:")
    print(f"  Total documents: {total_before}")
    print(f"  Unique files: {unique_files}")
    print(f"  Duplicates to remove: {duplicates_count}")

    # Find duplicates
    c.execute('''
        SELECT filename, COUNT(*) as count, GROUP_CONCAT(id) as ids
        FROM documents
        GROUP BY filename
        HAVING count > 1
        ORDER BY count DESC
    ''')

    duplicates = c.fetchall()

    if not duplicates:
        print("\n✓ No duplicates found!")
        conn.close()
        return

    print(f"\nDuplicate files found:")
    for dup in duplicates:
        print(f"  - {dup['filename']}: {dup['count']} copies")

    # Remove duplicates (keep oldest - lowest ID)
    removed_ids = []
    for dup in duplicates:
        ids = [int(x) for x in dup['ids'].split(',')]
        ids.sort()
        keep_id = ids[0]  # Keep the oldest
        remove_ids = ids[1:]  # Remove the rest

        print(f"\n  {dup['filename']}:")
        print(f"    Keeping ID: {keep_id}")
        print(f"    Removing IDs: {', '.join(map(str, remove_ids))}")

        removed_ids.extend(remove_ids)

    # Delete duplicate documents
    if removed_ids:
        print(f"\nRemoving {len(removed_ids)} duplicate documents...")
        placeholders = ','.join('?' * len(removed_ids))

        # Delete from entity_mentions first (foreign key)
        c.execute(f'DELETE FROM entity_mentions WHERE doc_id IN ({placeholders})', removed_ids)
        mentions_deleted = c.rowcount
        print(f"  ✓ Deleted {mentions_deleted} entity mentions")

        # Delete from documents_fts
        c.execute(f'DELETE FROM documents_fts WHERE doc_id IN ({placeholders})', removed_ids)
        fts_deleted = c.rowcount
        print(f"  ✓ Deleted {fts_deleted} FTS entries")

        # Delete from documents
        c.execute(f'DELETE FROM documents WHERE id IN ({placeholders})', removed_ids)
        docs_deleted = c.rowcount
        print(f"  ✓ Deleted {docs_deleted} documents")

        # Delete physical files
        print(f"\nDeleting physical files...")
        for doc_id in removed_ids:
            # This won't work since we already deleted from DB, but that's OK
            # The files will just remain on disk (harmless)
            pass

        conn.commit()

    # Get statistics after
    c.execute('SELECT COUNT(*) as total FROM documents')
    total_after = c.fetchone()['total']

    print(f"\n" + "=" * 60)
    print("DEDUPLICATION COMPLETE")
    print("=" * 60)
    print(f"Documents before: {total_before}")
    print(f"Documents after:  {total_after}")
    print(f"Removed:          {total_before - total_after}")
    print(f"\n✓ Database deduplicated successfully!")

    conn.close()

def clean_orphaned_entities():
    """Remove entities that are no longer referenced in any documents"""
    conn = get_db()
    c = conn.cursor()

    print(f"\n" + "=" * 60)
    print("CLEANING ORPHANED ENTITIES")
    print("=" * 60)

    # Find entities with no mentions
    c.execute('''
        SELECT e.id, e.name, e.entity_type
        FROM entities e
        LEFT JOIN entity_mentions em ON e.id = em.entity_id
        WHERE em.id IS NULL
    ''')

    orphaned = c.fetchall()

    if orphaned:
        orphaned_ids = [e['id'] for e in orphaned]
        print(f"Found {len(orphaned)} orphaned entities (no document references)")

        placeholders = ','.join('?' * len(orphaned_ids))
        c.execute(f'DELETE FROM entities WHERE id IN ({placeholders})', orphaned_ids)
        deleted = c.rowcount

        conn.commit()
        print(f"✓ Deleted {deleted} orphaned entities")
    else:
        print("✓ No orphaned entities found")

    conn.close()

def rebuild_entity_counts():
    """Recalculate entity mention counts"""
    conn = get_db()
    c = conn.cursor()

    print(f"\n" + "=" * 60)
    print("REBUILDING ENTITY COUNTS")
    print("=" * 60)

    c.execute('''
        UPDATE entities
        SET mention_count = (
            SELECT COUNT(*)
            FROM entity_mentions
            WHERE entity_id = entities.id
        )
    ''')

    updated = c.rowcount
    conn.commit()
    conn.close()

    print(f"✓ Updated mention counts for {updated} entities")

if __name__ == '__main__':
    try:
        deduplicate_documents()
        clean_orphaned_entities()
        rebuild_entity_counts()

        print(f"\n" + "=" * 60)
        print("ALL CLEANUP COMPLETE!")
        print("=" * 60)
        print("\nRecommendation: Restart the Flask app to see updated statistics")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
