"""
Lead Prioritization Engine
Scores and ranks investigative leads by importance and evidence strength
"""

import sqlite3
import json
from typing import List, Dict, Optional
from datetime import datetime
from collections import Counter

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_leads_tables():
    """Initialize database tables for lead management"""
    conn = get_db()
    c = conn.cursor()

    # Investigative leads table
    c.execute('''CREATE TABLE IF NOT EXISTS investigative_leads
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  lead_title TEXT NOT NULL,
                  lead_description TEXT NOT NULL,
                  lead_type TEXT NOT NULL,
                  priority_score REAL NOT NULL,
                  evidence_strength REAL DEFAULT 0.0,
                  corroboration_count INTEGER DEFAULT 0,
                  related_documents TEXT,
                  related_entities TEXT,
                  status TEXT DEFAULT 'new',
                  assigned_to TEXT,
                  created_date TEXT NOT NULL,
                  updated_date TEXT,
                  investigation_notes TEXT)''')

    # Lead evidence linkstable
    c.execute('''CREATE TABLE IF NOT EXISTS lead_evidence
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  lead_id INTEGER NOT NULL,
                  evidence_type TEXT NOT NULL,
                  evidence_id INTEGER NOT NULL,
                  evidence_source TEXT,
                  strength_contribution REAL DEFAULT 0.0,
                  FOREIGN KEY (lead_id) REFERENCES investigative_leads(id))''')

    # Create indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_leads_status ON investigative_leads(status)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_leads_priority ON investigative_leads(priority_score DESC)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_lead_evidence ON lead_evidence(lead_id)')

    conn.commit()
    conn.close()

def generate_all_leads() -> Dict:
    """
    Generate investigative leads from all available sources:
    - Contradictions
    - Suspicious emails
    - Flight anomalies
    - Financial red flags
    - Document anomalies
    """
    conn = get_db()
    leads_created = 0

    # Generate leads from contradictions
    contradiction_leads = generate_contradiction_leads()
    leads_created += len(contradiction_leads)

    # Generate leads from suspicious emails
    email_leads = generate_email_leads()
    leads_created += len(email_leads)

    # Generate leads from flight anomalies
    flight_leads = generate_flight_leads()
    leads_created += len(flight_leads)

    # Generate leads from financial patterns
    financial_leads = generate_financial_leads()
    leads_created += len(financial_leads)

    # Generate leads from entity networks
    network_leads = generate_network_leads()
    leads_created += len(network_leads)

    conn.close()

    return {
        'success': True,
        'leads_created': leads_created,
        'by_type': {
            'contradictions': len(contradiction_leads),
            'emails': len(email_leads),
            'flights': len(flight_leads),
            'financial': len(financial_leads),
            'networks': len(network_leads)
        }
    }

def generate_contradiction_leads() -> List[int]:
    """Generate leads from detected contradictions"""
    conn = get_db()
    c = conn.cursor()
    lead_ids = []

    try:
        c.execute('''SELECT c.*,
                            cl1.claim_text as claim1, cl1.speaker as speaker1,
                            cl2.claim_text as claim2, cl2.speaker as speaker2
                     FROM contradictions c
                     JOIN claims cl1 ON c.claim1_id = cl1.id
                     JOIN claims cl2 ON c.claim2_id = cl2.id
                     WHERE c.severity IN ('high', 'medium')
                     AND c.confidence_score >= 0.6''')

        contradictions = c.fetchall()

        for contra in contradictions:
            # Calculate priority score
            severity_weight = {'high': 1.0, 'medium': 0.6, 'low': 0.3}
            priority = (severity_weight[contra['severity']] * 0.6 +
                       contra['confidence_score'] * 0.4)

            # Create lead
            title = f"Contradiction: {contra['speaker1']} vs {contra['speaker2']}"
            description = f"""
**Type:** {contra['contradiction_type'].title()} Contradiction
**Severity:** {contra['severity'].upper()}
**Confidence:** {int(contra['confidence_score'] * 100)}%

**Claim 1 ({contra['speaker1']}):**
"{contra['claim1']}"

**Claim 2 ({contra['speaker2']}):**
"{contra['claim2']}"

**Analysis:**
{contra['explanation']}

**Investigation Prompt:**
Verify which claim is accurate by cross-referencing with objective evidence (flight logs, financial records, photos).
            """.strip()

            lead_id = save_lead(
                title=title,
                description=description,
                lead_type='contradiction',
                priority_score=priority,
                evidence_strength=contra['confidence_score'],
                corroboration_count=2,
                related_entities=json.dumps([contra['speaker1'], contra['speaker2']])
            )

            lead_ids.append(lead_id)

    except sqlite3.OperationalError:
        # Contradictions table doesn't exist yet
        pass

    conn.close()
    return lead_ids

def generate_email_leads() -> List[int]:
    """Generate leads from suspicious emails"""
    conn = get_db()
    c = conn.cursor()
    lead_ids = []

    try:
        c.execute('''SELECT * FROM emails
                     WHERE is_suspicious = 1
                     ORDER BY id DESC
                     LIMIT 50''')

        emails = c.fetchall()

        for email in emails:
            keywords = json.loads(email['suspicious_keywords']) if email['suspicious_keywords'] else []

            if len(keywords) >= 3:  # Multiple red flags
                priority = min(len(keywords) * 0.15, 1.0)

                title = f"Suspicious Email: {email['subject']}"
                description = f"""
**From:** {email['from_address']}
**To:** {email['to_addresses']}
**Date:** {email['date_sent']}
**Subject:** {email['subject']}

**Red Flags ({len(keywords)}):**
{', '.join(keywords)}

**Excerpt:**
{email['body'][:300]}...

**Investigation Prompt:**
Review full email content and investigate mentioned individuals, payments, or arrangements.
                """.strip()

                lead_id = save_lead(
                    title=title,
                    description=description,
                    lead_type='suspicious_email',
                    priority_score=priority,
                    evidence_strength=len(keywords) / 10.0,
                    corroboration_count=1,
                    related_documents=json.dumps([email['source_doc_id']])
                )

                lead_ids.append(lead_id)

    except sqlite3.OperationalError:
        pass

    conn.close()
    return lead_ids

def generate_flight_leads() -> List[int]:
    """Generate leads from flight log anomalies"""
    conn = get_db()
    c = conn.cursor()
    lead_ids = []

    try:
        # Minor travel alerts
        c.execute('''SELECT * FROM minor_travel_alerts
                     WHERE severity IN ('high', 'critical')
                     ORDER BY alert_date DESC
                     LIMIT 30''')

        alerts = c.fetchall()

        for alert in alerts:
            severity_weight = {'critical': 1.0, 'high': 0.7, 'medium': 0.4}
            priority = severity_weight.get(alert['severity'], 0.5)

            c.execute('SELECT * FROM flight_logs WHERE id = ?', (alert['flight_id'],))
            flight = c.fetchone()

            if flight:
                title = f"Minor Travel Alert: {flight['origin']} → {flight['destination']}"
                description = f"""
**Alert Type:** {alert['indicator_type']}
**Severity:** {alert['severity'].upper()}
**Date:** {flight['departure_date']}

**Flight Details:**
- Aircraft: {flight['aircraft_type']} ({flight['tail_number']})
- Route: {flight['origin']} → {flight['destination']}
- Passengers: {flight['passengers']}

**Investigation Prompt:**
Identify and interview the minor passenger(s). Verify guardian presence and travel purpose.
                """.strip()

                lead_id = save_lead(
                    title=title,
                    description=description,
                    lead_type='flight_anomaly',
                    priority_score=priority,
                    evidence_strength=priority,
                    corroboration_count=1
                )

                lead_ids.append(lead_id)

    except sqlite3.OperationalError:
        pass

    conn.close()
    return lead_ids

def generate_financial_leads() -> List[int]:
    """Generate leads from suspicious financial patterns"""
    conn = get_db()
    c = conn.cursor()
    lead_ids = []

    try:
        c.execute('''SELECT * FROM financial_transactions
                     WHERE is_suspicious = 1
                     ORDER BY amount DESC
                     LIMIT 30''')

        transactions = c.fetchall()

        for txn in transactions:
            # Higher amounts = higher priority
            amount_score = min(txn['amount'] / 100000, 0.5)  # Cap at $100K
            priority = amount_score + 0.4  # Base priority for suspicious

            title = f"Suspicious Transaction: ${txn['amount']:,.2f}"
            description = f"""
**Amount:** ${txn['amount']:,.2f} {txn['currency']}
**Date:** {txn['transaction_date']}
**From:** {txn['from_entity']}
**To:** {txn['to_entity']}
**Bank:** {txn['bank_name']}
{'**OFFSHORE**' if txn['is_offshore'] else ''}

**Investigation Prompt:**
Investigate the purpose of this payment. Verify if recipient is a shell company or individual. Check for related transactions.
            """.strip()

            lead_id = save_lead(
                title=title,
                description=description,
                lead_type='financial_suspicious',
                priority_score=min(priority, 1.0),
                evidence_strength=0.7,
                corroboration_count=1,
                related_documents=json.dumps([txn['source_doc_id']]) if txn['source_doc_id'] else None
            )

            lead_ids.append(lead_id)

    except sqlite3.OperationalError:
        pass

    conn.close()
    return lead_ids

def generate_network_leads() -> List[int]:
    """Generate leads from entity network analysis"""
    conn = get_db()
    c = conn.cursor()
    lead_ids = []

    try:
        # Find highly connected entities
        c.execute('''SELECT entity_id, COUNT(*) as connection_count
                     FROM entity_mentions
                     GROUP BY entity_id
                     HAVING connection_count > 10
                     ORDER BY connection_count DESC
                     LIMIT 20''')

        entities = c.fetchall()

        for ent in entities:
            c.execute('SELECT name, entity_type FROM entities WHERE id = ?', (ent['entity_id'],))
            entity = c.fetchone()

            if entity and entity['entity_type'] == 'PERSON':
                priority = min(ent['connection_count'] / 50.0, 0.8)

                title = f"Highly Connected: {entity['name']}"
                description = f"""
**Entity:** {entity['name']}
**Type:** Person
**Document Mentions:** {ent['connection_count']}

**Investigation Prompt:**
This individual appears in {ent['connection_count']} documents. Investigate their relationship to Epstein and role in operations.
                """.strip()

                lead_id = save_lead(
                    title=title,
                    description=description,
                    lead_type='network_analysis',
                    priority_score=priority,
                    evidence_strength=min(ent['connection_count'] / 20.0, 1.0),
                    corroboration_count=ent['connection_count'],
                    related_entities=json.dumps([entity['name']])
                )

                lead_ids.append(lead_id)

    except sqlite3.OperationalError:
        pass

    conn.close()
    return lead_ids

def save_lead(title: str, description: str, lead_type: str, priority_score: float,
              evidence_strength: float = 0.0, corroboration_count: int = 0,
              related_documents: str = None, related_entities: str = None) -> int:
    """Save a lead to the database"""
    conn = get_db()
    c = conn.cursor()

    # Check if similar lead already exists
    c.execute('SELECT id FROM investigative_leads WHERE lead_title = ?', (title,))
    existing = c.fetchone()

    if existing:
        # Update existing
        c.execute('''UPDATE investigative_leads
                     SET priority_score = ?,
                         evidence_strength = ?,
                         corroboration_count = ?,
                         updated_date = ?
                     WHERE id = ?''',
                  (priority_score, evidence_strength, corroboration_count,
                   datetime.now().isoformat(), existing['id']))
        lead_id = existing['id']
    else:
        # Insert new
        c.execute('''INSERT INTO investigative_leads
                     (lead_title, lead_description, lead_type, priority_score,
                      evidence_strength, corroboration_count, related_documents,
                      related_entities, created_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (title, description, lead_type, priority_score, evidence_strength,
                   corroboration_count, related_documents, related_entities,
                   datetime.now().isoformat()))
        lead_id = c.lastrowid

    conn.commit()
    conn.close()

    return lead_id

def get_prioritized_leads(status: str = None, lead_type: str = None, limit: int = 50) -> List[Dict]:
    """Get leads sorted by priority"""
    conn = get_db()
    c = conn.cursor()

    query = 'SELECT * FROM investigative_leads WHERE 1=1'
    params = []

    if status:
        query += ' AND status = ?'
        params.append(status)

    if lead_type:
        query += ' AND lead_type = ?'
        params.append(lead_type)

    query += ' ORDER BY priority_score DESC, created_date DESC LIMIT ?'
    params.append(limit)

    c.execute(query, params)

    leads = []
    for row in c.fetchall():
        lead = dict(row)
        if lead['related_entities']:
            lead['related_entities'] = json.loads(lead['related_entities'])
        if lead['related_documents']:
            lead['related_documents'] = json.loads(lead['related_documents'])
        leads.append(lead)

    conn.close()
    return leads

def update_lead_status(lead_id: int, status: str, notes: str = None) -> bool:
    """Update the status of a lead"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''UPDATE investigative_leads
                 SET status = ?,
                     investigation_notes = COALESCE(investigation_notes, '') || ? || char(10),
                     updated_date = ?
                 WHERE id = ?''',
              (status, notes or '', datetime.now().isoformat(), lead_id))

    conn.commit()
    success = c.rowcount > 0
    conn.close()

    return success

def get_lead_stats() -> Dict:
    """Get statistics about leads"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    # Total leads
    c.execute('SELECT COUNT(*) as total FROM investigative_leads')
    stats['total_leads'] = c.fetchone()['total']

    # By status
    c.execute('''SELECT status, COUNT(*) as count
                 FROM investigative_leads
                 GROUP BY status''')
    stats['by_status'] = {row['status']: row['count'] for row in c.fetchall()}

    # By type
    c.execute('''SELECT lead_type, COUNT(*) as count
                 FROM investigative_leads
                 GROUP BY lead_type''')
    stats['by_type'] = {row['lead_type']: row['count'] for row in c.fetchall()}

    # High priority leads
    c.execute('SELECT COUNT(*) as count FROM investigative_leads WHERE priority_score >= 0.7')
    stats['high_priority'] = c.fetchone()['count']

    # Average priority
    c.execute('SELECT AVG(priority_score) as avg FROM investigative_leads')
    stats['average_priority'] = c.fetchone()['avg'] or 0.0

    conn.close()
    return stats

if __name__ == '__main__':
    print("Initializing Lead Prioritization Engine...")
    init_leads_tables()
    print("✓ Tables initialized")

    print("\nGenerating investigative leads...")
    result = generate_all_leads()

    if result['success']:
        print(f"✓ Created {result['leads_created']} leads")
        print(f"\nBy type:")
        for lead_type, count in result['by_type'].items():
            print(f"  {lead_type}: {count}")

        # Show stats
        print("\n" + "="*60)
        stats = get_lead_stats()
        print(f"Total leads: {stats['total_leads']}")
        print(f"High priority leads: {stats['high_priority']}")
        print(f"Average priority: {stats['average_priority']:.2f}")
        print(f"\nBy status: {stats['by_status']}")
