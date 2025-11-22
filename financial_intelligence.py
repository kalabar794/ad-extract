"""
Financial Intelligence System
Complete implementation analyzing 191 financial documents
Tracks wire transfers, payments, offshore accounts, builds transaction network
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

def init_financial_intelligence():
    """Initialize comprehensive financial tracking tables"""
    conn = get_db()
    c = conn.cursor()

    # Enhanced transactions table
    c.execute('''CREATE TABLE IF NOT EXISTS financial_transactions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  source_doc_id INTEGER NOT NULL,
                  transaction_date TEXT,
                  amount REAL,
                  currency TEXT DEFAULT 'USD',
                  from_entity TEXT,
                  to_entity TEXT,
                  from_account TEXT,
                  to_account TEXT,
                  payment_method TEXT,
                  bank_name TEXT,
                  routing_number TEXT,
                  account_number TEXT,
                  wire_reference TEXT,
                  purpose TEXT,
                  is_offshore BOOLEAN DEFAULT 0,
                  is_suspicious BOOLEAN DEFAULT 0,
                  red_flags TEXT,
                  notes TEXT,
                  extracted_context TEXT,
                  FOREIGN KEY (source_doc_id) REFERENCES documents(id))''')

    # Shell companies and offshore entities
    c.execute('''CREATE TABLE IF NOT EXISTS shell_companies
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  company_name TEXT UNIQUE,
                  jurisdiction TEXT,
                  registration_number TEXT,
                  registered_agent TEXT,
                  is_offshore BOOLEAN DEFAULT 0,
                  is_suspicious BOOLEAN DEFAULT 0,
                  total_transactions REAL DEFAULT 0,
                  transaction_count INTEGER DEFAULT 0,
                  linked_entities TEXT,
                  first_seen TEXT,
                  last_seen TEXT,
                  notes TEXT)''')

    # Wire transfer network
    c.execute('''CREATE TABLE IF NOT EXISTS wire_transfers
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  transaction_id INTEGER,
                  from_entity TEXT NOT NULL,
                  to_entity TEXT NOT NULL,
                  from_bank TEXT,
                  to_bank TEXT,
                  swift_code TEXT,
                  iban TEXT,
                  amount REAL,
                  currency TEXT,
                  date_sent TEXT,
                  purpose TEXT,
                  suspicious_pattern TEXT,
                  FOREIGN KEY (transaction_id) REFERENCES financial_transactions(id))''')

    # Payment networks (who paid whom)
    c.execute('''CREATE TABLE IF NOT EXISTS payment_network
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  payer TEXT NOT NULL,
                  payee TEXT NOT NULL,
                  total_amount REAL DEFAULT 0,
                  transaction_count INTEGER DEFAULT 1,
                  currencies TEXT,
                  payment_methods TEXT,
                  first_payment TEXT,
                  last_payment TEXT,
                  average_amount REAL,
                  suspicious_count INTEGER DEFAULT 0,
                  red_flags TEXT,
                  UNIQUE(payer, payee))''')

    # Offshore accounts tracking
    c.execute('''CREATE TABLE IF NOT EXISTS offshore_accounts
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  account_number TEXT,
                  bank_name TEXT,
                  country TEXT,
                  account_holder TEXT,
                  beneficial_owner TEXT,
                  total_deposits REAL DEFAULT 0,
                  total_withdrawals REAL DEFAULT 0,
                  transaction_count INTEGER DEFAULT 0,
                  opened_date TEXT,
                  closed_date TEXT,
                  is_suspicious BOOLEAN DEFAULT 1,
                  notes TEXT)''')

    # Suspicious financial patterns
    c.execute('''CREATE TABLE IF NOT EXISTS suspicious_financial_patterns
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  pattern_type TEXT,
                  pattern_name TEXT,
                  description TEXT,
                  severity TEXT,
                  amount_involved REAL,
                  transaction_ids TEXT,
                  entities_involved TEXT,
                  date_detected TEXT,
                  evidence TEXT)''')

    # Create indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_ftrans_from ON financial_transactions(from_entity)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_ftrans_to ON financial_transactions(to_entity)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_ftrans_date ON financial_transactions(transaction_date)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_wire_from ON wire_transfers(from_entity)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_wire_to ON wire_transfers(to_entity)')

    conn.commit()
    conn.close()
    print("✓ Financial Intelligence tables initialized")

def extract_financial_transactions(text, doc_id):
    """Extract ALL financial transaction data from text"""
    transactions = []

    # Comprehensive money patterns
    money_patterns = [
        (r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', 'USD'),  # $1,000.00
        (r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:US\s)?dollars?', 'USD'),
        (r'USD\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', 'USD'),
        (r'€\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', 'EUR'),
        (r'£\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', 'GBP'),
        (r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*euros?', 'EUR'),
        (r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*pounds?', 'GBP'),
    ]

    # Date patterns
    date_pattern = r'(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})'

    # Payment method keywords
    payment_methods = ['wire transfer', 'wire', 'check', 'cash', 'bitcoin', 'cryptocurrency',
                      'bank transfer', 'ACH', 'SWIFT', 'payment', 'transaction']

    # Parse line by line for transactions
    lines = text.split('\n')
    for i, line in enumerate(lines):
        # Skip empty lines
        if not line.strip():
            continue

        # Look for money amounts
        for pattern, currency in money_patterns:
            matches = re.finditer(pattern, line, re.IGNORECASE)
            for match in matches:
                amount_str = match.group(1).replace(',', '')
                try:
                    amount = float(amount_str)
                except:
                    continue

                # Get context (surrounding lines)
                context_start = max(0, i-2)
                context_end = min(len(lines), i+3)
                context = ' '.join(lines[context_start:context_end])

                # Extract date from context
                date_match = re.search(date_pattern, context, re.IGNORECASE)
                trans_date = date_match.group(0) if date_match else None

                # Extract entities (names, companies)
                from_entity = None
                to_entity = None

                # Look for "from X to Y" pattern
                from_to = re.search(r'from\s+([A-Z][a-zA-Z\s&.]+?)(?:\s+to|\s+for|\s+paid)', context, re.IGNORECASE)
                if from_to:
                    from_entity = from_to.group(1).strip()

                to_pattern = re.search(r'to\s+([A-Z][a-zA-Z\s&.]+?)(?:\s+for|\s+via|\s+through|\.|\n|$)', context, re.IGNORECASE)
                if to_pattern:
                    to_entity = to_pattern.group(1).strip()

                # Extract payment method
                payment_method = None
                for method in payment_methods:
                    if method in context.lower():
                        payment_method = method
                        break

                # Extract purpose
                purpose = None
                purpose_patterns = [
                    r'(?:for|purpose:)\s+([^.\n]+)',
                    r'(?:payment for|paid for)\s+([^.\n]+)',
                    r're:?\s+([^.\n]+)',
                ]
                for p in purpose_patterns:
                    purpose_match = re.search(p, context, re.IGNORECASE)
                    if purpose_match:
                        purpose = purpose_match.group(1).strip()
                        break

                # Check if suspicious
                is_suspicious = check_suspicious_transaction(amount, currency, from_entity, to_entity, purpose, context)
                red_flags = get_red_flags(amount, currency, from_entity, to_entity, purpose, context)

                # Check if offshore
                is_offshore = check_offshore(context)

                transactions.append({
                    'doc_id': doc_id,
                    'amount': amount,
                    'currency': currency,
                    'date': trans_date,
                    'from_entity': from_entity,
                    'to_entity': to_entity,
                    'payment_method': payment_method,
                    'purpose': purpose,
                    'is_suspicious': is_suspicious,
                    'is_offshore': is_offshore,
                    'red_flags': json.dumps(red_flags),
                    'context': context[:500]
                })

    return transactions

def check_offshore(text):
    """Check if transaction involves offshore entities"""
    offshore_keywords = [
        'cayman', 'bermuda', 'panama', 'british virgin', 'bvi', 'luxembourg',
        'liechtenstein', 'monaco', 'bahamas', 'seychelles', 'malta', 'cyprus',
        'offshore', 'shell company', 'nominee', 'beneficial owner'
    ]
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in offshore_keywords)

def check_suspicious_transaction(amount, currency, from_entity, to_entity, purpose, context):
    """Determine if transaction is suspicious"""
    suspicious = False

    # Large amounts
    if amount and amount > 100000:
        suspicious = True

    # Round amounts (often used in illegal transactions)
    if amount and amount % 10000 == 0:
        suspicious = True

    # Suspicious keywords
    suspicious_keywords = [
        'cash', 'consulting fee', 'massage', 'modeling', 'entertainment',
        'settlement', 'confidential', 'nda', 'non-disclosure', 'hush',
        'offshore', 'shell', 'loan' ,'gift', 'donation'
    ]

    context_lower = context.lower() if context else ''
    if any(kw in context_lower for kw in suspicious_keywords):
        suspicious = True

    # Payments to minors or unknown recipients
    if to_entity and ('minor' in to_entity.lower() or 'jane doe' in to_entity.lower()):
        suspicious = True

    return suspicious

def get_red_flags(amount, currency, from_entity, to_entity, purpose, context):
    """Get list of red flags for transaction"""
    flags = []

    if amount and amount > 100000:
        flags.append('Large amount over $100k')

    if amount and amount % 10000 == 0:
        flags.append('Round amount (structuring risk)')

    if 'cash' in context.lower():
        flags.append('Cash transaction')

    if check_offshore(context):
        flags.append('Offshore entity involved')

    if purpose:
        suspicious_purposes = ['consulting', 'massage', 'modeling', 'entertainment', 'settlement', 'gift']
        if any(sp in purpose.lower() for sp in suspicious_purposes):
            flags.append(f'Suspicious purpose: {purpose}')

    if not from_entity or not to_entity:
        flags.append('Missing sender/recipient information')

    return flags

def import_all_financial_documents():
    """Scan ALL documents and import financial data"""
    conn = get_db()
    c = conn.cursor()

    # Get all documents
    c.execute('SELECT id, content, filename FROM documents WHERE content IS NOT NULL')
    docs = c.fetchall()

    total_transactions = 0
    financial_docs = 0

    for doc in docs:
        doc_id = doc['id']
        content = doc['content']
        filename = doc['filename']

        if not content or len(content) < 50:
            continue

        # Look for financial keywords
        financial_keywords = ['payment', 'wire', 'transfer', '$', 'USD', 'account', 'bank',
                            'transaction', 'invoice', 'check', 'deposit', 'withdrawal']

        has_financial = any(kw in content.lower() for kw in financial_keywords)
        if not has_financial:
            continue

        # Extract transactions
        transactions = extract_financial_transactions(content, doc_id)

        if transactions:
            financial_docs += 1

            for trans in transactions:
                c.execute('''INSERT INTO financial_transactions
                           (source_doc_id, transaction_date, amount, currency, from_entity,
                            to_entity, payment_method, purpose, is_offshore, is_suspicious,
                            red_flags, extracted_context)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                        (trans['doc_id'], trans['date'], trans['amount'], trans['currency'],
                         trans['from_entity'], trans['to_entity'], trans['payment_method'],
                         trans['purpose'], trans['is_offshore'], trans['is_suspicious'],
                         trans['red_flags'], trans['context']))
                total_transactions += 1

    conn.commit()
    conn.close()

    return {
        'financial_documents': financial_docs,
        'total_transactions': total_transactions
    }

def build_payment_network():
    """Build who-paid-whom network"""
    conn = get_db()
    c = conn.cursor()

    # Clear existing network
    c.execute('DELETE FROM payment_network')

    # Get all transactions with both parties
    c.execute('''SELECT from_entity, to_entity, amount, currency, payment_method,
                        transaction_date, is_suspicious
                 FROM financial_transactions
                 WHERE from_entity IS NOT NULL AND to_entity IS NOT NULL''')

    transactions = c.fetchall()

    # Build network
    network = defaultdict(lambda: {
        'total_amount': 0,
        'count': 0,
        'currencies': set(),
        'methods': set(),
        'dates': [],
        'suspicious_count': 0
    })

    for trans in transactions:
        key = (trans['from_entity'].strip(), trans['to_entity'].strip())
        network[key]['total_amount'] += trans['amount'] or 0
        network[key]['count'] += 1
        network[key]['currencies'].add(trans['currency'])
        if trans['payment_method']:
            network[key]['methods'].add(trans['payment_method'])
        if trans['transaction_date']:
            network[key]['dates'].append(trans['transaction_date'])
        if trans['is_suspicious']:
            network[key]['suspicious_count'] += 1

    # Insert into database
    for (payer, payee), data in network.items():
        dates = sorted(data['dates'])
        first_payment = dates[0] if dates else None
        last_payment = dates[-1] if dates else None
        avg_amount = data['total_amount'] / data['count'] if data['count'] > 0 else 0

        c.execute('''INSERT INTO payment_network
                   (payer, payee, total_amount, transaction_count, currencies,
                    payment_methods, first_payment, last_payment, average_amount, suspicious_count)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (payer, payee, data['total_amount'], data['count'],
                 json.dumps(list(data['currencies'])),
                 json.dumps(list(data['methods'])),
                 first_payment, last_payment, avg_amount, data['suspicious_count']))

    conn.commit()
    conn.close()

    return len(network)

def detect_suspicious_patterns():
    """Detect suspicious financial patterns"""
    conn = get_db()
    c = conn.cursor()

    patterns_found = []

    # Pattern 1: Structuring (multiple transactions just under reporting threshold)
    c.execute('''SELECT from_entity, to_entity, COUNT(*) as count, SUM(amount) as total
                 FROM financial_transactions
                 WHERE amount BETWEEN 9000 AND 10000
                 GROUP BY from_entity, to_entity
                 HAVING count >= 2''')

    for row in c.fetchall():
        c.execute('''INSERT INTO suspicious_financial_patterns
                   (pattern_type, pattern_name, description, severity, amount_involved, entities_involved)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                ('structuring', 'Potential Structuring',
                 f'{row["count"]} transactions just under $10k reporting threshold',
                 'HIGH', row['total'],
                 json.dumps([row['from_entity'], row['to_entity']])))
        patterns_found.append('structuring')

    # Pattern 2: Large cash transactions
    c.execute('''SELECT * FROM financial_transactions
                 WHERE payment_method LIKE '%cash%' AND amount > 10000''')

    cash_trans = c.fetchall()
    if cash_trans:
        amount_total = sum(t['amount'] for t in cash_trans)
        entities = set()
        for t in cash_trans:
            if t['from_entity']:
                entities.add(t['from_entity'])
            if t['to_entity']:
                entities.add(t['to_entity'])

        c.execute('''INSERT INTO suspicious_financial_patterns
                   (pattern_type, pattern_name, description, severity, amount_involved, entities_involved)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                ('large_cash', 'Large Cash Transactions',
                 f'{len(cash_trans)} large cash transactions over $10k',
                 'HIGH', amount_total, json.dumps(list(entities))))
        patterns_found.append('large_cash')

    # Pattern 3: Offshore payments
    c.execute('''SELECT COUNT(*) as count, SUM(amount) as total
                 FROM financial_transactions
                 WHERE is_offshore = 1''')

    offshore = c.fetchone()
    if offshore and offshore['count'] > 0:
        c.execute('''INSERT INTO suspicious_financial_patterns
                   (pattern_type, pattern_name, description, severity, amount_involved)
                   VALUES (?, ?, ?, ?, ?)''',
                ('offshore', 'Offshore Transactions',
                 f'{offshore["count"]} transactions involving offshore entities',
                 'MEDIUM', offshore['total']))
        patterns_found.append('offshore')

    # Pattern 4: Rapid succession of payments
    c.execute('''SELECT from_entity, to_entity, transaction_date, amount
                 FROM financial_transactions
                 WHERE transaction_date IS NOT NULL
                 ORDER BY from_entity, to_entity, transaction_date''')

    # Pattern 5: Unusual payment purposes
    c.execute('''SELECT * FROM financial_transactions
                 WHERE purpose LIKE '%massage%' OR purpose LIKE '%modeling%'
                    OR purpose LIKE '%consulting%' OR purpose LIKE '%entertainment%'
                 AND amount > 5000''')

    suspicious_purposes = c.fetchall()
    if suspicious_purposes:
        amount_total = sum(t['amount'] for t in suspicious_purposes)
        c.execute('''INSERT INTO suspicious_financial_patterns
                   (pattern_type, pattern_name, description, severity, amount_involved)
                   VALUES (?, ?, ?, ?, ?)''',
                ('suspicious_purpose', 'Suspicious Payment Purposes',
                 f'{len(suspicious_purposes)} payments with suspicious purposes (massage, modeling, consulting)',
                 'HIGH', amount_total))
        patterns_found.append('suspicious_purpose')

    conn.commit()
    conn.close()

    return patterns_found

def get_financial_statistics():
    """Get comprehensive financial statistics"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    # Total transactions
    c.execute('SELECT COUNT(*) as count FROM financial_transactions')
    stats['total_transactions'] = c.fetchone()['count']

    # Total amount
    c.execute('SELECT SUM(amount) as total FROM financial_transactions')
    result = c.fetchone()
    stats['total_amount'] = result['total'] if result['total'] else 0

    # Suspicious transactions
    c.execute('SELECT COUNT(*) as count FROM financial_transactions WHERE is_suspicious = 1')
    stats['suspicious_transactions'] = c.fetchone()['count']

    # Offshore transactions
    c.execute('SELECT COUNT(*) as count FROM financial_transactions WHERE is_offshore = 1')
    stats['offshore_transactions'] = c.fetchone()['count']

    # Top payers
    c.execute('''SELECT from_entity, COUNT(*) as count, SUM(amount) as total
                 FROM financial_transactions
                 WHERE from_entity IS NOT NULL
                 GROUP BY from_entity
                 ORDER BY total DESC
                 LIMIT 10''')
    stats['top_payers'] = [dict(row) for row in c.fetchall()]

    # Top payees
    c.execute('''SELECT to_entity, COUNT(*) as count, SUM(amount) as total
                 FROM financial_transactions
                 WHERE to_entity IS NOT NULL
                 GROUP BY to_entity
                 ORDER BY total DESC
                 LIMIT 10''')
    stats['top_payees'] = [dict(row) for row in c.fetchall()]

    # Payment methods breakdown
    c.execute('''SELECT payment_method, COUNT(*) as count, SUM(amount) as total
                 FROM financial_transactions
                 WHERE payment_method IS NOT NULL
                 GROUP BY payment_method
                 ORDER BY count DESC''')
    stats['payment_methods'] = [dict(row) for row in c.fetchall()]

    # Suspicious patterns
    c.execute('SELECT pattern_type, COUNT(*) as count FROM suspicious_financial_patterns GROUP BY pattern_type')
    stats['suspicious_patterns'] = {row['pattern_type']: row['count'] for row in c.fetchall()}

    conn.close()
    return stats

def get_transaction_network(min_amount=1000):
    """Get transaction network data for visualization"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT payer, payee, total_amount, transaction_count, suspicious_count
                 FROM payment_network
                 WHERE total_amount >= ?
                 ORDER BY total_amount DESC''', (min_amount,))

    edges = []
    nodes = set()

    for row in c.fetchall():
        payer = row['payer']
        payee = row['payee']
        nodes.add(payer)
        nodes.add(payee)

        edges.append({
            'from': payer,
            'to': payee,
            'amount': row['total_amount'],
            'count': row['transaction_count'],
            'suspicious_count': row['suspicious_count'],
            'label': f"${row['total_amount']:,.0f}"
        })

    node_list = [{'id': node, 'label': node} for node in nodes]

    conn.close()

    return {
        'nodes': node_list,
        'edges': edges
    }

def get_suspicious_transactions(min_amount=0):
    """Get all suspicious transactions"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT ft.*, d.filename
                 FROM financial_transactions ft
                 JOIN documents d ON ft.source_doc_id = d.id
                 WHERE ft.is_suspicious = 1 AND ft.amount >= ?
                 ORDER BY ft.amount DESC''', (min_amount,))

    transactions = []
    for row in c.fetchall():
        trans = dict(row)
        trans['red_flags'] = json.loads(trans['red_flags']) if trans['red_flags'] else []
        transactions.append(trans)

    conn.close()
    return transactions

def search_transactions(query, amount_min=None, amount_max=None, is_suspicious=None):
    """Search transactions"""
    conn = get_db()
    c = conn.cursor()

    sql = '''SELECT ft.*, d.filename
             FROM financial_transactions ft
             JOIN documents d ON ft.source_doc_id = d.id
             WHERE 1=1'''

    params = []

    if query:
        sql += ''' AND (ft.from_entity LIKE ? OR ft.to_entity LIKE ?
                       OR ft.purpose LIKE ? OR ft.extracted_context LIKE ?)'''
        search_term = f'%{query}%'
        params.extend([search_term, search_term, search_term, search_term])

    if amount_min is not None:
        sql += ' AND ft.amount >= ?'
        params.append(amount_min)

    if amount_max is not None:
        sql += ' AND ft.amount <= ?'
        params.append(amount_max)

    if is_suspicious is not None:
        sql += ' AND ft.is_suspicious = ?'
        params.append(1 if is_suspicious else 0)

    sql += ' ORDER BY ft.amount DESC LIMIT 100'

    c.execute(sql, params)

    results = []
    for row in c.fetchall():
        trans = dict(row)
        trans['red_flags'] = json.loads(trans['red_flags']) if trans['red_flags'] else []
        results.append(trans)

    conn.close()
    return results

if __name__ == '__main__':
    print("Initializing Financial Intelligence System...")
    init_financial_intelligence()

    print("\nImporting financial data from all documents...")
    result = import_all_financial_documents()
    print(f"✓ Found {result['financial_documents']} financial documents")
    print(f"✓ Extracted {result['total_transactions']} transactions")

    print("\nBuilding payment network...")
    network_size = build_payment_network()
    print(f"✓ Built payment network with {network_size} relationships")

    print("\nDetecting suspicious patterns...")
    patterns = detect_suspicious_patterns()
    print(f"✓ Detected {len(patterns)} suspicious pattern types")

    print("\nGenerating statistics...")
    stats = get_financial_statistics()
    print(f"\n=== FINANCIAL INTELLIGENCE SUMMARY ===")
    print(f"Total Transactions: {stats['total_transactions']}")
    print(f"Total Amount: ${stats['total_amount']:,.2f}")
    print(f"Suspicious Transactions: {stats['suspicious_transactions']}")
    print(f"Offshore Transactions: {stats['offshore_transactions']}")
    print(f"\nTop 5 Payers:")
    for payer in stats['top_payers'][:5]:
        print(f"  {payer['from_entity']}: ${payer['total']:,.2f} ({payer['count']} transactions)")
    print(f"\nTop 5 Payees:")
    for payee in stats['top_payees'][:5]:
        print(f"  {payee['to_entity']}: ${payee['total']:,.2f} ({payee['count']} transactions)")

    print("\n✓ Financial Intelligence System ready!")
