"""
Helper script to add new proverbs to the database and regenerate embeddings
Usage:
    python add_proverbs.py
"""

import pandas as pd
import os
from config import DATA_PATH

def add_proverbs_interactive():
    """Interactive mode to add proverbs one by one"""
    df = pd.read_csv(DATA_PATH)
    
    print("=" * 70)
    print("ADD PROVERBS TO DATABASE")
    print("=" * 70)
    print("\nAvailable themes:")
    themes = df['theme'].unique()
    for i, theme in enumerate(themes, 1):
        print(f"  {i}. {theme}")
    
    new_proverbs = []
    
    while True:
        print("\n" + "-" * 70)
        proverb_telugu = input("Enter Telugu proverb (or 'quit' to finish): ").strip()
        if proverb_telugu.lower() == 'quit':
            break
        
        proverb_english = input("Enter English translation: ").strip()
        meaning = input("Enter meaning/interpretation: ").strip()
        context = input("Enter context (when/how to use): ").strip()
        keywords = input("Enter keywords (comma-separated): ").strip()
        theme = input("Enter theme (or choose from list above): ").strip()
        
        new_proverbs.append({
            "proverb_telugu": proverb_telugu,
            "proverb_english": proverb_english,
            "meaning": meaning,
            "context": context,
            "keywords": keywords,
            "theme": theme
        })
        
        print("✅ Proverb added!")
    
    if new_proverbs:
        # Append to CSV
        new_df = pd.DataFrame(new_proverbs)
        df = pd.concat([df, new_df], ignore_index=True)
        df.to_csv(DATA_PATH, index=False)
        print(f"\n✅ Added {len(new_proverbs)} proverbs to database!")
        print(f"📊 Total proverbs now: {len(df)}")
        return True
    return False


def add_proverbs_from_list(proverbs_list):
    """Add proverbs from a Python list"""
    df = pd.read_csv(DATA_PATH)
    new_df = pd.DataFrame(proverbs_list)
    df = pd.concat([df, new_df], ignore_index=True)
    df.to_csv(DATA_PATH, index=False)
    print(f"✅ Added {len(proverbs_list)} proverbs!")
    return True


def regenerate_embeddings():
    """Regenerate embeddings after adding proverbs"""
    try:
        from model import ProverbModel
        print("\n🔄 Regenerating embeddings...")
        model = ProverbModel()
        print("✅ Embeddings regenerated successfully!")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    # Option 1: Interactive mode
    added = add_proverbs_interactive()
    
    # Option 2: Add from Python list (uncomment to use)
    # new_proverbs = [
    #     {
    #         "proverb_telugu": "సాహస ఆశీస",
    #         "proverb_english": "Courage is a blessing",
    #         "meaning": "Courage and bravery bring success",
    #         "context": "When facing challenges",
    #         "keywords": "courage,bravery,confidence",
    #         "theme": "Hard Work & Perseverance"
    #     }
    # ]
    # added = add_proverbs_from_list(new_proverbs)
    
    if added:
        regenerate_embeddings()
