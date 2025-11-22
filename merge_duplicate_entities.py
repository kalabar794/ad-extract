#!/usr/bin/env python3
"""Merge duplicate entity names into canonical forms"""

import sqlite3
import re

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# Entity merge rules
MERGE_RULES = {
    'Jeffrey Epstein': ['JEE', 'jeffrey E.', 'jeffrey E. <', 'Jeffrey', 'Epstein', 'jeffrey E."', 'Jeffrey E.', 'JE'],
    'Donald Trump': ['Trump', 'Donald J. Trump', 'DJT'],
    'Bill Clinton': ['Clinton', 'William Clinton', 'William J. Clinton'],
    'Barack Obama': ['Obama'],
    'Ghislaine Maxwell': ['Maxwell', 'Ghislaine'],
    'Prince Andrew': ['Andrew', 'Duke of York'],
}

def merge_entities():
    conn = get_db()
    c = conn.cursor()

    print("="*70)
    print("MERGING DUPLICATE ENTITIES")
    print("="*70)

    for canonical, variants in MERGE_RULES.items():
        print(f"\n{canonical}:")

        # Get or create canonical entity
        c.execute("SELECT id, mention_count FROM entities WHERE name = ? AND entity_type = 'person'", (canonical,))
        canonical_entity = c.fetchone()

        if not canonical_entity:
            c.execute("INSERT INTO entities (name, entity_type, mention_count) VALUES (?, 'person', 0)", (canonical,))
            canonical_id = c.lastrowid
            canonical_mentions = 0
        else:
            canonical_id = canonical_entity['id']
            canonical_mentions = canonical_entity['mention_count']

        total_merged = 0

        for variant in variants:
            c.execute("SELECT id, mention_count FROM entities WHERE name = ? AND entity_type = 'person'", (variant,))
            variant_entity = c.fetchone()

            if variant_entity and variant_entity['id'] != canonical_id:
                variant_id = variant_entity['id']
                variant_mentions = variant_entity['mention_count']

                print(f"  Merging {variant} ({variant_mentions} mentions)")

                # Update entity_mentions to point to canonical
                c.execute("UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?", (canonical_id, variant_id))
                updated = c.rowcount

                # Delete old entity
                c.execute("DELETE FROM entities WHERE id = ?", (variant_id,))

                total_merged += variant_mentions
                print(f"    → Moved {updated} mentions")

        if total_merged > 0:
            # Update canonical mention count
            new_count = canonical_mentions + total_merged
            c.execute("UPDATE entities SET mention_count = ? WHERE id = ?", (new_count, canonical_id))
            print(f"  Total mentions: {canonical_mentions} + {total_merged} = {new_count}")

    conn.commit()

    # Rebuild co-occurrence table
    print(f"\n{'='*70}")
    print("REBUILDING CO-OCCURRENCE TABLE")
    print("="*70)

    c.execute("DELETE FROM entity_cooccurrence")
    c.execute("""
        INSERT INTO entity_cooccurrence (entity1_id, entity2_id, cooccurrence_count, documents)
        SELECT
            e1.entity_id as entity1_id,
            e2.entity_id as entity2_id,
            COUNT(DISTINCT e1.doc_id) as cooccurrence_count,
            json_group_array(DISTINCT e1.doc_id) as documents
        FROM entity_mentions e1
        JOIN entity_mentions e2 ON e1.doc_id = e2.doc_id AND e1.entity_id < e2.entity_id
        GROUP BY e1.entity_id, e2.entity_id
        HAVING COUNT(DISTINCT e1.doc_id) >= 5
    """)

    print(f"✓ Rebuilt {c.rowcount} co-occurrence relationships")

    conn.commit()
    conn.close()

    print(f"\n{'='*70}")
    print("MERGE COMPLETE")
    print("="*70)

if __name__ == '__main__':
    merge_entities()
