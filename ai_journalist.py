#!/usr/bin/env python3
"""AI Journalist Assistant - Real intelligence for investigative journalism"""

import sqlite3
import re
from datetime import datetime
from collections import defaultdict

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def answer_natural_language_query(query):
    """
    Process natural language queries and return intelligent answers
    Examples:
    - "How are Trump and Epstein connected?"
    - "What flights did Clinton take?"
    - "When did Ghislaine Maxwell meet with Prince Andrew?"
    - "Find contradictions about the island"
    - "What financial transactions involve Deutsche Bank?"
    """
    query_lower = query.lower()
    conn = get_db()
    c = conn.cursor()

    # Detect query type and route to specialized handler
    if any(word in query_lower for word in ['connect', 'relationship', 'link', 'between']):
        return analyze_connection(query, conn)

    elif any(word in query_lower for word in ['flight', 'flew', 'plane', 'travel', 'trip']):
        return analyze_flights(query, conn)

    elif any(word in query_lower for word in ['when', 'timeline', 'chronology', 'date', 'time']):
        return build_timeline(query, conn)

    elif any(word in query_lower for word in ['contradict', 'inconsisten', 'conflict', 'discrepan']):
        return find_contradictions(query, conn)

    elif any(word in query_lower for word in ['financial', 'money', 'payment', 'transaction', 'wire', 'bank']):
        return analyze_financial(query, conn)

    elif any(word in query_lower for word in ['victim', 'minor', 'abuse', 'massage']):
        return analyze_victim_evidence(query, conn)

    else:
        return general_search(query, conn)

def analyze_connection(query, conn):
    """Analyze how two people are connected WITH DEEP AI INTELLIGENCE"""
    c = conn.cursor()

    # Extract names from query - SMART PARSING
    c.execute("SELECT name FROM entities WHERE entity_type = 'person' ORDER BY mention_count DESC LIMIT 100")
    top_people = [row['name'] for row in c.fetchall()]

    # Try exact matches first
    mentioned_people = [name for name in top_people if name.lower() in query.lower()]

    # If not enough, try partial matches (last names, first names)
    if len(mentioned_people) < 2:
        query_words = set(query.lower().split())
        for name in top_people:
            name_parts = name.lower().split()
            # Check if any part of the name is in the query
            if any(part in query_words for part in name_parts):
                if name not in mentioned_people:
                    mentioned_people.append(name)
                if len(mentioned_people) >= 2:
                    break

    # Common name shortcuts
    shortcuts = {
        'trump': 'Donald Trump',
        'epstein': 'Jeffrey Epstein',
        'clinton': 'Bill Clinton',
        'maxwell': 'Ghislaine Maxwell',
        'andrew': 'Prince Andrew',
        'dershowitz': 'Alan Dershowitz'
    }

    # Apply shortcuts if still not enough people
    if len(mentioned_people) < 2:
        for shortcut, full_name in shortcuts.items():
            if shortcut in query.lower() and full_name not in mentioned_people:
                # Check if this person exists in our database
                if any(full_name.lower() in p.lower() for p in top_people):
                    mentioned_people.append(full_name)
                if len(mentioned_people) >= 2:
                    break

    if len(mentioned_people) < 2:
        return {
            'answer': "Please specify two people to analyze their connection. Try: 'How are Donald Trump and Jeffrey Epstein connected?'",
            'evidence': [],
            'confidence': 'low'
        }

    person1, person2 = mentioned_people[0], mentioned_people[1]

    # Get co-occurrence data
    c.execute('''
        SELECT ec.cooccurrence_count, ec.documents
        FROM entity_cooccurrence ec
        JOIN entities e1 ON ec.entity1_id = e1.id
        JOIN entities e2 ON ec.entity2_id = e2.id
        WHERE (e1.name = ? AND e2.name = ?) OR (e1.name = ? AND e2.name = ?)
    ''', (person1, person2, person2, person1))

    cooccur = c.fetchone()
    if not cooccur:
        return {
            'answer': f"{person1} and {person2} do not appear together in any documents in the database.",
            'evidence': [],
            'confidence': 'high'
        }

    # ===== DEEP AI ANALYSIS BEGINS =====
    import json
    doc_ids = json.loads(cooccur['documents'])[:30]  # Analyze more documents
    count = cooccur['cooccurrence_count']

    answer = f"# 🔍 DEEP CONNECTION ANALYSIS: {person1} ↔ {person2}\n\n"

    # 1. CONNECTION STRENGTH ASSESSMENT
    answer += "## 📊 Connection Strength\n"
    answer += f"**Co-occurrence in {count} documents**\n\n"

    if count > 100:
        answer += "🔴 **VERY STRONG CONNECTION** - These individuals have extensive documented association.\n"
        strength = "VERY STRONG"
    elif count > 50:
        answer += "🟠 **STRONG CONNECTION** - These individuals have regular documented association.\n"
        strength = "STRONG"
    elif count > 20:
        answer += "🟡 **MODERATE CONNECTION** - These individuals have some documented association.\n"
        strength = "MODERATE"
    else:
        answer += "🟢 **WEAK CONNECTION** - These individuals have limited documented association.\n"
        strength = "WEAK"
    answer += "\n"

    # 2. CONTEXT ANALYSIS - Understand the NATURE of the relationship
    answer += "## 🔎 Relationship Context Analysis\n"

    context_keywords = {
        '✈️ Travel/Flights': ['flight', 'plane', 'flew', 'trip', 'travel', 'manifest', 'passenger'],
        '📧 Communications': ['email', 'message', 'wrote', 'letter', 'call', 'phone', 'spoke'],
        '🎉 Social Events': ['party', 'dinner', 'event', 'gathering', 'meeting', 'visit'],
        '💼 Business': ['business', 'deal', 'investment', 'company', 'money', 'financial'],
        '🏝️ Private Locations': ['island', 'ranch', 'estate', 'mansion', 'residence', 'property'],
        '⚠️ Victim-Related': ['victim', 'massage', 'minor', 'girl', 'young', 'underage'],
        '🏛️ Legal/Court': ['testimony', 'deposition', 'court', 'lawsuit', 'allegation', 'lawsuit'],
        '📸 Photos/Media': ['photo', 'photograph', 'picture', 'video', 'camera']
    }

    context_counts = defaultdict(int)
    all_content = ""

    # Analyze all co-occurrence documents
    for doc_id in doc_ids:
        c.execute('SELECT content FROM documents WHERE id = ?', (doc_id,))
        doc = c.fetchone()
        if doc:
            content_lower = doc['content'].lower()
            all_content += content_lower + " "

            for context_type, keywords in context_keywords.items():
                for keyword in keywords:
                    if keyword in content_lower:
                        context_counts[context_type] += 1
                        break

    # Display context analysis
    sorted_contexts = sorted(context_counts.items(), key=lambda x: x[1], reverse=True)
    for context, count_ctx in sorted_contexts:
        percentage = (count_ctx / len(doc_ids)) * 100
        answer += f"- **{context}**: {count_ctx} documents ({percentage:.1f}%)"
        if percentage > 50:
            answer += " 🚨 **DOMINANT CONTEXT**"
        answer += "\n"

    if not sorted_contexts:
        answer += "No specific context patterns detected.\n"
    answer += "\n"

    # 3. BEHAVIORAL PATTERN ANALYSIS
    answer += "## 🧠 Behavioral Pattern Intelligence\n"

    # Check for relationship descriptors
    relationship_indicators = {
        'close friendship': ['friend', 'close', 'longtime', 'personal'],
        'business partnership': ['partner', 'business', 'deal', 'investment'],
        'social acquaintance': ['met', 'know', 'acquainted', 'social'],
        'frequent contact': ['often', 'frequently', 'regularly', 'multiple'],
        'denied association': ['never', 'deny', 'not', 'no relationship']
    }

    found_patterns = []
    for pattern_name, keywords in relationship_indicators.items():
        for keyword in keywords:
            if keyword in all_content:
                found_patterns.append(pattern_name)
                break

    if found_patterns:
        answer += "**Relationship descriptors found:**\n"
        for pattern in set(found_patterns):
            answer += f"- {pattern.title()}\n"
        answer += "\n"

    # 4. EXTRACT SPECIFIC EVIDENCE
    evidence = []
    for doc_id in doc_ids[:15]:
        c.execute('SELECT filename, content FROM documents WHERE id = ?', (doc_id,))
        doc = c.fetchone()
        if doc:
            content = doc['content']

            # Find excerpts mentioning both people
            sentences = re.split(r'[.!?]+', content)
            relevant_sentences = []
            for sentence in sentences:
                if person1.lower() in sentence.lower() and person2.lower() in sentence.lower():
                    relevant_sentences.append(sentence.strip())

            if relevant_sentences:
                evidence.append({
                    'document': doc['filename'],
                    'doc_id': doc_id,
                    'excerpts': relevant_sentences[:3]
                })

    # 5. TIMELINE CORRELATION
    answer += "## 📅 Timeline Analysis\n"

    # Extract dates from documents
    date_pattern = r'\b(19|20)\d{2}\b'
    years_found = re.findall(date_pattern, all_content)
    if years_found:
        year_freq = defaultdict(int)
        for year in years_found:
            year_freq[year] += 1

        sorted_years = sorted(year_freq.items())
        if len(sorted_years) > 1:
            answer += f"**Association timeline**: {sorted_years[0][0]} - {sorted_years[-1][0]}\n"

            peak_years = sorted(year_freq.items(), key=lambda x: x[1], reverse=True)[:3]
            answer += f"**Peak interaction years**: {', '.join([f'{year} ({cnt} refs)' for year, cnt in peak_years])}\n"

            # Check if overlaps with known Epstein abuse period
            abuse_years = set([str(y) for y in range(1998, 2008)])
            mentioned_years = set(year_freq.keys())
            overlap = abuse_years & mentioned_years
            if overlap:
                answer += f"\n🚨 **CRITICAL**: Association documented during Epstein abuse period ({', '.join(sorted(overlap))})\n"
        answer += "\n"

    # 6. MUTUAL CONNECTIONS - Who else appears with both?
    answer += "## 🕸️ Network Analysis - Mutual Connections\n"

    # Find other people who appear in same documents as both subjects
    mutual_connections = defaultdict(int)
    for doc_id in doc_ids:
        c.execute('''
            SELECT e.name
            FROM entities e
            JOIN entity_mentions em ON e.id = em.entity_id
            WHERE em.doc_id = ? AND e.entity_type = 'person'
            AND e.name != ? AND e.name != ?
            ORDER BY e.mention_count DESC
        ''', (doc_id, person1, person2))

        for row in c.fetchall():
            mutual_connections[row['name']] += 1

    top_mutuals = sorted(mutual_connections.items(), key=lambda x: x[1], reverse=True)[:8]
    if top_mutuals:
        answer += f"**People frequently appearing with both {person1} and {person2}:**\n"
        for name, occurrences in top_mutuals:
            answer += f"- **{name}**: {occurrences} joint documents"
            if occurrences > len(doc_ids) * 0.3:
                answer += " 🔴 **KEY CONNECTOR**"
            answer += "\n"
        answer += "\n💡 **Insight**: Mutual connections reveal the social/business network structure.\n\n"

    # 7. INVESTIGATIVE SIGNIFICANCE
    answer += "## 🎯 Investigative Significance Assessment\n"

    significance_score = 0
    reasons = []

    if count > 50:
        significance_score += 3
        reasons.append("High-volume association (50+ documents)")
    if context_counts.get('⚠️ Victim-Related', 0) > 0:
        significance_score += 5
        reasons.append("VICTIM-RELATED CONTEXT DETECTED")
    if context_counts.get('🏝️ Private Locations', 0) > 5:
        significance_score += 3
        reasons.append("Frequent private location mentions")
    if context_counts.get('✈️ Travel/Flights', 0) > 10:
        significance_score += 2
        reasons.append("Extensive travel together")
    if overlap if 'overlap' in locals() else False:
        significance_score += 4
        reasons.append("Association during abuse period")

    for reason in reasons:
        if "VICTIM" in reason:
            answer += f"🚨 {reason}\n"
        else:
            answer += f"✓ {reason}\n"

    answer += f"\n**Significance Score**: {significance_score}/17\n"
    if significance_score >= 10:
        answer += "🔴 **CRITICAL INVESTIGATIVE PRIORITY** - Requires immediate deep investigation\n"
    elif significance_score >= 5:
        answer += "🟡 **HIGH PRIORITY** - Warrants thorough investigation\n"
    else:
        answer += "🟢 **MODERATE PRIORITY** - Standard investigation procedures\n"

    # Build specific, intelligent actionable leads
    actionable = []
    if top_mutuals:
        actionable.append(f"Interview {top_mutuals[0][0]} about interactions between {person1} and {person2} ({top_mutuals[0][1]} joint appearances)")
    if sorted_contexts and sorted_contexts[0][0] == '✈️ Travel/Flights':
        actionable.append(f"Obtain complete flight manifests - travel is dominant connection type ({sorted_contexts[0][1]} docs)")
    if 'close friendship' in found_patterns:
        actionable.append(f"Investigate claims of 'friendship' - verify nature and duration of relationship")
    if overlap if 'overlap' in locals() else False:
        actionable.append(f"Cross-reference {person1}-{person2} interactions during {', '.join(sorted(list(overlap)))} with victim testimony")
    if context_counts.get('📸 Photos/Media', 0) > 0:
        actionable.append(f"Collect all photographic evidence of {person1} and {person2} together")

    actionable.append(f"Subpoena phone records between {person1} and {person2}")
    actionable.append(f"Review all {count} co-occurrence documents for patterns and timeline")

    return {
        'answer': answer,
        'evidence': evidence,
        'confidence': 'high',
        'actionable_leads': actionable
    }

def analyze_flights(query, conn):
    """Analyze flight-related questions WITH DEEP AI INTELLIGENCE"""
    c = conn.cursor()

    # Find people mentioned
    c.execute("SELECT name FROM entities WHERE entity_type = 'person' ORDER BY mention_count DESC LIMIT 100")
    top_people = [row['name'] for row in c.fetchall()]
    mentioned_people = [name for name in top_people if name.lower() in query.lower()]

    if not mentioned_people:
        person = None
    else:
        person = mentioned_people[0]

    # Search flight log documents
    if person:
        c.execute('''
            SELECT d.id, d.filename, d.content
            FROM documents d
            JOIN entity_mentions em ON d.id = em.doc_id
            JOIN entities e ON em.entity_id = e.id
            WHERE e.name = ?
            AND (d.filename LIKE '%flight%' OR d.filename LIKE '%manifest%' OR d.content LIKE '%flight%' OR d.content LIKE '%flew%')
            LIMIT 100
        ''', (person,))
    else:
        c.execute('''
            SELECT id, filename, content
            FROM documents
            WHERE filename LIKE '%flight%' OR filename LIKE '%manifest%'
            LIMIT 100
        ''')

    docs = c.fetchall()

    if not docs:
        return {
            'answer': f"No flight log documents found{f' mentioning {person}' if person else ''}.",
            'evidence': [],
            'confidence': 'high'
        }

    # ===== DEEP AI ANALYSIS BEGINS =====

    # Extract flight information with comprehensive data collection
    flights = []
    all_dates = []
    all_routes = []
    destination_freq = defaultdict(int)
    companion_freq = defaultdict(int)
    yearly_flights = defaultdict(list)

    for doc in docs:
        content = doc['content']

        # Enhanced date patterns
        date_pattern = r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'
        dates = re.findall(date_pattern, content)

        # Enhanced route patterns
        route_pattern = r'(?:from|departed|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'
        routes = re.findall(route_pattern, content)

        # Extract all mentioned people in this flight doc
        c.execute('''
            SELECT e.name
            FROM entities e
            JOIN entity_mentions em ON e.id = em.entity_id
            WHERE em.doc_id = ? AND e.entity_type = 'person'
            ORDER BY e.mention_count DESC
        ''', (doc['id'],))
        passengers = [row['name'] for row in c.fetchall()]

        if dates or routes or (person and person.lower() in content.lower()):
            flight_data = {
                'document': doc['filename'],
                'doc_id': doc['id'],
                'dates': dates[:5],
                'routes': routes[:10],
                'passengers': passengers,
                'excerpt': content[:500] + "..." if len(content) > 500 else content
            }
            flights.append(flight_data)

            # Aggregate data for pattern analysis
            all_dates.extend(dates)
            all_routes.extend(routes)

            for route in routes:
                destination_freq[route.strip()] += 1

            for passenger in passengers:
                if person and passenger.lower() != person.lower():
                    companion_freq[passenger] += 1

            # Parse years from dates
            for date in dates:
                year_match = re.search(r'(\d{4})', date)
                if year_match:
                    year = year_match.group(1)
                    yearly_flights[year].append(date)

    # ===== ANALYTICAL INTELLIGENCE =====

    answer = f"# 🔍 DEEP FLIGHT ANALYSIS: {person if person else 'All passengers'}\n\n"

    # 1. PATTERN ANALYSIS
    answer += "## 📊 Pattern Analysis\n"
    answer += f"**Total flight documents analyzed**: {len(flights)}\n"
    answer += f"**Date references extracted**: {len(all_dates)}\n"
    answer += f"**Route references found**: {len(all_routes)}\n\n"

    # 2. DESTINATION INTELLIGENCE
    if destination_freq:
        answer += "## 🌍 Destination Intelligence\n"
        top_destinations = sorted(destination_freq.items(), key=lambda x: x[1], reverse=True)[:8]

        for dest, count in top_destinations:
            answer += f"- **{dest}**: {count} trip{'s' if count > 1 else ''}"
            if count >= 5:
                answer += " ⚠️ **HIGH FREQUENCY - INVESTIGATE**"
            answer += "\n"

        # Identify suspicious destinations
        suspicious_locations = ['Little St. James', 'Island', 'Virgin', 'Caribbean', 'Ranch', 'Paris', 'London']
        found_suspicious = [loc for loc in suspicious_locations if any(loc.lower() in dest.lower() for dest, _ in top_destinations)]
        if found_suspicious:
            answer += f"\n🚨 **CRITICAL**: Travel to known Epstein locations detected: {', '.join(found_suspicious)}\n"
        answer += "\n"

    # 3. TIMELINE ANALYSIS
    if yearly_flights:
        answer += "## 📅 Timeline Analysis\n"
        sorted_years = sorted(yearly_flights.items())

        for year, dates in sorted_years:
            answer += f"- **{year}**: {len(dates)} documented flight{'s' if len(dates) > 1 else ''}"
            if len(dates) >= 10:
                answer += " ⚠️ **PEAK ACTIVITY YEAR**"
            answer += "\n"

        # Identify activity patterns
        if len(sorted_years) > 1:
            first_year = sorted_years[0][0]
            last_year = sorted_years[-1][0]
            answer += f"\n**Activity span**: {first_year} - {last_year}\n"

            peak_year = max(yearly_flights.items(), key=lambda x: len(x[1]))
            answer += f"**Peak activity**: {peak_year[0]} ({len(peak_year[1])} flights) 🔴\n"
        answer += "\n"

    # 4. COMPANION ANALYSIS - WHO TRAVELED WITH TARGET
    if person and companion_freq:
        answer += "## 👥 Traveling Companion Analysis\n"
        answer += f"**People frequently traveling with {person}:**\n"

        top_companions = sorted(companion_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        for companion, count in top_companions:
            answer += f"- **{companion}**: {count} co-occurrence{'s' if count > 1 else ''}"

            # Check if companion is a known suspect
            known_suspects = ['Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew', 'Donald Trump']
            if any(suspect.lower() in companion.lower() for suspect in known_suspects):
                answer += " 🚨 **KEY SUSPECT**"
            answer += "\n"

        answer += "\n💡 **Insight**: Frequent co-travelers indicate close association and potential co-conspirators.\n\n"

    # 5. CORRELATION WITH VICTIM TESTIMONY
    answer += "## ⚖️ Correlation with Investigation Timeline\n"

    # Check for overlap with known abuse periods (general Epstein operation: 1998-2007 peak)
    abuse_years = set(['1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007'])
    flight_years = set(yearly_flights.keys())
    overlap = abuse_years & flight_years

    if overlap:
        answer += f"🚨 **CRITICAL FINDING**: Flights documented during known abuse period ({', '.join(sorted(overlap))})\n"
        answer += "**Significance**: These flights occurred during Epstein's most active trafficking period.\n\n"
    else:
        answer += "Flights do not overlap with primary investigation timeline (1998-2007).\n\n"

    # 6. ANOMALY DETECTION
    answer += "## 🔎 Anomaly Detection\n"
    anomalies = []

    # Check for unusual date formats or redactions
    redaction_pattern = r'\[REDACTED\]|XXX|###|\*\*\*'
    for flight in flights[:20]:
        if re.search(redaction_pattern, flight['excerpt']):
            anomalies.append(f"Redacted information in {flight['document']}")

    # Check for suspicious timing (midnight flights, weekend travel)
    weekend_pattern = r'\b(Saturday|Sunday)\b'
    for flight in flights[:20]:
        if re.search(weekend_pattern, flight['excerpt'], re.IGNORECASE):
            anomalies.append(f"Weekend travel detected in {flight['document']}")

    if anomalies:
        for anomaly in anomalies[:5]:
            answer += f"⚠️ {anomaly}\n"
        answer += "\n"
    else:
        answer += "No obvious anomalies detected in manifest data.\n\n"

    # 7. INVESTIGATIVE SIGNIFICANCE ASSESSMENT
    answer += "## 🎯 Investigative Significance\n"

    significance_score = 0
    if len(flights) > 20:
        significance_score += 2
        answer += "✓ **High volume** of flight records indicates extensive travel pattern\n"
    if len(overlap) > 0:
        significance_score += 3
        answer += "✓ **Timeline correlation** with abuse period is HIGHLY SIGNIFICANT\n"
    if len(top_companions) > 5 if person and companion_freq else False:
        significance_score += 2
        answer += "✓ **Multiple companions** suggest organized operation\n"
    if any(count >= 5 for _, count in destination_freq.items()):
        significance_score += 2
        answer += "✓ **Repeated destinations** indicate established routes/locations\n"

    answer += f"\n**Overall Significance**: "
    if significance_score >= 6:
        answer += "🔴 **CRITICAL** - High priority for investigation\n"
    elif significance_score >= 3:
        answer += "🟡 **MODERATE** - Warrants further review\n"
    else:
        answer += "🟢 **LOW** - Limited investigative value\n"

    # Build specific actionable leads based on actual findings
    actionable = []
    if top_destinations:
        top_dest = top_destinations[0][0]
        actionable.append(f"Investigate all trips to {top_dest} ({top_destinations[0][1]} occurrences) - obtain passenger manifests")
    if top_companions:
        actionable.append(f"Interview {top_companions[0][0]} about {top_companions[0][1]} joint flights with {person}")
    if overlap:
        actionable.append(f"Cross-reference {', '.join(sorted(overlap))} flight dates with victim testimony timelines")
    if anomalies:
        actionable.append(f"Subpoena unredacted versions of {len(anomalies)} documents with redactions")
    if yearly_flights:
        peak = max(yearly_flights.items(), key=lambda x: len(x[1]))
        actionable.append(f"Focus investigation on {peak[0]} - peak activity year with {len(peak[1])} flights")

    actionable.append("Map all flight routes to visualize travel network")
    actionable.append("Compare with Secret Service logs if subject is government official")

    return {
        'answer': answer,
        'evidence': flights[:15],
        'confidence': 'high',
        'actionable_leads': actionable
    }

def build_timeline(query, conn):
    """Build chronological timeline from documents"""
    c = conn.cursor()

    # Extract names or topics from query
    c.execute("SELECT name FROM entities WHERE entity_type = 'person' ORDER BY mention_count DESC LIMIT 50")
    top_people = [row['name'] for row in c.fetchall()]
    mentioned_people = [name for name in top_people if name.lower() in query.lower()]

    if mentioned_people:
        person = mentioned_people[0]
        c.execute('''
            SELECT d.id, d.filename, d.content, d.uploaded_date
            FROM documents d
            JOIN entity_mentions em ON d.id = em.doc_id
            JOIN entities e ON em.entity_id = e.id
            WHERE e.name = ?
            ORDER BY d.uploaded_date DESC
            LIMIT 100
        ''', (person,))
    else:
        c.execute('SELECT id, filename, content, uploaded_date FROM documents ORDER BY uploaded_date DESC LIMIT 100')

    docs = c.fetchall()

    # Extract dates and events
    events = []
    date_patterns = [
        r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b',
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
        r'\b(19|20)\d{2}\b'
    ]

    for doc in docs:
        content = doc['content']
        for pattern in date_patterns:
            matches = re.findall(pattern, content)
            for date_str in matches:
                # Find surrounding context
                idx = content.find(date_str)
                if idx != -1:
                    start = max(0, idx - 100)
                    end = min(len(content), idx + 200)
                    context = content[start:end].strip()

                    events.append({
                        'date': date_str,
                        'context': context,
                        'document': doc['filename'],
                        'doc_id': doc['id']
                    })

    # Sort events by date (rough sort, may need better date parsing)
    events.sort(key=lambda x: x['date'])

    answer = f"**Timeline reconstruction: Found {len(events)} dated events"
    if mentioned_people:
        answer += f" involving {mentioned_people[0]}"
    answer += "**\n\n"

    if events:
        answer += "Chronological events:\n"
        for i, event in enumerate(events[:15], 1):
            answer += f"{i}. **{event['date']}**: {event['context'][:100]}... (Doc: {event['document']})\n\n"

    return {
        'answer': answer,
        'evidence': events[:20],
        'confidence': 'medium',
        'actionable_leads': [
            "Verify dates against other sources",
            "Fill timeline gaps with witness interviews",
            "Cross-reference with financial transaction dates",
            "Map events to specific locations"
        ]
    }

def find_contradictions(query, conn):
    """Find contradictions or inconsistencies across documents"""
    c = conn.cursor()

    # Extract topics or people from query
    keywords = [word for word in query.lower().split() if len(word) > 4]

    # Search for documents with relevant keywords
    where_clauses = ' OR '.join([f"content LIKE ?" for _ in keywords])
    query = f'''
        SELECT id, filename, content
        FROM documents
        WHERE {where_clauses}
        LIMIT 50
    '''
    c.execute(query, tuple([f'%{kw}%' for kw in keywords]))

    docs = c.fetchall()

    if len(docs) < 2:
        return {
            'answer': "Need at least 2 documents to analyze contradictions. Try a more specific query.",
            'evidence': [],
            'confidence': 'low'
        }

    # Look for contradictory statements
    contradictions = []

    # Common contradiction patterns
    patterns = [
        (r'(never|did not|didn\'t|no)\s+\w+', r'(did|was|were|has|had)\s+\w+'),
        (r'(\d+)\s+(time|year|month|day)', r'(\d+)\s+(time|year|month|day)'),
        (r'(always|frequently|often)', r'(rarely|never|seldom)'),
    ]

    # Compare statements across documents
    for i, doc1 in enumerate(docs):
        for doc2 in docs[i+1:]:
            # Simple contradiction detection: look for negation patterns
            content1 = doc1['content'].lower()
            content2 = doc2['content'].lower()

            # Find sentences with "never" in one and positive assertion in another
            sentences1 = [s.strip() for s in re.split(r'[.!?]+', content1) if 'never' in s or 'did not' in s or "didn't" in s]
            sentences2 = [s.strip() for s in re.split(r'[.!?]+', content2) if any(kw in query.lower() for kw in s.split())]

            if sentences1 and sentences2:
                contradictions.append({
                    'doc1': doc1['filename'],
                    'doc1_id': doc1['id'],
                    'statement1': sentences1[0][:200],
                    'doc2': doc2['filename'],
                    'doc2_id': doc2['id'],
                    'statement2': sentences2[0][:200]
                })

    answer = f"**Contradiction Analysis: Found {len(contradictions)} potential inconsistencies**\n\n"

    if contradictions:
        answer += "Potential contradictions requiring investigation:\n\n"
        for i, contra in enumerate(contradictions[:10], 1):
            answer += f"{i}. **{contra['doc1']}**: \"{contra['statement1']}\"\n"
            answer += f"   vs **{contra['doc2']}**: \"{contra['statement2']}\"\n\n"
    else:
        answer += "No clear contradictions found. Documents appear consistent on this topic.\n"

    return {
        'answer': answer,
        'evidence': contradictions,
        'confidence': 'medium',
        'actionable_leads': [
            "Interview witnesses to resolve contradictions",
            "Request additional documentation",
            "Examine context around contradictory statements",
            "Determine which source is more reliable"
        ]
    }

def analyze_financial(query, conn):
    """Analyze financial transactions and money flows"""
    c = conn.cursor()

    # Search for financial documents
    financial_keywords = ['payment', 'wire', 'transaction', 'account', 'bank', 'money', 'dollar', 'transfer', 'financial']

    where_clauses = ' OR '.join([f"content LIKE ?" for _ in financial_keywords])
    query = f'''
        SELECT id, filename, content
        FROM documents
        WHERE {where_clauses}
        LIMIT 100
    '''
    c.execute(query, tuple([f'%{kw}%' for kw in financial_keywords]))

    docs = c.fetchall()

    # Extract monetary amounts
    transactions = []
    amount_pattern = r'\$\s*[\d,]+(?:\.\d{2})?|\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:dollar|USD|euros?)\b'

    for doc in docs:
        content = doc['content']
        amounts = re.findall(amount_pattern, content, re.IGNORECASE)

        if amounts:
            # Find entities mentioned in this doc
            c.execute('''
                SELECT e.name
                FROM entities e
                JOIN entity_mentions em ON e.id = em.entity_id
                WHERE em.doc_id = ? AND e.entity_type = 'person'
                ORDER BY e.mention_count DESC
                LIMIT 10
            ''', (doc['id'],))
            people = [row['name'] for row in c.fetchall()]

            transactions.append({
                'document': doc['filename'],
                'doc_id': doc['id'],
                'amounts': amounts[:10],
                'people_involved': people,
                'excerpt': content[:400] + "..."
            })

    total_docs = len(transactions)
    total_amounts = sum(len(t['amounts']) for t in transactions)

    answer = f"**Financial Analysis: Found {total_docs} documents with {total_amounts} monetary references**\n\n"

    if transactions:
        answer += "Key financial documents:\n"
        for i, trans in enumerate(transactions[:10], 1):
            answer += f"{i}. **{trans['document']}**\n"
            answer += f"   Amounts: {', '.join(trans['amounts'][:5])}\n"
            if trans['people_involved']:
                answer += f"   People: {', '.join(trans['people_involved'][:5])}\n"
            answer += "\n"

    return {
        'answer': answer,
        'evidence': transactions,
        'confidence': 'high',
        'actionable_leads': [
            "Trace money flows between accounts",
            "Identify shell companies and intermediaries",
            "Cross-reference with tax returns",
            "Subpoena bank records for verification",
            "Follow the money to identify beneficiaries"
        ]
    }

def analyze_victim_evidence(query, conn):
    """Analyze victim testimony and abuse evidence"""
    c = conn.cursor()

    # Search for victim-related documents
    victim_keywords = ['victim', 'minor', 'underage', 'massage', 'abuse', 'testimony', 'witness', 'jane doe']

    where_clauses = ' OR '.join([f"content LIKE ?" for _ in victim_keywords])
    query = f'''
        SELECT id, filename, content
        FROM documents
        WHERE {where_clauses}
        LIMIT 100
    '''
    c.execute(query, tuple([f'%{kw}%' for kw in victim_keywords]))

    docs = c.fetchall()

    evidence = []
    for doc in docs:
        content = doc['content']

        # Look for victim identifiers
        victim_pattern = r'(Jane Doe \d+|Victim \d+|Minor \d+)'
        victims = re.findall(victim_pattern, content, re.IGNORECASE)

        # Look for age references
        age_pattern = r'\b(\d{1,2})\s*(?:year|yr)s?\s*old\b'
        ages = re.findall(age_pattern, content)

        # Get people mentioned
        c.execute('''
            SELECT e.name
            FROM entities e
            JOIN entity_mentions em ON e.id = em.entity_id
            WHERE em.doc_id = ? AND e.entity_type = 'person'
            ORDER BY e.mention_count DESC
            LIMIT 10
        ''', (doc['id'],))
        people = [row['name'] for row in c.fetchall()]

        if victims or ages or any(kw in content.lower() for kw in victim_keywords):
            evidence.append({
                'document': doc['filename'],
                'doc_id': doc['id'],
                'victim_references': list(set(victims)),
                'age_references': ages[:5],
                'people_mentioned': people,
                'excerpt': content[:500] + "..."
            })

    answer = f"**Victim Evidence Analysis: Found {len(evidence)} relevant documents**\n\n"

    if evidence:
        answer += "⚠️ **WARNING: Sensitive victim evidence**\n\n"
        total_victims = sum(len(e['victim_references']) for e in evidence)
        answer += f"Documents contain {total_victims} victim references\n\n"

        answer += "Key evidence documents:\n"
        for i, ev in enumerate(evidence[:10], 1):
            answer += f"{i}. **{ev['document']}**\n"
            if ev['victim_references']:
                answer += f"   Victims: {', '.join(ev['victim_references'])}\n"
            if ev['people_mentioned']:
                answer += f"   Suspects: {', '.join(ev['people_mentioned'][:5])}\n"
            answer += "\n"

    return {
        'answer': answer,
        'evidence': evidence,
        'confidence': 'high',
        'actionable_leads': [
            "Interview all victims for detailed testimony",
            "Cross-reference victim accounts for corroboration",
            "Map victim timelines to suspect whereabouts",
            "Identify all witnesses present",
            "Secure medical and forensic evidence"
        ]
    }

def general_search(query, conn):
    """General intelligent search"""
    c = conn.cursor()

    # Extract keywords
    stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
    keywords = [word for word in query.lower().split() if word not in stopwords and len(word) > 2]

    if not keywords:
        return {
            'answer': "Please provide more specific keywords for search.",
            'evidence': [],
            'confidence': 'low'
        }

    # Search documents
    where_clauses = ' OR '.join([f"content LIKE ?" for _ in keywords])
    query = f'''
        SELECT id, filename, content, uploaded_date
        FROM documents
        WHERE {where_clauses}
        LIMIT 50
    '''
    c.execute(query, tuple([f'%{kw}%' for kw in keywords]))

    docs = c.fetchall()

    if not docs:
        return {
            'answer': f"No documents found matching: {', '.join(keywords)}",
            'evidence': [],
            'confidence': 'high'
        }

    # Extract relevant excerpts
    results = []
    for doc in docs:
        content = doc['content']

        # Find sentences containing keywords
        sentences = re.split(r'[.!?]+', content)
        relevant = []
        for sentence in sentences:
            if any(kw in sentence.lower() for kw in keywords):
                relevant.append(sentence.strip())

        if relevant:
            results.append({
                'document': doc['filename'],
                'doc_id': doc['id'],
                'relevance': len(relevant),
                'excerpts': relevant[:5]
            })

    results.sort(key=lambda x: x['relevance'], reverse=True)

    answer = f"**Search Results: Found {len(results)} relevant documents**\n\n"
    answer += f"Query: {query}\n\n"
    answer += "Top matches:\n"

    for i, result in enumerate(results[:10], 1):
        answer += f"{i}. **{result['document']}** ({result['relevance']} mentions)\n"
        answer += f"   \"{result['excerpts'][0][:150]}...\"\n\n"

    return {
        'answer': answer,
        'evidence': results[:20],
        'confidence': 'high',
        'actionable_leads': [
            f"Review all {len(results)} matching documents",
            "Identify patterns across documents",
            "Interview sources mentioned",
            "Request additional related documents"
        ]
    }

if __name__ == '__main__':
    # Test queries
    test_queries = [
        "How are Donald Trump and Jeffrey Epstein connected?",
        "What flights did Bill Clinton take?",
        "Find contradictions about the island",
        "What financial transactions involve Ghislaine Maxwell?",
    ]

    for query in test_queries:
        print(f"\n{'='*70}")
        print(f"QUERY: {query}")
        print('='*70)
        result = answer_natural_language_query(query)
        print(result['answer'])
        print(f"\nConfidence: {result['confidence']}")
        print(f"Evidence documents: {len(result.get('evidence', []))}")
