"""Test parsing functions with sample data"""

from flight_log_analyzer import parse_flight_manifest_text
from email_intelligence import parse_email_from_text, check_suspicious_content
from financial_tracker import extract_financial_data, analyze_transaction_suspicion
from timeline_builder import normalize_date

print("="*70)
print("TESTING PARSER FUNCTIONS")
print("="*70)

# Test 1: Flight Log Parser
print("\n1. Testing Flight Log Parser")
print("-" * 70)
flight_text = """
Flight Manifest
Date: 2019-07-14
Aircraft: N474AW
Route: TEB - PBI

Passengers:
1. John Doe (45)
2. Jane Smith (17)
3. Robert Johnson (52)
"""

flight_data_list = parse_flight_manifest_text(flight_text)
if flight_data_list and len(flight_data_list) > 0:
    flight_data = flight_data_list[0]
    print(f"✅ Parsed flight: {flight_data.get('tail_number', 'N/A')}")
    print(f"   Date: {flight_data.get('date', 'N/A')}")
    print(f"   Route: {flight_data.get('origin', 'N/A')} → {flight_data.get('destination', 'N/A')}")
    print(f"   Passengers: {len(flight_data.get('passengers', []))}")
    for p in flight_data.get('passengers', []):
        minor_flag = " ⚠️ MINOR" if p.get('is_minor', False) else ""
        print(f"   - {p.get('name', 'Unknown')} ({p.get('age', '?')}){minor_flag}")
else:
    print("❌ Failed to parse flight manifest")

# Test 2: Email Parser
print("\n2. Testing Email Parser")
print("-" * 70)
email_text = """
From: john@example.com
To: jane@example.com
Subject: Re: Travel arrangements
Date: July 14, 2019

Hi Jane,

We need to arrange the flight for next week. The young girl will be
traveling with us. Please keep this confidential and make the payment
in cash as discussed.

Best,
John
"""

email_data = parse_email_from_text(email_text, doc_id=9999)
if email_data:
    print(f"✅ Parsed email from: {email_data['from_address']}")
    print(f"   Subject: {email_data['subject']}")
    print(f"   Date: {email_data['date_sent']}")

    # Check for suspicious content
    suspicion = check_suspicious_content(email_data['body'], email_data['subject'])
    print(f"   Suspicious: {suspicion['is_suspicious']} (score: {suspicion['suspicion_score']})")
    if suspicion['keywords_found']:
        print(f"   Flagged keywords: {suspicion['keywords_found']}")
else:
    print("❌ Failed to parse email")

# Test 3: Financial Transaction Parser
print("\n3. Testing Financial Transaction Parser")
print("-" * 70)
transaction_text = """
Payment Details:
Date: 07/14/2019
Amount: $9,800.00 USD
From: Acme Corp
To: John Doe
Method: Cash
Purpose: Consulting services
"""

transactions = extract_financial_data(transaction_text)
if transactions:
    for txn in transactions:
        print(f"✅ Parsed transaction: ${txn['amount']:,.2f} {txn['currency']}")
        print(f"   From: {txn['from_entity']} → To: {txn['to_entity']}")
        print(f"   Date: {txn['transaction_date']}")
        print(f"   Method: {txn['payment_method']}")

        # Analyze suspicion
        suspicion = analyze_transaction_suspicion(txn)
        print(f"   Suspicious: {suspicion['is_suspicious']} (score: {suspicion['suspicion_score']})")
        if suspicion['red_flags']:
            print(f"   Red flags: {', '.join(suspicion['red_flags'])}")
else:
    print("❌ Failed to extract financial data")

# Test 4: Date Normalization
print("\n4. Testing Date Normalization")
print("-" * 70)
date_formats = [
    "2019-07-14",
    "07/14/2019",
    "July 14, 2019",
    "14/07/2019",
    "2019/07/14"
]

for date_str in date_formats:
    normalized = normalize_date(date_str)
    status = "✅" if normalized else "❌"
    print(f"{status} '{date_str}' → '{normalized}'")

print("\n" + "="*70)
print("PARSER TESTING COMPLETE")
print("="*70)
