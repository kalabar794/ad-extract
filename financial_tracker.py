"""
Financial Transaction Tracker
Extracts financial transactions, tracks money flows, identifies suspicious patterns
"""

import sqlite3
import re
from datetime import datetime
from collections import defaultdict, Counter
import json

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_financial_tables():
    """Initialize database tables for financial tracking"""
    conn = get_db()
    c = conn.cursor()

    # Transactions table
    c.execute('''CREATE TABLE IF NOT EXISTS transactions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  source_doc_id INTEGER NOT NULL,
                  transaction_date TEXT,
                  amount REAL,
                  currency TEXT DEFAULT 'USD',
                  from_entity TEXT,
                  to_entity TEXT,
                  payment_method TEXT,
                  purpose TEXT,
                  is_suspicious BOOLEAN DEFAULT 0,
                  red_flags TEXT,
                  notes TEXT,
                  FOREIGN KEY (source_doc_id) REFERENCES documents(id))''')

    # Bank accounts / shell companies
    c.execute('''CREATE TABLE IF NOT EXISTS financial_entities
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  entity_name TEXT UNIQUE,
                  entity_type TEXT,
                  country TEXT,
                  is_offshore BOOLEAN DEFAULT 0,
                  total_inflow REAL DEFAULT 0,
                  total_outflow REAL DEFAULT 0,
                  transaction_count INTEGER DEFAULT 0,
                  first_seen TEXT,
                  last_seen TEXT,
                  suspicion_level TEXT)''')

    # Money flow patterns (who paid whom)
    c.execute('''CREATE TABLE IF NOT EXISTS money_flows
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  from_entity TEXT NOT NULL,
                  to_entity TEXT NOT NULL,
                  total_amount REAL DEFAULT 0,
                  transaction_count INTEGER DEFAULT 1,
                  currencies TEXT,
                  first_transaction TEXT,
                  last_transaction TEXT,
                  average_amount REAL,
                  suspicious_count INTEGER DEFAULT 0,
                  UNIQUE(from_entity, to_entity))''')

    # Suspicious patterns
    c.execute('''CREATE TABLE IF NOT EXISTS financial_patterns
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  pattern_type TEXT,
                  description TEXT,
                  transaction_ids TEXT,
                  severity TEXT,
                  amount_involved REAL,
                  entities_involved TEXT)''')

    conn.commit()
    conn.close()
    print("✓ Financial tracking tables initialized")

def extract_financial_data(text):
    """
    Extract financial transactions from text

    Looks for:
    - Dollar amounts ($1,000 or $1000 or 1000 dollars)
    - Dates
    - Payment methods (wire, cash, check, bitcoin)
    - Names of people/entities
    - Purposes (payment for, settlement, consulting fee)
    """

    transactions = []

    # Money patterns
    money_patterns = [
        r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # $1,000.00
        r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*dollars?',  # 1000 dollars
        r'USD\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # USD 1000
        r'€\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # €1,000
        r'£\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # £1,000
    ]

    # Payment method patterns
    payment_methods = {
        'wire': r'\b(?:wire|wired|wire transfer)\b',
        'cash': r'\b(?:cash|currency)\b',
        'check': r'\b(?:check|cheque)\b',
        'bitcoin': r'\b(?:bitcoin|btc|crypto)\b',
        'offshore': r'\b(?:offshore|cayman|panama|swiss)\b',
    }

    # Date patterns
    date_patterns = [
        r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',
        r'\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b'
    ]

    # Transaction keywords
    transaction_keywords = [
        r'(?:paid|payment|transfer|sent|wire)',
        r'(?:received|deposited|credited)',
        r'(?:settlement|consulting fee|services rendered|expenses)',
        r'(?:for services|in exchange for|compensation)',
    ]

    # Split into sentences
    sentences = re.split(r'[.!?]\s+', text)

    for sentence in sentences:
        # Look for money amounts
        amount = None
        currency = 'USD'

        for pattern in money_patterns:
            match = re.search(pattern, sentence, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(',', '')
                amount = float(amount_str)

                # Detect currency
                if '€' in sentence[:match.start()]:
                    currency = 'EUR'
                elif '£' in sentence[:match.start()]:
                    currency = 'GBP'
                break

        if not amount:
            continue

        # Look for transaction keywords
        has_transaction_keyword = False
        for keyword_pattern in transaction_keywords:
            if re.search(keyword_pattern, sentence, re.IGNORECASE):
                has_transaction_keyword = True
                break

        if not has_transaction_keyword:
            continue

        # Try to find date
        transaction_date = None
        for pattern in date_patterns:
            date_match = re.search(pattern, sentence, re.IGNORECASE)
            if date_match:
                transaction_date = date_match.group(1)
                break

        # Try to find payment method
        payment_method = None
        for method, pattern in payment_methods.items():
            if re.search(pattern, sentence, re.IGNORECASE):
                payment_method = method
                break

        # Try to extract entities (from/to)
        # Look for "X paid Y" or "payment from X to Y"
        from_entity = None
        to_entity = None

        # Pattern: "X paid Y $amount"
        paid_pattern = r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:paid|transferred|sent|wired)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'
        match = re.search(paid_pattern, sentence)
        if match:
            from_entity = match.group(1)
            to_entity = match.group(2)

        # Pattern: "payment from X to Y"
        from_to_pattern = r'(?:payment|transfer|wire)\s+from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'
        match = re.search(from_to_pattern, sentence, re.IGNORECASE)
        if match:
            from_entity = match.group(1)
            to_entity = match.group(2)

        # Try to extract purpose
        purpose = None
        purpose_patterns = [
            r'for\s+(.{10,50}?)(?:\.|$)',
            r'in exchange for\s+(.{10,50}?)(?:\.|$)',
            r'regarding\s+(.{10,50}?)(?:\.|$)',
        ]
        for pattern in purpose_patterns:
            match = re.search(pattern, sentence, re.IGNORECASE)
            if match:
                purpose = match.group(1).strip()
                break

        transaction = {
            'date': transaction_date,
            'amount': amount,
            'currency': currency,
            'from_entity': from_entity,
            'to_entity': to_entity,
            'payment_method': payment_method,
            'purpose': purpose,
            'raw_text': sentence
        }

        transactions.append(transaction)

    return transactions

def analyze_transaction_suspicion(transaction):
    """Analyze a transaction for red flags"""
    red_flags = []
    suspicion_score = 0

    amount = transaction.get('amount', 0)
    payment_method = transaction.get('payment_method', '')
    purpose = transaction.get('purpose', '') or ''
    raw_text = transaction.get('raw_text', '').lower()

    # Large cash transactions (over $10k)
    if amount >= 10000 and payment_method == 'cash':
        red_flags.append('Large cash transaction (structuring/money laundering)')
        suspicion_score += 5

    # Offshore transfers
    if payment_method == 'offshore' or any(word in raw_text for word in ['cayman', 'panama', 'swiss', 'offshore']):
        red_flags.append('Offshore transfer (tax evasion/hiding assets)')
        suspicion_score += 4

    # Round numbers (often sign of illegitimate payments)
    if amount % 1000 == 0 and amount >= 10000:
        red_flags.append('Round number payment (suspicious)')
        suspicion_score += 2

    # Multiple small transactions (structuring)
    if 9000 <= amount < 10000:
        red_flags.append('Just under $10k reporting threshold (structuring)')
        suspicion_score += 5

    # Vague purposes
    vague_purposes = ['consulting', 'services', 'expenses', 'miscellaneous', 'other']
    if purpose and any(vague in purpose.lower() for vague in vague_purposes):
        red_flags.append('Vague payment purpose (potential cover)')
        suspicion_score += 2

    # Minor-related payments
    if any(word in raw_text for word in ['massage', 'modeling', 'nanny', 'tutoring', 'assistant']):
        red_flags.append('Payment for services potentially involving minors')
        suspicion_score += 4

    # Hush money indicators
    if any(word in raw_text for word in ['settlement', 'nda', 'silence', 'confidential', 'agreement']):
        red_flags.append('Potential hush money/settlement')
        suspicion_score += 5

    # Bitcoin/crypto (harder to trace)
    if payment_method == 'bitcoin':
        red_flags.append('Cryptocurrency transaction (harder to trace)')
        suspicion_score += 3

    return {
        'is_suspicious': suspicion_score >= 3,
        'red_flags': red_flags,
        'suspicion_score': suspicion_score
    }

def import_transactions_from_document(doc_id):
    """Import financial transactions from a document"""
    conn = get_db()
    c = conn.cursor()

    # Get document content
    c.execute('SELECT content, filename FROM documents WHERE id = ?', (doc_id,))
    doc = c.fetchone()

    if not doc:
        conn.close()
        return {'error': 'Document not found'}

    content = doc['content']
    filename = doc['filename']

    print(f"\nExtracting financial transactions from: {filename}")

    # Extract transactions
    transactions = extract_financial_data(content)

    if not transactions:
        print(f"  No financial transactions found")
        conn.close()
        return {'transactions': 0, 'suspicious': 0}

    transactions_added = 0
    suspicious_count = 0

    for transaction in transactions:
        # Analyze for suspicion
        suspicion = analyze_transaction_suspicion(transaction)

        # Insert transaction
        c.execute('''INSERT INTO transactions
                     (source_doc_id, transaction_date, amount, currency,
                      from_entity, to_entity, payment_method, purpose,
                      is_suspicious, red_flags, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                 (doc_id, transaction.get('date'), transaction['amount'],
                  transaction['currency'], transaction.get('from_entity'),
                  transaction.get('to_entity'), transaction.get('payment_method'),
                  transaction.get('purpose'), suspicion['is_suspicious'],
                  json.dumps(suspicion['red_flags']),
                  transaction.get('raw_text')))

        transaction_id = c.lastrowid
        transactions_added += 1

        if suspicion['is_suspicious']:
            suspicious_count += 1

        # Update financial entities
        for entity in [transaction.get('from_entity'), transaction.get('to_entity')]:
            if entity:
                is_offshore = 'offshore' in (transaction.get('raw_text', '').lower())

                c.execute('''INSERT INTO financial_entities
                             (entity_name, entity_type, is_offshore, transaction_count,
                              first_seen, last_seen)
                             VALUES (?, ?, ?, 1, ?, ?)
                             ON CONFLICT(entity_name) DO UPDATE SET
                             transaction_count = transaction_count + 1,
                             last_seen = excluded.last_seen,
                             is_offshore = CASE WHEN excluded.is_offshore = 1 THEN 1 ELSE is_offshore END''',
                         (entity, 'unknown', is_offshore, transaction.get('date'),
                          transaction.get('date')))

        # Update money flows
        if transaction.get('from_entity') and transaction.get('to_entity'):
            c.execute('''INSERT INTO money_flows
                         (from_entity, to_entity, total_amount, transaction_count,
                          currencies, first_transaction, last_transaction, average_amount,
                          suspicious_count)
                         VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)
                         ON CONFLICT(from_entity, to_entity) DO UPDATE SET
                         total_amount = total_amount + excluded.total_amount,
                         transaction_count = transaction_count + 1,
                         last_transaction = excluded.last_transaction,
                         average_amount = (total_amount + excluded.total_amount) / (transaction_count + 1),
                         suspicious_count = suspicious_count + excluded.suspicious_count''',
                     (transaction['from_entity'], transaction['to_entity'],
                      transaction['amount'], transaction['currency'],
                      transaction.get('date'), transaction.get('date'),
                      transaction['amount'], 1 if suspicion['is_suspicious'] else 0))

    conn.commit()
    conn.close()

    print(f"  ✓ Imported {transactions_added} transactions ({suspicious_count} suspicious)")

    return {
        'transactions': transactions_added,
        'suspicious': suspicious_count
    }

def detect_financial_patterns():
    """Detect suspicious financial patterns"""
    conn = get_db()
    c = conn.cursor()

    print("\nDetecting suspicious financial patterns...")

    # Clear old patterns
    c.execute('DELETE FROM financial_patterns')

    patterns_found = 0

    # Pattern 1: Structuring (multiple transactions just under $10k)
    c.execute('''SELECT from_entity, to_entity, COUNT(*) as count,
                        SUM(amount) as total, GROUP_CONCAT(id) as transaction_ids
                 FROM transactions
                 WHERE amount >= 9000 AND amount < 10000
                 AND from_entity IS NOT NULL AND to_entity IS NOT NULL
                 GROUP BY from_entity, to_entity
                 HAVING count >= 2''')

    for row in c.fetchall():
        c.execute('''INSERT INTO financial_patterns
                     (pattern_type, description, transaction_ids, severity, amount_involved, entities_involved)
                     VALUES (?, ?, ?, ?, ?, ?)''',
                 ('structuring', f"{row['from_entity']} → {row['to_entity']}: {row['count']} transactions just under $10k",
                  row['transaction_ids'], 'HIGH', row['total'],
                  f"{row['from_entity']},{row['to_entity']}"))
        patterns_found += 1

    # Pattern 2: Large cash transactions
    c.execute('''SELECT id, from_entity, to_entity, amount, transaction_date
                 FROM transactions
                 WHERE payment_method = 'cash' AND amount >= 10000''')

    large_cash = c.fetchall()
    if large_cash:
        transaction_ids = ','.join(str(t['id']) for t in large_cash)
        total = sum(t['amount'] for t in large_cash)
        entities = set()
        for t in large_cash:
            if t['from_entity']: entities.add(t['from_entity'])
            if t['to_entity']: entities.add(t['to_entity'])

        c.execute('''INSERT INTO financial_patterns
                     (pattern_type, description, transaction_ids, severity, amount_involved, entities_involved)
                     VALUES (?, ?, ?, ?, ?, ?)''',
                 ('large_cash', f"{len(large_cash)} large cash transactions totaling ${total:,.2f}",
                  transaction_ids, 'HIGH', total, ','.join(entities)))
        patterns_found += 1

    # Pattern 3: Offshore flows
    c.execute('''SELECT from_entity, to_entity, SUM(amount) as total,
                        COUNT(*) as count, GROUP_CONCAT(id) as transaction_ids
                 FROM transactions
                 WHERE payment_method = 'offshore' OR is_suspicious = 1
                 GROUP BY from_entity, to_entity
                 HAVING count >= 1''')

    for row in c.fetchall():
        if row['from_entity'] and row['to_entity']:
            c.execute('''INSERT INTO financial_patterns
                         (pattern_type, description, transaction_ids, severity, amount_involved, entities_involved)
                         VALUES (?, ?, ?, ?, ?, ?)''',
                     ('offshore', f"Offshore flow: {row['from_entity']} → {row['to_entity']} (${row['total']:,.2f})",
                      row['transaction_ids'], 'HIGH', row['total'],
                      f"{row['from_entity']},{row['to_entity']}"))
            patterns_found += 1

    # Pattern 4: Same-amount transactions (potential automation/regular payments)
    c.execute('''SELECT amount, COUNT(*) as count, GROUP_CONCAT(id) as transaction_ids,
                        SUM(amount) as total
                 FROM transactions
                 WHERE amount >= 1000
                 GROUP BY amount
                 HAVING count >= 3''')

    for row in c.fetchall():
        c.execute('''INSERT INTO financial_patterns
                     (pattern_type, description, transaction_ids, severity, amount_involved, entities_involved)
                     VALUES (?, ?, ?, ?, ?, ?)''',
                 ('repeated_amounts', f"{row['count']} transactions of exactly ${row['amount']:,.2f}",
                  row['transaction_ids'], 'MEDIUM', row['total'], 'multiple'))
        patterns_found += 1

    conn.commit()
    conn.close()

    print(f"✓ Detected {patterns_found} suspicious patterns")
    return patterns_found

def get_suspicious_transactions(min_score=3):
    """Get transactions with high suspicion scores"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT t.*, d.filename
                 FROM transactions t
                 JOIN documents d ON t.source_doc_id = d.id
                 WHERE t.is_suspicious = 1
                 ORDER BY t.amount DESC''')

    transactions = [dict(row) for row in c.fetchall()]

    # Parse red_flags JSON
    for t in transactions:
        if t['red_flags']:
            t['red_flags'] = json.loads(t['red_flags'])

    conn.close()
    return transactions

def get_money_flow_network(entity_name=None, min_amount=1000):
    """Get money flow network"""
    conn = get_db()
    c = conn.cursor()

    if entity_name:
        c.execute('''SELECT * FROM money_flows
                     WHERE (from_entity LIKE ? OR to_entity LIKE ?)
                     AND total_amount >= ?
                     ORDER BY total_amount DESC''',
                 (f'%{entity_name}%', f'%{entity_name}%', min_amount))
    else:
        c.execute('''SELECT * FROM money_flows
                     WHERE total_amount >= ?
                     ORDER BY total_amount DESC
                     LIMIT 100''',
                 (min_amount,))

    flows = [dict(row) for row in c.fetchall()]
    conn.close()

    return flows

def get_financial_statistics():
    """Get financial statistics"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    c.execute('SELECT COUNT(*) as count, SUM(amount) as total FROM transactions')
    row = c.fetchone()
    stats['total_transactions'] = row['count']
    stats['total_amount'] = row['total'] or 0

    c.execute('SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE is_suspicious = 1')
    row = c.fetchone()
    stats['suspicious_transactions'] = row['count']
    stats['suspicious_amount'] = row['total'] or 0

    c.execute('SELECT COUNT(*) as count FROM financial_entities')
    stats['financial_entities'] = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM financial_entities WHERE is_offshore = 1')
    stats['offshore_entities'] = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM financial_patterns')
    stats['suspicious_patterns'] = c.fetchone()['count']

    c.execute('''SELECT payment_method, COUNT(*) as count, SUM(amount) as total
                 FROM transactions
                 WHERE payment_method IS NOT NULL
                 GROUP BY payment_method
                 ORDER BY total DESC''')
    stats['by_payment_method'] = [dict(row) for row in c.fetchall()]

    conn.close()

    return stats

def get_top_entities(limit=20):
    """Get entities with most transaction activity"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT fe.*,
                        (SELECT SUM(amount) FROM transactions WHERE from_entity = fe.entity_name) as outflow,
                        (SELECT SUM(amount) FROM transactions WHERE to_entity = fe.entity_name) as inflow
                 FROM financial_entities fe
                 ORDER BY transaction_count DESC
                 LIMIT ?''',
             (limit,))

    entities = [dict(row) for row in c.fetchall()]
    conn.close()

    return entities

def get_detected_patterns():
    """Get all detected suspicious patterns"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT * FROM financial_patterns
                 ORDER BY severity DESC, amount_involved DESC''')

    patterns = [dict(row) for row in c.fetchall()]
    conn.close()

    return patterns

if __name__ == '__main__':
    print("="*70)
    print("FINANCIAL TRANSACTION TRACKER")
    print("="*70)

    # Initialize tables
    init_financial_tables()

    print("\nTo use this system:")
    print("1. Upload financial documents (bank statements, wire records, etc.)")
    print("2. Run: python3 -c 'from financial_tracker import import_transactions_from_document; import_transactions_from_document(DOC_ID)'")
    print("3. Run: python3 -c 'from financial_tracker import detect_financial_patterns; detect_financial_patterns()'")
    print("4. Access analysis via web interface")

    # Show current stats
    stats = get_financial_statistics()
    print(f"\nCurrent Statistics:")
    print(f"  Total transactions: {stats['total_transactions']}")
    print(f"  Total amount: ${stats['total_amount']:,.2f}")
    print(f"  Suspicious transactions: {stats['suspicious_transactions']}")
    print(f"  Suspicious amount: ${stats['suspicious_amount']:,.2f}")
    print(f"  Financial entities: {stats['financial_entities']}")
    print(f"  Offshore entities: {stats['offshore_entities']}")
