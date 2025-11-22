"""
spaCy-based entity extraction - much better than regex!
"""
import spacy
from collections import defaultdict

# Load spaCy model (singleton)
_nlp = None

def get_nlp():
    global _nlp
    if _nlp is None:
        print("Loading spaCy model...")
        _nlp = spacy.load("en_core_web_sm")
    return _nlp

def extract_entities_spacy(text, max_length=1000000):
    """
    Extract entities using spaCy NER

    Returns dict with:
        - persons: set of person names
        - organizations: set of organization names
        - locations: set of locations (GPE + LOC)
        - dates: set of dates
        - money: set of money amounts
    """
    if not text or len(text.strip()) == 0:
        return {
            'persons': set(),
            'organizations': set(),
            'locations': set(),
            'dates': set(),
            'money': set()
        }

    nlp = get_nlp()

    # Process text (spaCy has max length limit)
    if len(text) > max_length:
        text = text[:max_length]

    doc = nlp(text)

    entities = defaultdict(set)

    for ent in doc.ents:
        # Clean up entity text
        entity_text = ent.text.strip()

        if not entity_text:
            continue

        # Map spaCy entity types to our categories
        if ent.label_ == 'PERSON':
            entities['persons'].add(entity_text)

        elif ent.label_ == 'ORG':
            entities['organizations'].add(entity_text)

        elif ent.label_ in ['GPE', 'LOC']:  # Geopolitical entity or location
            entities['locations'].add(entity_text)

        elif ent.label_ == 'DATE':
            entities['dates'].add(entity_text)

        elif ent.label_ == 'MONEY':
            entities['money'].add(entity_text)

    return {
        'persons': entities['persons'],
        'organizations': entities['organizations'],
        'locations': entities['locations'],
        'dates': entities['dates'],
        'money': entities['money']
    }

def extract_entities_batch(texts, batch_size=50):
    """Process multiple texts in batch for efficiency"""
    nlp = get_nlp()

    results = []
    for doc in nlp.pipe(texts, batch_size=batch_size):
        entities = defaultdict(set)

        for ent in doc.ents:
            entity_text = ent.text.strip()

            if not entity_text:
                continue

            if ent.label_ == 'PERSON':
                entities['persons'].add(entity_text)
            elif ent.label_ == 'ORG':
                entities['organizations'].add(entity_text)
            elif ent.label_ in ['GPE', 'LOC']:
                entities['locations'].add(entity_text)
            elif ent.label_ == 'DATE':
                entities['dates'].add(entity_text)
            elif ent.label_ == 'MONEY':
                entities['money'].add(entity_text)

        results.append({
            'persons': entities['persons'],
            'organizations': entities['organizations'],
            'locations': entities['locations'],
            'dates': entities['dates'],
            'money': entities['money']
        })

    return results

if __name__ == '__main__':
    # Test it
    test_text = """
    Jeffrey Epstein met with Ghislaine Maxwell in Manhattan on January 15, 2005.
    They discussed plans for Little St. James island.
    Prince Andrew was also mentioned in the conversation at Palm Beach.
    The meeting involved $500,000 in payments to various organizations.
    """

    entities = extract_entities_spacy(test_text)

    print("Extracted entities:")
    for entity_type, names in entities.items():
        if names:
            print(f"\n{entity_type.upper()}:")
            for name in sorted(names):
                print(f"  - {name}")
