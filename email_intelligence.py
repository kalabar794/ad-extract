"""
Email Intelligence System
Analyzes email documents, reconstructs threads, identifies suspicious content, builds contact networks
"""

import sqlite3
import re
from datetime import datetime
from collections import defaultdict, Counter
import json
import hashlib

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_email_tables():
    """Initialize database tables for email intelligence"""
    conn = get_db()
    c = conn.cursor()

    # Emails table
    c.execute('''CREATE TABLE IF NOT EXISTS emails
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  source_doc_id INTEGER NOT NULL,
                  message_id TEXT UNIQUE,
                  thread_id TEXT,
                  from_address TEXT,
                  from_name TEXT,
                  to_addresses TEXT,
                  cc_addresses TEXT,
                  bcc_addresses TEXT,
                  subject TEXT,
                  date_sent TEXT,
                  body TEXT,
                  has_attachments BOOLEAN DEFAULT 0,
                  attachments TEXT,
                  is_suspicious BOOLEAN DEFAULT 0,
                  suspicious_keywords TEXT,
                  FOREIGN KEY (source_doc_id) REFERENCES documents(id))''')

    # Email threads (reconstructed conversations)
    c.execute('''CREATE TABLE IF NOT EXISTS email_threads
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  thread_id TEXT UNIQUE,
                  subject TEXT,
                  participants TEXT,
                  start_date TEXT,
                  end_date TEXT,
                  message_count INTEGER DEFAULT 0,
                  has_minors_mentioned BOOLEAN DEFAULT 0,
                  has_travel_mentioned BOOLEAN DEFAULT 0,
                  suspicion_score INTEGER DEFAULT 0,
                  summary TEXT)''')

    # Email participants (who emailed whom)
    c.execute('''CREATE TABLE IF NOT EXISTS email_contacts
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  person1 TEXT NOT NULL,
                  person2 TEXT NOT NULL,
                  email_count INTEGER DEFAULT 1,
                  first_contact TEXT,
                  last_contact TEXT,
                  common_subjects TEXT,
                  UNIQUE(person1, person2))''')

    # Meeting references extracted from emails
    c.execute('''CREATE TABLE IF NOT EXISTS email_meetings
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  email_id INTEGER NOT NULL,
                  meeting_date TEXT,
                  meeting_time TEXT,
                  location TEXT,
                  attendees TEXT,
                  purpose TEXT,
                  FOREIGN KEY (email_id) REFERENCES emails(id))''')

    # Suspicious keywords tracking
    c.execute('''CREATE TABLE IF NOT EXISTS email_keywords
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  keyword TEXT UNIQUE,
                  category TEXT,
                  mention_count INTEGER DEFAULT 0,
                  emails TEXT)''')

    conn.commit()
    conn.close()

def parse_email_from_text(text, doc_id):
    """
    Parse email headers and content from text

    Expected formats:
    - From: Name <email@example.com>
    - To: Name <email@example.com>
    - Date: Mon, 1 Jan 2024 10:00:00 -0500
    - Subject: Meeting tomorrow
    """

    email_data = {
        'source_doc_id': doc_id,
        'from_address': None,
        'from_name': None,
        'to_addresses': [],
        'cc_addresses': [],
        'subject': None,
        'date_sent': None,
        'body': '',
        'message_id': None,
        'attachments': []
    }

    lines = text.split('\n')
    body_start = 0

    for i, line in enumerate(lines[:50]):  # Check first 50 lines for headers
        line = line.strip()

        # From header
        from_match = re.match(r'From:\s*(?:([^<]+)\s*)?<?([^>@\s]+@[^>\s]+)>?', line, re.IGNORECASE)
        if from_match:
            email_data['from_name'] = from_match.group(1).strip() if from_match.group(1) else None
            email_data['from_address'] = from_match.group(2).strip()
            body_start = max(body_start, i + 1)

        # To header
        to_match = re.match(r'To:\s*(.+)', line, re.IGNORECASE)
        if to_match:
            to_addrs = re.findall(r'([^<,\s]+@[^>,\s]+)', to_match.group(1))
            email_data['to_addresses'].extend([addr.strip() for addr in to_addrs])
            body_start = max(body_start, i + 1)

        # CC header
        cc_match = re.match(r'Cc:\s*(.+)', line, re.IGNORECASE)
        if cc_match:
            cc_addrs = re.findall(r'([^<,\s]+@[^>,\s]+)', cc_match.group(1))
            email_data['cc_addresses'].extend([addr.strip() for addr in cc_addrs])
            body_start = max(body_start, i + 1)

        # Subject
        subject_match = re.match(r'Subject:\s*(.+)', line, re.IGNORECASE)
        if subject_match:
            email_data['subject'] = subject_match.group(1).strip()
            body_start = max(body_start, i + 1)

        # Date
        date_match = re.match(r'Date:\s*(.+)', line, re.IGNORECASE)
        if date_match:
            email_data['date_sent'] = date_match.group(1).strip()
            body_start = max(body_start, i + 1)

        # Message-ID
        msgid_match = re.match(r'Message-ID:\s*<?([^>]+)>?', line, re.IGNORECASE)
        if msgid_match:
            email_data['message_id'] = msgid_match.group(1).strip()

        # Attachment mentions
        if re.search(r'attachment|attached|enclosed', line, re.IGNORECASE):
            email_data['has_attachments'] = True
            attachment_match = re.findall(r'([a-zA-Z0-9_-]+\.[a-z]{3,4})', line)
            email_data['attachments'].extend(attachment_match)

    # Extract body (everything after headers)
    email_data['body'] = '\n'.join(lines[body_start:]).strip()

    # Generate message_id if not present
    if not email_data['message_id'] and email_data['from_address']:
        hash_input = f"{email_data['from_address']}{email_data['subject']}{email_data['date_sent']}"
        email_data['message_id'] = hashlib.md5(hash_input.encode()).hexdigest()

    return email_data

def check_suspicious_content(email_body, subject=''):
    """Check email for suspicious keywords and patterns"""

    suspicious_keywords = {
        'minors': ['minor', 'underage', 'young', 'girl', 'teen', 'age'],
        'secrecy': ['delete', 'destroy', 'confidential', 'secret', 'discreet', 'private'],
        'payments': ['wire', '$', 'cash', 'payment', 'compensate', 'expense'],
        'trafficking': ['recruit', 'arrange', 'provide', 'supply', 'traffic'],
        'travel': ['flight', 'island', 'villa', 'yacht', 'jet', 'pick up'],
        'cover_up': ['deny', 'settle', 'nda', 'agreement', 'silence', 'witness']
    }

    subject = subject or ''
    email_body = email_body or ''
    content = (subject + ' ' + email_body).lower()
    found_keywords = defaultdict(list)
    suspicion_score = 0

    for category, keywords in suspicious_keywords.items():
        for keyword in keywords:
            if keyword in content:
                found_keywords[category].append(keyword)
                suspicion_score += 1

    # Additional red flags
    if re.search(r'\b\d{1,2}\s*(?:year|yr)s?\s*old\b', content):
        found_keywords['age_mentions'].append('specific age mentioned')
        suspicion_score += 3

    if re.search(r'\b(?:massage|spa|modeling|assistant)\b', content):
        found_keywords['euphemisms'].append('potential code word')
        suspicion_score += 2

    return {
        'is_suspicious': suspicion_score >= 3,
        'suspicion_score': suspicion_score,
        'keywords_found': dict(found_keywords)
    }

def analyze_suspicious_emails():
    """
    Analyze ALL email documents in the database and identify suspicious ones
    Returns dictionary with analysis results
    """
    conn = get_db()
    c = conn.cursor()

    # Clear existing email data for fresh analysis
    c.execute('DELETE FROM emails')
    c.execute('DELETE FROM email_keywords')

    # Get all documents that have email format (From: and Subject: headers)
    c.execute('''SELECT id, content, filename
                 FROM documents
                 WHERE content LIKE '%From:%' AND content LIKE '%Subject:%'
                 ORDER BY id''')

    documents = c.fetchall()

    print(f"\nAnalyzing {len(documents)} email documents...")

    emails_parsed = 0
    suspicious_count = 0
    keyword_tracker = defaultdict(lambda: {'count': 0, 'emails': []})

    for doc in documents:
        doc_id = doc['id']
        content = doc['content']
        filename = doc['filename']

        # Parse email data
        email = parse_email_from_text(content, doc_id)

        # Only process if we have minimum required fields
        if not email['from_address']:
            continue

        # Check for suspicious content
        suspicion = check_suspicious_content(email['body'], email.get('subject', ''))

        # Insert email
        try:
            c.execute('''INSERT INTO emails
                         (source_doc_id, message_id, from_address, from_name,
                          to_addresses, cc_addresses, subject, date_sent, body,
                          has_attachments, attachments, is_suspicious, suspicious_keywords)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                     (doc_id, email.get('message_id'),
                      email['from_address'], email.get('from_name'),
                      ','.join(email['to_addresses']),
                      ','.join(email['cc_addresses']),
                      email.get('subject'), email.get('date_sent'),
                      email['body'], email.get('has_attachments', False),
                      json.dumps(email.get('attachments', [])),
                      suspicion['is_suspicious'],
                      json.dumps(suspicion['keywords_found'])))

            email_id = c.lastrowid
            emails_parsed += 1

            if suspicion['is_suspicious']:
                suspicious_count += 1

            # Track keywords
            for category, keywords in suspicion['keywords_found'].items():
                for keyword in keywords:
                    keyword_tracker[keyword]['count'] += 1
                    keyword_tracker[keyword]['emails'].append(email_id)
                    keyword_tracker[keyword]['category'] = category

        except sqlite3.IntegrityError:
            # Duplicate, skip
            continue

    # Insert keyword tracking data
    for keyword, data in keyword_tracker.items():
        c.execute('''INSERT INTO email_keywords (keyword, category, mention_count, emails)
                     VALUES (?, ?, ?, ?)''',
                 (keyword, data['category'], data['count'], ','.join(map(str, data['emails']))))

    conn.commit()
    conn.close()

    print(f"✓ Analyzed {emails_parsed} emails")
    print(f"✓ Found {suspicious_count} suspicious emails")

    return {
        'total_analyzed': emails_parsed,
        'suspicious_found': suspicious_count,
        'keywords_tracked': len(keyword_tracker)
    }

def reconstruct_threads():
    """
    Reconstruct email conversation threads by subject line
    Returns number of threads created
    """
    conn = get_db()
    conn.isolation_level = None  # Autocommit mode
    c = conn.cursor()

    print("\nReconstructing email threads...")

    try:
        # Clear existing threads
        c.execute('DELETE FROM email_threads')

        # Get all emails ordered by subject and date
        c.execute('''SELECT id, subject, from_address, to_addresses, date_sent,
                            body, is_suspicious, suspicious_keywords
                     FROM emails
                     ORDER BY subject, date_sent''')

        emails = c.fetchall()

        # Group by normalized subject
        threads = defaultdict(list)

        for email in emails:
            subject = email['subject'] or 'No Subject'
            # Normalize subject (remove Re:, Fwd:, etc.)
            normalized_subject = re.sub(r'^(Re|Fwd|Fw):\s*', '', subject, flags=re.IGNORECASE).strip()
            threads[normalized_subject].append(email)

        threads_created = 0

        for subject, thread_emails in threads.items():
            if len(thread_emails) < 1:
                continue

            # Collect participants
            participants = set()
            for email in thread_emails:
                if email['from_address']:
                    participants.add(email['from_address'])
                if email['to_addresses']:
                    for addr in email['to_addresses'].split(','):
                        addr = addr.strip()
                        if addr:
                            participants.add(addr)

            # Calculate suspicion score
            suspicion_score = sum(1 for e in thread_emails if e['is_suspicious'])

            # Check for mentions of minors or travel
            combined_text = ' '.join(e['body'] or '' for e in thread_emails).lower()
            has_minors = bool(re.search(r'\b(?:young|girl|teen|minor|age|underage)\b', combined_text))
            has_travel = bool(re.search(r'\b(?:flight|island|travel|pick up|airport)\b', combined_text))

            # Generate thread_id
            thread_id = f"thread_{hashlib.md5(subject.encode()).hexdigest()[:12]}"

            # Get date range
            dates = [e['date_sent'] for e in thread_emails if e['date_sent']]
            start_date = dates[0] if dates else None
            end_date = dates[-1] if dates else None

            # Insert thread
            c.execute('''INSERT INTO email_threads
                         (thread_id, subject, participants, start_date, end_date,
                          message_count, has_minors_mentioned, has_travel_mentioned,
                          suspicion_score)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                     (thread_id, subject, ','.join(participants),
                      start_date, end_date,
                      len(thread_emails), has_minors, has_travel, suspicion_score))

            threads_created += 1

            # Update emails with thread_id
            for email in thread_emails:
                c.execute('UPDATE emails SET thread_id = ? WHERE id = ?',
                         (thread_id, email['id']))

        print(f"✓ Reconstructed {threads_created} email threads")
        return threads_created
    finally:
        conn.close()

def build_contact_network():
    """
    Build network of who emails whom
    Returns number of contact relationships
    """
    conn = get_db()
    conn.isolation_level = None  # Autocommit mode
    c = conn.cursor()

    print("\nBuilding email contact network...")

    try:
        # Clear existing
        c.execute('DELETE FROM email_contacts')

        # Get all emails
        c.execute('''SELECT from_address, to_addresses, cc_addresses, date_sent, subject
                     FROM emails
                     WHERE from_address IS NOT NULL''')

        emails = c.fetchall()

        contacts = defaultdict(lambda: {
            'count': 0,
            'first': None,
            'last': None,
            'subjects': []
        })

        for email in emails:
            from_addr = email['from_address']
            to_addrs = []

            if email['to_addresses']:
                to_addrs.extend(email['to_addresses'].split(','))
            if email['cc_addresses']:
                to_addrs.extend(email['cc_addresses'].split(','))

            for to_addr in to_addrs:
                to_addr = to_addr.strip()
                if not to_addr or '@' not in to_addr:
                    continue

                # Sort addresses for consistent key
                key = tuple(sorted([from_addr, to_addr]))

                contacts[key]['count'] += 1
                contacts[key]['subjects'].append(email['subject'] or 'No Subject')

                if not contacts[key]['first']:
                    contacts[key]['first'] = email['date_sent']
                contacts[key]['last'] = email['date_sent']

        # Insert into database
        for (p1, p2), data in contacts.items():
            # Get top 5 common subjects
            subject_counts = Counter(data['subjects'])
            top_subjects = ','.join([s for s, _ in subject_counts.most_common(5)])

            c.execute('''INSERT INTO email_contacts
                         (person1, person2, email_count, first_contact, last_contact, common_subjects)
                         VALUES (?, ?, ?, ?, ?, ?)''',
                     (p1, p2, data['count'], data['first'], data['last'], top_subjects))

        print(f"✓ Built network with {len(contacts)} contact relationships")
        return len(contacts)
    finally:
        conn.close()

def find_high_priority_threads(min_suspicion=2):
    """
    Find email threads with multiple red flags
    Returns list of high-priority threads
    """
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT thread_id, subject, participants, message_count,
                        suspicion_score, has_minors_mentioned, has_travel_mentioned,
                        start_date, end_date
                 FROM email_threads
                 WHERE suspicion_score >= ?
                 ORDER BY suspicion_score DESC, message_count DESC
                 LIMIT 50''',
             (min_suspicion,))

    threads = [dict(row) for row in c.fetchall()]
    conn.close()

    return threads

def search_emails(query):
    """
    Search emails by content or metadata
    Returns matching emails
    """
    conn = get_db()
    c = conn.cursor()

    search_term = f'%{query}%'

    c.execute('''SELECT id, from_address, from_name, to_addresses, subject, date_sent,
                        SUBSTR(body, 1, 200) as preview,
                        is_suspicious, source_doc_id
                 FROM emails
                 WHERE body LIKE ? OR subject LIKE ? OR from_address LIKE ? OR to_addresses LIKE ?
                 ORDER BY date_sent DESC
                 LIMIT 100''',
             (search_term, search_term, search_term, search_term))

    results = [dict(row) for row in c.fetchall()]
    conn.close()

    return results

def get_suspicious_emails():
    """Get all suspicious emails"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT id, from_address, from_name, to_addresses, subject, date_sent,
                        suspicious_keywords, source_doc_id,
                        SUBSTR(body, 1, 300) as preview
                 FROM emails
                 WHERE is_suspicious = 1
                 ORDER BY date_sent DESC''')

    emails = [dict(row) for row in c.fetchall()]

    # Parse suspicious_keywords JSON
    for email in emails:
        if email['suspicious_keywords']:
            try:
                email['suspicious_keywords'] = json.loads(email['suspicious_keywords'])
            except:
                email['suspicious_keywords'] = {}

    conn.close()
    return emails

def get_email_statistics():
    """Get comprehensive email statistics"""
    conn = get_db()
    c = conn.cursor()

    stats = {}

    c.execute('SELECT COUNT(*) as count FROM emails')
    stats['total_emails'] = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM emails WHERE is_suspicious = 1')
    stats['suspicious_emails'] = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM email_threads')
    stats['total_threads'] = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM email_threads WHERE has_minors_mentioned = 1')
    stats['threads_with_minors'] = c.fetchone()['count']

    c.execute('SELECT COUNT(*) as count FROM email_contacts')
    stats['contact_relationships'] = c.fetchone()['count']

    c.execute('''SELECT keyword, mention_count, category
                 FROM email_keywords
                 ORDER BY mention_count DESC
                 LIMIT 20''')
    stats['top_keywords'] = [dict(row) for row in c.fetchall()]

    c.execute('''SELECT person1, person2, email_count
                 FROM email_contacts
                 ORDER BY email_count DESC
                 LIMIT 10''')
    stats['most_active_contacts'] = [dict(row) for row in c.fetchall()]

    conn.close()

    return stats

def get_high_priority_threads(min_suspicion=2):
    """Get threads with high suspicion scores"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT thread_id, subject, participants, message_count,
                        suspicion_score, has_minors_mentioned, has_travel_mentioned,
                        start_date, end_date
                 FROM email_threads
                 WHERE suspicion_score >= ?
                 ORDER BY suspicion_score DESC
                 LIMIT 50''',
             (min_suspicion,))

    threads = [dict(row) for row in c.fetchall()]
    conn.close()

    return threads

def get_email_thread(thread_id):
    """Get all emails in a specific thread"""
    conn = get_db()
    c = conn.cursor()

    c.execute('''SELECT id, from_address, from_name, to_addresses, subject,
                        date_sent, body, is_suspicious
                 FROM emails
                 WHERE thread_id = ?
                 ORDER BY date_sent''',
             (thread_id,))

    emails = [dict(row) for row in c.fetchall()]
    conn.close()

    return emails

def get_top_email_addresses(limit=10):
    """Get most active email addresses"""
    conn = get_db()
    c = conn.cursor()

    # Count emails sent and received per address
    email_activity = defaultdict(int)

    c.execute('SELECT from_address FROM emails WHERE from_address IS NOT NULL')
    for row in c.fetchall():
        email_activity[row['from_address']] += 1

    c.execute('SELECT to_addresses FROM emails WHERE to_addresses IS NOT NULL')
    for row in c.fetchall():
        for addr in row['to_addresses'].split(','):
            addr = addr.strip()
            if addr and '@' in addr:
                email_activity[addr] += 1

    conn.close()

    # Sort and return top N
    sorted_addresses = sorted(email_activity.items(), key=lambda x: x[1], reverse=True)
    return sorted_addresses[:limit]

if __name__ == '__main__':
    print("="*70)
    print("EMAIL INTELLIGENCE SYSTEM")
    print("="*70)

    # Initialize tables
    init_email_tables()

    print("\nRunning full analysis...")

    # Run analysis
    analysis = analyze_suspicious_emails()
    print(f"\n✓ Analysis complete:")
    print(f"  - Emails analyzed: {analysis['total_analyzed']}")
    print(f"  - Suspicious emails: {analysis['suspicious_found']}")
    print(f"  - Keywords tracked: {analysis['keywords_tracked']}")

    # Reconstruct threads
    threads = reconstruct_threads()

    # Build network
    contacts = build_contact_network()

    # Show statistics
    stats = get_email_statistics()
    print(f"\nFinal Statistics:")
    print(f"  Total emails: {stats['total_emails']}")
    print(f"  Suspicious emails: {stats['suspicious_emails']}")
    print(f"  Email threads: {stats['total_threads']}")
    print(f"  Contact relationships: {stats['contact_relationships']}")
