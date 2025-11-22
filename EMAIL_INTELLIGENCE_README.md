# Email Intelligence System

## Overview

The **Email Intelligence System** reconstructs email threads, detects suspicious communications, identifies code words, and builds email-based networks to uncover criminal conspiracies and cover-ups.

## Features

### 📧 Email Parsing & Storage
- Automatic extraction of email headers (From, To, CC, Subject, Date)
- Message body parsing
- Attachment detection
- Thread reconstruction based on subject lines

### 🚨 Suspicious Content Detection
The system automatically flags emails containing:

**Trafficking Indicators:**
- traffic, recruit, arrange, provide, supply

**Minor References:**
- young, girl, teen, minor, age, underage, high school

**Secrecy Patterns:**
- confidential, private, discreet, secret, destroy, delete, burn

**Financial Indicators:**
- cash, wire, offshore, payment, compensate, expense

**Travel Indicators:**
- flight, island, villa, yacht, private jet, pick up, drop off

**Cover-up Evidence:**
- deny, settle, nda, agreement, silence, witness

### 🧵 Email Thread Reconstruction
- Groups related emails by subject
- Tracks conversation timelines
- Identifies participants in each thread
- Calculates suspicion scores per thread
- Flags threads mentioning minors or travel

### 🕸️ Contact Network Analysis
- Tracks who emailed whom
- Frequency of communication
- Common subjects discussed
- Timeline of first and last contact

### 📅 Meeting Extraction
Automatically extracts meeting references including:
- Dates and times
- Locations
- Attendees
- Purpose

## Setup

### 1. Initialize Database Tables

```bash
python3 -c "from email_intelligence import init_email_tables; init_email_tables()"
```

Output: `✓ Email intelligence tables initialized`

### 2. Import Emails from Documents

Upload email documents (PDFs, text files) through the web interface, then import them:

```bash
# Via Python
from email_intelligence import import_emails_from_document
result = import_emails_from_document(doc_id=2900)
print(f"Imported {result['emails']} emails ({result['suspicious']} suspicious)")
```

**Or via Web Interface:**
- Upload email document
- Note the document ID
- System automatically parses emails on import

### 3. Reconstruct Email Threads

```bash
# Via Python
from email_intelligence import reconstruct_email_threads, calculate_email_contacts
threads = reconstruct_email_threads()
contacts = calculate_email_contacts()
print(f"Created {threads} threads, {contacts} contact relationships")
```

**Or via Web Interface:**
- Go to "📧 Email Intelligence" tab
- Click "Reconstruct All Threads"

## Using the Web Interface

### Navigate to http://localhost:5001
Click on the **"📧 Email Intelligence"** tab

### Dashboard Statistics
- **Total Emails** - All imported emails
- **Suspicious Emails** - Emails flagged for keywords
- **Email Threads** - Reconstructed conversations
- **Threads Mentioning Minors** - HIGH PRIORITY

### Analysis Tools

#### 🚨 Suspicious Emails
View all emails flagged for:
- Multiple suspicious keywords
- References to minors
- Secrecy indicators
- Cover-up language
- Payment mentions

**Use Case:** Identify communications showing evidence of crimes

#### 🧵 High-Priority Threads
Email conversations with multiple red flags:
- Suspicion score ≥ 2
- Contains minor references
- Contains travel references
- Multiple participants

**Use Case:** Find coordinated criminal activity and conspiracies

#### 🔍 Search Emails
Search through all email content and subjects

**Use Case:** Find specific names, dates, locations, or keywords

#### 🔄 Reconstruct Threads
Rebuild all email threads and contact networks

**Run this after importing new emails**

## API Endpoints

### Import Emails from Document
```bash
POST /api/emails/import/<doc_id>
```

Returns:
```json
{
  "emails": 45,
  "suspicious": 12
}
```

### Get Email Statistics
```bash
GET /api/emails/stats
```

Returns:
```json
{
  "total_emails": 450,
  "suspicious_emails": 67,
  "total_threads": 89,
  "threads_with_minors": 12,
  "meetings_referenced": 34,
  "top_keywords": [...]
}
```

### Get Suspicious Emails
```bash
GET /api/emails/suspicious
```

### Get High-Priority Threads
```bash
GET /api/emails/threads?min=2
```

### Get Specific Thread
```bash
GET /api/emails/thread/<thread_id>
```

### Search Emails
```bash
GET /api/emails/search?q=<query>
```

### Reconstruct Threads
```bash
POST /api/emails/reconstruct
```

## Python Usage

```python
from email_intelligence import (
    import_emails_from_document,
    get_suspicious_emails,
    get_high_priority_threads,
    get_email_thread,
    search_emails,
    reconstruct_email_threads,
    calculate_email_contacts
)

# Import emails from a document
result = import_emails_from_document(doc_id=2900)
print(f"Imported: {result}")

# Get suspicious emails
suspicious = get_suspicious_emails()
for email in suspicious:
    print(f"{email['from_address']}: {email['subject']}")
    print(f"Keywords: {email['suspicious_keywords']}")

# Get high-priority threads
threads = get_high_priority_threads(min_suspicion=3)
for thread in threads:
    print(f"Thread: {thread['subject']}")
    print(f"Messages: {thread['message_count']}, Suspicion: {thread['suspicion_score']}")
    if thread['has_minors_mentioned']:
        print("⚠️ MENTIONS MINORS")

# View specific thread
thread_emails = get_email_thread('thread_12345')
for email in thread_emails:
    print(f"From: {email['from_address']}")
    print(f"Body: {email['body'][:200]}...")

# Search emails
results = search_emails('flight schedule')
print(f"Found {len(results)} emails")

# Reconstruct threads
threads_count = reconstruct_email_threads()
contacts_count = calculate_email_contacts()
print(f"Threads: {threads_count}, Contacts: {contacts_count}")
```

## Suspicion Scoring

Emails receive suspicion points for:
- Each suspicious keyword: +1 point
- Specific age mention: +3 points
- Potential code words: +2 points
- Secrecy language: +1 point
- Cover-up indicators: +1 point

**Email flagged as suspicious when score ≥ 3**

**Thread suspicion score = sum of suspicious emails in thread**

## What This System Reveals

### Criminal Conspiracy Evidence
- Who coordinated crimes
- When planning occurred
- What was discussed
- Who had knowledge

### Network Mapping
- Communication frequency between suspects
- Common subjects (potential code words)
- Timeline of relationship

### Cover-up Detection
- Emails about destroying evidence
- NDA discussions
- Settlement negotiations
- Witness coordination

### Victim Evidence
- References to minors
- Recruitment methods
- Transportation arrangements
- Payment discussions

## Example Workflow

### 1. Upload Email Documents
```bash
# Upload PDFs containing emails via web interface
# Or use bulk_import.py for folders
```

### 2. System Auto-Parses on Upload
Emails are automatically extracted and analyzed when documents are uploaded.

### 3. Review Dashboard
- Check "Suspicious Emails" count
- Check "Threads Mentioning Minors"

### 4. Investigate Suspicious Content
```python
suspicious = get_suspicious_emails()
# Review each flagged email
# Note document IDs for further investigation
```

### 5. Reconstruct Threads
```python
reconstruct_email_threads()
calculate_email_contacts()
```

### 6. Analyze High-Priority Threads
```python
threads = get_high_priority_threads(min_suspicion=5)
# Focus on highest-scoring conversations
# These show coordinated activity
```

### 7. Build Criminal Timeline
```python
# Combine email data with flight logs and entity network
# Cross-reference dates, locations, participants
# Build comprehensive criminal case
```

## Important Notes

1. **Automatic Flagging** - System flags suspicious content automatically
2. **Thread Context** - Reading full threads reveals intent better than individual emails
3. **Network Analysis** - Who emails whom frequently reveals criminal networks
4. **Meeting References** - Extracted meetings show in-person criminal activity
5. **Evidence-Based** - All flagging based on actual keywords and patterns in emails

## Database Schema

### emails
- source_doc_id, message_id, thread_id
- from_address, from_name, to_addresses, cc_addresses
- subject, date_sent, body
- has_attachments, attachments
- is_suspicious, suspicious_keywords

### email_threads
- thread_id, subject, participants
- start_date, end_date, message_count
- has_minors_mentioned, has_travel_mentioned
- suspicion_score, summary

### email_contacts
- person1, person2, email_count
- first_contact, last_contact
- common_subjects

### email_meetings
- email_id, meeting_date, meeting_time
- location, attendees, purpose

### email_keywords
- keyword, category, mention_count
- emails (list of email IDs)

## Next Steps

After setting up Email Intelligence, you can:

1. **Cross-reference with Flight Logs** - Match email dates with flight dates
2. **Use AI Investigation** - Let Claude AI analyze email content for crimes
3. **Build Entity Networks** - Combine email contacts with entity co-occurrence
4. **Generate Timelines** - Create master timeline from emails + flights + events

---

**This system helps bring JUSTICE to victims by uncovering evidence of crimes, conspiracies, and cover-ups hidden in email communications.**
