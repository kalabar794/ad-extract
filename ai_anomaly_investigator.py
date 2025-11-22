#!/usr/bin/env python3
"""
AI-Powered Anomaly Investigator
Analyzes suspicious documents to extract deep insights
"""

import sqlite3
import re
from collections import defaultdict, Counter

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def analyze_anomalous_document(doc_id):
    """
    Deep AI analysis of anomalous document
    Returns investigative insights, not just statistics
    """
    conn = get_db()
    c = conn.cursor()

    # Get document
    c.execute('SELECT id, filename, content FROM documents WHERE id = ?', (doc_id,))
    doc = c.fetchone()

    if not doc:
        return {'error': 'Document not found'}

    content = doc['content']
    filename = doc['filename']

    # ===== DEEP AI ANALYSIS =====

    analysis = {
        'filename': filename,
        'doc_id': doc_id,
        'insights': [],
        'red_flags': [],
        'key_findings': [],
        'investigative_leads': []
    }

    # 1. ENTITY DENSITY ANALYSIS
    c.execute('''
        SELECT e.name, e.entity_type, COUNT(*) as mentions
        FROM entity_mentions em
        JOIN entities e ON em.entity_id = e.id
        WHERE em.doc_id = ?
        GROUP BY e.id
        ORDER BY mentions DESC
        LIMIT 50
    ''', (doc_id,))

    entities = c.fetchall()
    total_entities = sum(e['mentions'] for e in entities)

    # Detect if entity density is abnormally high
    if total_entities > 1000:
        analysis['red_flags'].append(f"🚨 ABNORMALLY HIGH entity density: {total_entities} entities")
        analysis['insights'].append("High entity density suggests either: (1) Master index/directory document, (2) Comprehensive deposition transcript, (3) Email dump with many participants")

    # Check entity diversity
    entity_types = Counter(e['entity_type'] for e in entities)
    if len(entity_types) == 1 and total_entities > 500:
        dominant_type = list(entity_types.keys())[0]
        analysis['red_flags'].append(f"⚠️ SINGLE entity type dominance: All {total_entities} entities are '{dominant_type}'")
        analysis['insights'].append(f"Document appears to be a {dominant_type} directory or reference list")

    # 2. SUSPICIOUS PEOPLE ANALYSIS
    people = [e for e in entities if e['entity_type'] == 'person']
    found_suspects = []

    if people:
        top_people = people[:10]

        # Check for known suspects
        known_suspects = ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew', 'Donald Trump',
                          'Bill Clinton', 'Alan Dershowitz', 'Jean-Luc Brunel']

        for person in top_people:
            if any(suspect.lower() in person['name'].lower() for suspect in known_suspects):
                found_suspects.append(f"{person['name']} ({person['mentions']} mentions)")

        if found_suspects:
            analysis['key_findings'].append(f"🔴 KEY SUSPECTS HEAVILY MENTIONED: {', '.join(found_suspects)}")

    # 3. REDACTION ANALYSIS
    redaction_patterns = [
        r'\[REDACTED\]',
        r'XXX+',
        r'###',
        r'\*\*\*+',
        r'\[SEALED\]',
        r'\[CONFIDENTIAL\]'
    ]

    total_redactions = 0
    for pattern in redaction_patterns:
        redactions = re.findall(pattern, content)
        total_redactions += len(redactions)

    if total_redactions > 50:
        analysis['red_flags'].append(f"🚨 HEAVY REDACTIONS: {total_redactions} redacted sections detected")
        analysis['insights'].append("Heavy redactions suggest: (1) Ongoing criminal investigation, (2) Protection of victim identities, (3) National security implications, (4) Cover-up attempts")
        analysis['investigative_leads'].append(f"FOIA request for unredacted version citing public interest")
    elif total_redactions > 10:
        analysis['red_flags'].append(f"⚠️ Moderate redactions: {total_redactions} redacted sections")

    # 4. TEMPORAL ANALYSIS - Date concentration
    date_patterns = [
        r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(19|20)\d{2}\b',
        r'\b\d{1,2}[/-]\d{1,2}[/-](19|20)\d{2}\b',
        r'\b(19|20)\d{2}\b'
    ]

    all_dates = []
    for pattern in date_patterns:
        all_dates.extend(re.findall(pattern, content, re.IGNORECASE))

    overlap = set()  # Initialize
    if len(all_dates) > 100:
        # Extract years
        year_pattern = r'(19|20)\d{2}'
        years = [m for match in all_dates for m in re.findall(year_pattern, str(match))]
        year_freq = Counter(years)

        if year_freq:
            peak_years = year_freq.most_common(3)
            analysis['key_findings'].append(f"📅 TIMELINE CONCENTRATION: Peak years {', '.join([f'{y}({c})' for y,c in peak_years])}")

            # Check if overlaps with abuse period
            abuse_years = set(str(y) for y in range(1998, 2008))
            mentioned_years = set(year_freq.keys())
            overlap = abuse_years & mentioned_years

            if overlap:
                analysis['red_flags'].append(f"🚨 CRITICAL: Document covers known abuse period ({', '.join(sorted(overlap))})")

    # 5. FINANCIAL INDICATORS
    money_patterns = [
        r'\$\s*[\d,]+(?:\.\d{2})?',
        r'\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\s*(?:dollar|USD|euros?)',
        r'wire transfer',
        r'bank account',
        r'offshore',
        r'shell company'
    ]

    financial_mentions = 0
    for pattern in money_patterns:
        financial_mentions += len(re.findall(pattern, content, re.IGNORECASE))

    if financial_mentions > 50:
        analysis['key_findings'].append(f"💰 SIGNIFICANT FINANCIAL CONTENT: {financial_mentions} money references")
        analysis['insights'].append("Document likely contains: Financial transactions, money laundering evidence, offshore accounts, or payment records")
        analysis['investigative_leads'].append("Cross-reference amounts with bank subpoenas and tax returns")

    # 6. VICTIM/ABUSE INDICATORS
    victim_keywords = [
        'minor', 'underage', 'victim', 'massage', 'girl', 'young woman',
        'abuse', 'assault', 'coercion', 'trafficking', 'jane doe'
    ]

    victim_mentions = 0
    for keyword in victim_keywords:
        victim_mentions += len(re.findall(r'\b' + keyword + r'\b', content, re.IGNORECASE))

    if victim_mentions > 20:
        analysis['red_flags'].append(f"⚠️ VICTIM TESTIMONY CONTENT: {victim_mentions} victim-related references")
        analysis['insights'].append("⚠️ Document contains sensitive victim evidence - handle with care")
        analysis['investigative_leads'].append("Coordinate with victim advocates before public release")

    # 7. COMMUNICATION ANALYSIS
    email_indicators = ['From:', 'To:', 'Subject:', 'Sent:', '@', 'Re:', 'Fw:']
    email_count = sum(content.count(indicator) for indicator in email_indicators)

    if email_count > 100:
        analysis['key_findings'].append(f"📧 EMAIL COMMUNICATIONS: {email_count} email indicators detected")
        analysis['insights'].append("Document is likely email correspondence dump - contains communication evidence")

        # Extract potential email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, content)
        unique_emails = set(emails)

        if len(unique_emails) > 10:
            analysis['investigative_leads'].append(f"Subpoena email servers for {len(unique_emails)} unique email addresses")

    # 8. LEGAL DOCUMENT INDICATORS
    legal_keywords = ['deposition', 'testimony', 'under oath', 'plaintiff', 'defendant',
                      'pursuant to', 'hereby', 'witness', 'counsel', 'exhibit']

    legal_count = sum(content.lower().count(keyword.lower()) for keyword in legal_keywords)

    if legal_count > 50:
        analysis['key_findings'].append(f"⚖️ LEGAL PROCEEDINGS: {legal_count} legal term references")
        analysis['insights'].append("Document is likely: Deposition transcript, court filing, or legal correspondence")

    # 9. LOCATION ANALYSIS
    c.execute('''
        SELECT e.name, COUNT(*) as mentions
        FROM entity_mentions em
        JOIN entities e ON em.entity_id = e.id
        WHERE em.doc_id = ? AND e.entity_type = 'location'
        GROUP BY e.id
        ORDER BY mentions DESC
        LIMIT 10
    ''', (doc_id,))

    locations = c.fetchall()

    # Check for Epstein-related locations
    epstein_locations = ['Little St. James', 'Great St. James', 'Palm Beach', 'Manhattan',
                         'New Mexico', 'Paris', 'London', 'Virgin Islands', 'Caribbean']

    found_locations = []
    for loc in locations:
        if any(ep_loc.lower() in loc['name'].lower() for ep_loc in epstein_locations):
            found_locations.append(f"{loc['name']} ({loc['mentions']} refs)")

    if found_locations:
        analysis['red_flags'].append(f"🏝️ EPSTEIN LOCATIONS MENTIONED: {', '.join(found_locations)}")
        analysis['investigative_leads'].append("Map all mentioned locations to identify trafficking routes")

    # 10. OVERALL SIGNIFICANCE ASSESSMENT
    significance_score = 0

    if total_redactions > 50:
        significance_score += 3
    if victim_mentions > 20:
        significance_score += 5
    if financial_mentions > 50:
        significance_score += 3
    if found_suspects:
        significance_score += 4
    if found_locations:
        significance_score += 2
    if overlap:
        significance_score += 4

    if significance_score >= 12:
        priority = "🔴 CRITICAL - Highest investigative priority"
    elif significance_score >= 7:
        priority = "🟠 HIGH - Requires immediate review"
    elif significance_score >= 3:
        priority = "🟡 MODERATE - Standard review"
    else:
        priority = "🟢 LOW - Background information"

    analysis['significance_score'] = significance_score
    analysis['priority'] = priority

    # 11. WHY IS THIS ANOMALOUS?
    anomaly_explanation = []

    word_count = len(content.split())
    if word_count > 100000:
        anomaly_explanation.append(f"Extreme length ({word_count:,} words) - 10x longer than average")

    if total_entities > 2000:
        anomaly_explanation.append(f"Massive entity count ({total_entities:,}) suggests master index or comprehensive archive")

    if total_entities < 100 and word_count > 100000:
        anomaly_explanation.append(f"Very few entities ({total_entities}) for length - likely heavily redacted or non-testimonial content")

    analysis['anomaly_reasons'] = anomaly_explanation

    return analysis

if __name__ == '__main__':
    # Test with the anomalous documents mentioned by user
    anomalous_docs = [
        ('HOUSE_OVERSIGHT_016552.txt', 'Score 16.41 - 280,884 words, 8,717 entities'),
        ('HOUSE_OVERSIGHT_016696.txt', 'Score 16.39 - 280,577 words, 8,730 entities'),
        ('DocumentCloud_Epstein_Docs.pdf', 'Score 16.33 - 279,504 words, 194 entities'),
    ]

    conn = get_db()
    c = conn.cursor()

    print("="*70)
    print("AI-POWERED ANOMALY INVESTIGATION")
    print("="*70)

    for filename, desc in anomalous_docs:
        print(f"\n{'='*70}")
        print(f"ANALYZING: {filename}")
        print(f"Anomaly: {desc}")
        print(f"{'='*70}\n")

        # Find document ID
        c.execute('SELECT id FROM documents WHERE filename = ?', (filename,))
        result = c.fetchone()

        if not result:
            print(f"❌ Document not found in database\n")
            continue

        doc_id = result['id']
        analysis = analyze_anomalous_document(doc_id)

        if 'error' in analysis:
            print(f"❌ {analysis['error']}\n")
            continue

        # Print analysis
        if analysis['anomaly_reasons']:
            print("🔍 WHY THIS IS ANOMALOUS:")
            for reason in analysis['anomaly_reasons']:
                print(f"   • {reason}")
            print()

        if analysis['red_flags']:
            print("🚨 RED FLAGS:")
            for flag in analysis['red_flags']:
                print(f"   {flag}")
            print()

        if analysis['key_findings']:
            print("📋 KEY FINDINGS:")
            for finding in analysis['key_findings']:
                print(f"   {finding}")
            print()

        if analysis['insights']:
            print("💡 AI INSIGHTS:")
            for insight in analysis['insights']:
                print(f"   • {insight}")
            print()

        if analysis['investigative_leads']:
            print("🎯 ACTIONABLE LEADS:")
            for i, lead in enumerate(analysis['investigative_leads'], 1):
                print(f"   {i}. {lead}")
            print()

        print(f"📊 SIGNIFICANCE: {analysis['priority']} (Score: {analysis['significance_score']}/21)")
        print()

    conn.close()
