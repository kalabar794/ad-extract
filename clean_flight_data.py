#!/usr/bin/env python3
"""
Clean Flight Data - Remove Non-Passenger Entries
Removes obvious noise from the flight_passengers table
"""

import sqlite3
import re

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def clean_flight_passengers():
    """Remove entries that are clearly not passenger names"""

    # Patterns to remove
    noise_patterns = [
        # Email/document artifacts
        r'^Is [A-Z]',  # "Is Read", "Is Invitation"
        r'^On [A-Z][a-z]{2}$',  # "On Mon", "On Fri", "On Sep"
        r'^The ',
        r'^Subject:',
        r'^From:',
        r'^To:',
        r'^Date:',
        r'@',  # Email addresses
        r'http',
        r'www\.',

        # Common non-name phrases
        r'^and$',
        r'^or$',
        r'^the$',
        r'^a$',
        r'^of$',
        r'^in$',
        r'^to$',
        r'^for$',

        # Date fragments
        r'^\d{4}$',  # Just years
        r'^\d{1,2}/\d{1,2}',  # Dates
    ]

    # Known non-passenger entries (organizations, locations, common phrases)
    noise_entries = {
        # Locations
        'New York', 'United States', 'Palm Beach', 'Hong Kong', 'White House',
        'Los Angeles', 'San Francisco', 'Washington', 'London', 'Paris',
        'Miami', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx',
        'West Palm Beach', 'West Bank', 'East Coast', 'West Coast',
        'New Mexico', 'Santa Fe', 'Virgin Islands', 'Middle East',

        # Organizations
        'Merrill Lynch', 'Merrill Lynch Global Research', 'New York Times',
        'Wall Street Journal', 'Washington Post', 'CNN', 'BBC', 'Reuters',
        'Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Citigroup',
        'General Partner', 'Managing Partner', 'Senior Partner',

        # Generic names/placeholders
        'Jane Doe', 'John Doe', 'Unknown', 'Unidentified', 'Anonymous',

        # Document/email artifacts
        'Is Read', 'Is Invitation', 'Is Attachment', 'Is Email',
        'Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook',

        # Short/single character entries
        'A', 'B', 'C', 'I', 'X', 'Y', 'Z',
    }

    conn = get_db()
    c = conn.cursor()

    # Get all unique passenger names
    c.execute('SELECT DISTINCT passenger_name FROM flight_passengers')
    all_passengers = [row['passenger_name'] for row in c.fetchall()]

    print(f"Total unique passenger entries before cleaning: {len(all_passengers)}")

    to_delete = set()

    # Check against patterns
    for passenger in all_passengers:
        if not passenger or len(passenger.strip()) == 0:
            to_delete.add(passenger)
            continue

        # Check regex patterns
        for pattern in noise_patterns:
            if re.search(pattern, passenger, re.IGNORECASE):
                to_delete.add(passenger)
                break

        # Check exact matches (case insensitive)
        if passenger in noise_entries or passenger.lower() in {n.lower() for n in noise_entries}:
            to_delete.add(passenger)

        # Remove entries that are all caps and more than 2 words (likely headers)
        if passenger.isupper() and len(passenger.split()) > 2:
            to_delete.add(passenger)

        # Remove entries with only 1-2 characters
        if len(passenger.strip()) <= 2:
            to_delete.add(passenger)

    print(f"\nRemoving {len(to_delete)} noise entries...")
    print("\nSample entries being removed:")
    for i, entry in enumerate(sorted(to_delete)[:20]):
        print(f"  - {entry}")

    # Delete noise entries
    deleted_count = 0
    for passenger in to_delete:
        c.execute('DELETE FROM flight_passengers WHERE passenger_name = ?', (passenger,))
        deleted_count += c.rowcount

    conn.commit()

    # Get updated counts
    c.execute('SELECT COUNT(DISTINCT passenger_name) as unique_passengers FROM flight_passengers')
    unique_after = c.fetchone()['unique_passengers']

    c.execute('SELECT COUNT(*) as total_records FROM flight_passengers')
    total_after = c.fetchone()['total_records']

    conn.close()

    print(f"\n✅ Cleanup complete!")
    print(f"Unique passengers after cleaning: {unique_after}")
    print(f"Total passenger records after cleaning: {total_after}")
    print(f"Records deleted: {deleted_count}")

if __name__ == '__main__':
    clean_flight_passengers()
