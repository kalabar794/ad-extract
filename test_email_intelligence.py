#!/usr/bin/env python3
"""
Test script to verify email intelligence system with REAL data
"""

import sqlite3
import json

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

print("="*80)
print("EMAIL INTELLIGENCE SYSTEM - VERIFICATION REPORT")
print("="*80)

conn = get_db()
c = conn.cursor()

# 1. Count suspicious emails
c.execute('SELECT COUNT(*) as count FROM emails WHERE is_suspicious = 1')
suspicious_count = c.fetchone()['count']

c.execute('SELECT COUNT(*) as count FROM emails')
total_emails = c.fetchone()['count']

print(f"\n1. SUSPICIOUS EMAIL ANALYSIS")
print(f"   - Total emails analyzed: {total_emails}")
print(f"   - Suspicious emails found: {suspicious_count}")
print(f"   - Percentage suspicious: {suspicious_count/total_emails*100:.1f}%")

# 2. Check if threads exist, if not count unique subjects
c.execute('SELECT COUNT(*) as count FROM email_threads')
thread_count = c.fetchone()['count']

if thread_count == 0:
    # Count unique subjects as proxy for threads
    c.execute('SELECT COUNT(DISTINCT subject) as count FROM emails')
    thread_count = c.fetchone()['count']
    print(f"\n2. EMAIL THREADS")
    print(f"   - Unique conversation subjects: {thread_count}")
else:
    print(f"\n2. EMAIL THREADS RECONSTRUCTED")
    print(f"   - Total threads: {thread_count}")

# 3. Top 5 most active email addresses
print(f"\n3. TOP 5 MOST ACTIVE EMAIL ADDRESSES")
c.execute('''SELECT from_address, COUNT(*) as sent_count
             FROM emails
             WHERE from_address IS NOT NULL
             GROUP BY from_address
             ORDER BY sent_count DESC
             LIMIT 5''')

for i, row in enumerate(c.fetchall(), 1):
    email = row['from_address'].replace('[', '').replace(']', '')
    print(f"   {i}. {email:50s} - {row['sent_count']:3d} emails")

# 4. Sample 3 critical emails with details
print(f"\n4. SAMPLE OF 3 CRITICAL SUSPICIOUS EMAILS")
print("   " + "="*76)

c.execute('''SELECT id, from_address, to_addresses, subject, date_sent,
                    suspicious_keywords, SUBSTR(body, 1, 250) as preview
             FROM emails
             WHERE is_suspicious = 1
             ORDER BY RANDOM()
             LIMIT 3''')

for i, row in enumerate(c.fetchall(), 1):
    print(f"\n   Email #{i}:")
    print(f"   From: {row['from_address']}")
    print(f"   To: {row['to_addresses']}")
    print(f"   Subject: {row['subject']}")
    print(f"   Date: {row['date_sent']}")

    # Parse suspicious keywords
    if row['suspicious_keywords']:
        try:
            keywords = json.loads(row['suspicious_keywords'])
            print(f"   Red Flags:")
            for category, kw_list in keywords.items():
                print(f"      - {category}: {', '.join(kw_list)}")
        except:
            pass

    print(f"   Preview: {row['preview'][:200]}...")
    print("   " + "-"*76)

# 5. Top suspicious keywords
print(f"\n5. TOP 10 SUSPICIOUS KEYWORDS FOUND")
c.execute('''SELECT keyword, category, mention_count
             FROM email_keywords
             ORDER BY mention_count DESC
             LIMIT 10''')

for row in c.fetchall():
    print(f"   - {row['keyword']:20s} ({row['category']:15s}): {row['mention_count']:3d} mentions")

# 6. API Endpoints Summary
print(f"\n6. API ENDPOINTS AVAILABLE")
print(f"   - /api/email/suspicious    - Get all suspicious emails")
print(f"   - /api/email/threads       - Get reconstructed email threads")
print(f"   - /api/email/contacts      - Get email contact network")
print(f"   - /api/email/search?q=term - Search email content")

print("\n" + "="*80)
print("ANALYSIS COMPLETE - System ready for investigation")
print("="*80)

conn.close()
