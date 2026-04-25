#!/usr/bin/env python3
"""
Test script to demonstrate synonym-based search functionality
"""

from model import ProverbModel
from utils import get_synonyms_for_keyword, get_category_for_synonym

def test_synonym_search():
    """Test the synonym search feature"""
    
    print("=" * 70)
    print("SYNONYM-BASED SEARCH TEST")
    print("=" * 70)
    
    # Initialize model
    model = ProverbModel()
    
    # Test queries with different synonyms
    test_queries = [
        "generosity",           # Synonym for "donation"
        "perseverance",         # Synonym for "hard work"
        "peacefulfulness",      # Synonym for "peace" / "patience"
        "selfless giving",      # Multiple keywords
        "triumphant",           # Synonym for "victory"
    ]
    
    print("\n📚 Testing Synonym Expansion:\n")
    
    for query in test_queries:
        print(f"\n{'─' * 70}")
        print(f"Query: '{query}'")
        print(f"{'─' * 70}")
        
        # Test synonym lookup
        enhanced, categories = model.expand_query_with_synonyms(query)
        print(f"✓ Enhanced Query: {enhanced[:100]}...")
        print(f"✓ Related Category IDs: {categories}")
        
        # Get category names
        if categories:
            for cat_id in categories:
                for cat in model.categories:
                    if cat['id'] == cat_id:
                        print(f"  → {cat['color']} {cat['name']}")
                        break
        
        # Search with the query
        print(f"\n🔍 Search Results:")
        results = model.search(query)
        
        for i, result in enumerate(results[:3], 1):
            print(f"\n  {i}. {result['proverb']}")
            print(f"     English: {result['proverb_english']}")
            print(f"     Score: {result['score']:.4f}")
            print(f"     Theme: {result['theme']}")
    
    print("\n" + "=" * 70)
    print("✓ Test completed successfully!")
    print("=" * 70)


def test_get_synonyms():
    """Test getting synonyms for specific keywords"""
    
    print("\n" + "=" * 70)
    print("SYNONYM LOOKUP TEST")
    print("=" * 70)
    
    test_keywords = [
        "generosity",
        "patience",
        "friendship",
        "hard work",
        "truth"
    ]
    
    print("\n📖 Synonyms for each keyword:\n")
    
    for keyword in test_keywords:
        synonyms = get_synonyms_for_keyword(keyword)
        categories = get_category_for_synonym(keyword)
        
        print(f"\n🔹 '{keyword}':")
        if categories:
            for cat in categories:
                print(f"   Category: {cat['color']} {cat['name']}")
        
        if synonyms:
            print(f"   Synonyms: {', '.join(synonyms[:8])}")
        else:
            print(f"   No synonyms found in mapping")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    # Run tests
    test_synonym_search()
    test_get_synonyms()
    
    print("\n✅ All tests completed!")
