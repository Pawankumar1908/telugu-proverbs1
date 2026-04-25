import json
import os


def load_synonym_mapping():
    """Load the keyword synonym mapping"""
    try:
        synonym_file = os.path.join(os.path.dirname(__file__), "data", "keyword_synonyms.json")
        with open(synonym_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[WARNING] Could not load synonym mapping: {e}")
        return {"categories": [], "synonym_to_category": {}}


def get_synonyms_for_keyword(keyword):
    """Get all synonyms for a given keyword"""
    synonym_data = load_synonym_mapping()
    synonym_to_category = synonym_data.get("synonym_to_category", {})
    categories = synonym_data.get("categories", [])
    
    keyword_lower = keyword.lower().strip()
    category_ids = synonym_to_category.get(keyword_lower, [])
    
    if not isinstance(category_ids, list):
        category_ids = [category_ids]
    
    synonyms = []
    for cat_id in category_ids:
        for category in categories:
            if category['id'] == cat_id:
                synonyms.extend(category['synonyms'])
                break
    
    return list(set(synonyms))  # Remove duplicates


def get_category_for_synonym(synonym):
    """Get the category information for a given synonym"""
    synonym_data = load_synonym_mapping()
    synonym_to_category = synonym_data.get("synonym_to_category", {})
    categories = synonym_data.get("categories", [])
    
    synonym_lower = synonym.lower().strip()
    category_ids = synonym_to_category.get(synonym_lower, [])
    
    if not isinstance(category_ids, list):
        category_ids = [category_ids]
    
    result = []
    for cat_id in category_ids:
        for category in categories:
            if category['id'] == cat_id:
                result.append(category)
                break
    
    return result


def format_cards(results):
    cards = []
    for r in results:
        card = {
            "proverb": r.get("proverb", ""),
            "proverb_english": r.get("proverb_english", ""),
            "meaning": r.get("meaning", ""),
            "context": r.get("context", ""),
            "score": round(r.get("score", 0.0), 2),
            "keywords": r.get("keywords", ""),
            "theme": r.get("theme", "")
        }
        
        # Add related categories if available
        if "related_categories" in r:
            card["related_categories"] = r.get("related_categories", [])
        
        cards.append(card)
    return cards


def format_explanation(proverb, gemini_text=None):
    if gemini_text:
        # Format the Gemini explanation with better structure
        text = gemini_text.strip()
        # Replace ### with line breaks and formatting
        text = text.replace('###', '\n\n**')
        if '\n\n**' in text:
            text = text.replace('**', '**', 1) + '**' if text.count('**') % 2 == 1 else text
        # Clean up multiple line breaks
        while '\n\n\n' in text:
            text = text.replace('\n\n\n', '\n\n')
        return text

    return f"{proverb.get('proverb', '')}\n\nMeaning: {proverb.get('meaning', '')}\n\nContext: {proverb.get('context', '')}"
