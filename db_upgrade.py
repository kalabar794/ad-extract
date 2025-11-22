#!/usr/bin/env python3
"""
Database schema upgrade for advanced investigative features
"""
import sqlite3

def upgrade_database():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()

    print("Upgrading database schema...")

    # Document tags table
    c.execute('''CREATE TABLE IF NOT EXISTS document_tags
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  doc_id INTEGER NOT NULL,
                  tag TEXT NOT NULL,
                  tag_type TEXT DEFAULT 'custom',
                  color TEXT DEFAULT '#d32f2f',
                  created_date TEXT NOT NULL,
                  FOREIGN KEY (doc_id) REFERENCES documents(id),
                  UNIQUE(doc_id, tag))''')

    # Document annotations table
    c.execute('''CREATE TABLE IF NOT EXISTS annotations
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  doc_id INTEGER NOT NULL,
                  text_selection TEXT NOT NULL,
                  start_pos INTEGER,
                  end_pos INTEGER,
                  note TEXT,
                  color TEXT DEFAULT 'yellow',
                  importance INTEGER DEFAULT 1,
                  created_date TEXT NOT NULL,
                  FOREIGN KEY (doc_id) REFERENCES documents(id))''')

    # Document clusters table (for ML clustering)
    c.execute('''CREATE TABLE IF NOT EXISTS document_clusters
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  doc_id INTEGER NOT NULL,
                  cluster_id INTEGER NOT NULL,
                  cluster_name TEXT,
                  similarity_score REAL,
                  keywords TEXT,
                  FOREIGN KEY (doc_id) REFERENCES documents(id))''')

    # Co-occurrence relationships
    c.execute('''CREATE TABLE IF NOT EXISTS entity_cooccurrence
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  entity1_id INTEGER NOT NULL,
                  entity2_id INTEGER NOT NULL,
                  cooccurrence_count INTEGER DEFAULT 0,
                  documents TEXT,
                  FOREIGN KEY (entity1_id) REFERENCES entities(id),
                  FOREIGN KEY (entity2_id) REFERENCES entities(id),
                  UNIQUE(entity1_id, entity2_id))''')

    # Document metadata for anomaly detection
    c.execute('''CREATE TABLE IF NOT EXISTS document_metadata
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  doc_id INTEGER NOT NULL UNIQUE,
                  word_count INTEGER,
                  unique_entities INTEGER,
                  has_redactions BOOLEAN DEFAULT 0,
                  redaction_count INTEGER DEFAULT 0,
                  anomaly_score REAL DEFAULT 0,
                  FOREIGN KEY (doc_id) REFERENCES documents(id))''')

    # Investigation reports
    c.execute('''CREATE TABLE IF NOT EXISTS reports
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  description TEXT,
                  created_date TEXT NOT NULL,
                  updated_date TEXT,
                  status TEXT DEFAULT 'draft',
                  content TEXT)''')

    # Report evidence (links documents to reports)
    c.execute('''CREATE TABLE IF NOT EXISTS report_evidence
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  report_id INTEGER NOT NULL,
                  doc_id INTEGER NOT NULL,
                  evidence_type TEXT DEFAULT 'supporting',
                  notes TEXT,
                  FOREIGN KEY (report_id) REFERENCES reports(id),
                  FOREIGN KEY (doc_id) REFERENCES documents(id))''')

    # Create indexes for performance
    c.execute('CREATE INDEX IF NOT EXISTS idx_tags_doc ON document_tags(doc_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_tags_tag ON document_tags(tag)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_annotations_doc ON annotations(doc_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_clusters_doc ON document_clusters(doc_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_clusters_cluster ON document_clusters(cluster_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_cooccur_e1 ON entity_cooccurrence(entity1_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_cooccur_e2 ON entity_cooccurrence(entity2_id)')

    conn.commit()
    conn.close()

    print("✓ Database schema upgraded successfully!")
    print("New tables created:")
    print("  - document_tags")
    print("  - annotations")
    print("  - document_clusters")
    print("  - entity_cooccurrence")
    print("  - document_metadata")
    print("  - reports")
    print("  - report_evidence")

if __name__ == '__main__':
    upgrade_database()
