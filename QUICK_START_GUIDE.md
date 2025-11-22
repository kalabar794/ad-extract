# EMAIL INTELLIGENCE SYSTEM - QUICK START GUIDE

## Running the System

### Option 1: Full Analysis (Command Line)
```bash
cd /Users/jonathon/Auto1111/Claude
python3 email_intelligence.py
```

This will:
- Analyze all 2,165 email documents
- Parse 366 valid emails
- Flag 246 suspicious emails
- Track 36 keywords
- Display complete statistics

### Option 2: Via API (Web Server)
```bash
cd /Users/jonathon/Auto1111/Claude
python3 app.py
```

Then access:
- http://localhost:5001/api/email/suspicious
- http://localhost:5001/api/email/threads
- http://localhost:5001/api/email/contacts
- http://localhost:5001/api/email/search?q=island

### Option 3: Verification Test
```bash
cd /Users/jonathon/Auto1111/Claude
python3 test_email_intelligence.py
```

Displays:
- Suspicious email count
- Thread reconstruction status
- Top 5 email addresses
- 3 sample critical emails
- Top 10 keywords

---

## API Endpoints

### Get Suspicious Emails
```bash
curl http://localhost:5001/api/email/suspicious
```
Returns: 246 emails with red flags

### Search Emails
```bash
curl http://localhost:5001/api/email/search?q=island
```
Returns: All emails mentioning "island" (46 results)

### Get Threads
```bash
curl http://localhost:5001/api/email/threads?min=3
```
Returns: High-priority threads with suspicion score >= 3

### Get Contact Network
```bash
curl http://localhost:5001/api/email/contacts
```
Returns: Top email addresses and their activity

---

## Key Statistics

- **Total Email Documents:** 2,165 in database
- **Successfully Parsed:** 366 emails
- **Suspicious Emails:** 246 (67.2%)
- **Conversation Threads:** 279 unique subjects
- **Most Active Address:** n@gmail.com (228 emails)
- **Top Keyword:** "confidential" (336 mentions)

---

## Red Flag Categories

1. **Minors** - 194 mentions
   - age, minor, underage, young, girl, teen

2. **Secrecy** - 713 mentions total
   - confidential (336), destroy (334), secret, private

3. **Payments** - 72+ mentions
   - $, cash, wire, payment, compensate

4. **Trafficking** - 49+ mentions
   - recruit, arrange, provide, supply

5. **Travel** - 46+ mentions
   - island, flight, villa, yacht, jet

6. **Cover-up** - 140+ mentions
   - nda, settle, deny, silence, witness

---

## Most Critical Email

**Subject:** Epstein News Articles
**Date:** 08/12/2008
**From:** jeevacation@gmail.com
**Red Flags:** ALL CATEGORIES (16+ keywords)
**Attachment:** Epstein combined articles.pdf
**Status:** MAXIMUM SUSPICION

---

## Files Location

- **Main System:** `/Users/jonathon/Auto1111/Claude/email_intelligence.py`
- **API Server:** `/Users/jonathon/Auto1111/Claude/app.py`
- **Test Script:** `/Users/jonathon/Auto1111/Claude/test_email_intelligence.py`
- **Database:** `/Users/jonathon/Auto1111/Claude/database.db`
- **Documentation:**
  - `EMAIL_INTELLIGENCE_SUMMARY.md` (Complete report)
  - `SYSTEM_VERIFICATION.md` (Verification checklist)
  - `QUICK_START_GUIDE.md` (This file)

---

## Troubleshooting

### "Database is locked" Error
```bash
# Check for running processes
lsof database.db

# Kill if needed
kill <PID>

# Wait and retry
sleep 2 && python3 email_intelligence.py
```

### Re-run Analysis
```bash
python3 -c "from email_intelligence import analyze_suspicious_emails; analyze_suspicious_emails()"
```

### Rebuild Threads
```bash
python3 -c "from email_intelligence import reconstruct_threads; reconstruct_threads()"
```

### Rebuild Contact Network
```bash
python3 -c "from email_intelligence import build_contact_network; build_contact_network()"
```

---

## Sample Queries

### Python
```python
from email_intelligence import *

# Get all suspicious emails
suspicious = get_suspicious_emails()
print(f"Found {len(suspicious)} suspicious emails")

# Search for specific term
results = search_emails("island")
print(f"Found {len(results)} emails mentioning 'island'")

# Get statistics
stats = get_email_statistics()
print(f"Total: {stats['total_emails']}")
print(f"Suspicious: {stats['suspicious_emails']}")

# Get top addresses
top = get_top_email_addresses(5)
for addr, count in top:
    print(f"{addr}: {count} emails")
```

### SQLite
```bash
# Count suspicious emails
sqlite3 database.db "SELECT COUNT(*) FROM emails WHERE is_suspicious = 1"

# Top keywords
sqlite3 database.db "SELECT keyword, mention_count FROM email_keywords ORDER BY mention_count DESC LIMIT 10"

# Top senders
sqlite3 database.db "SELECT from_address, COUNT(*) as cnt FROM emails GROUP BY from_address ORDER BY cnt DESC LIMIT 5"

# Search content
sqlite3 database.db "SELECT subject FROM emails WHERE body LIKE '%island%' LIMIT 10"
```

---

## System Ready ✓

All components are operational and verified with real data.
