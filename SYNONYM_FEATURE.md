# Synonym-Based Search Feature

## Overview

Your proverb search system now includes intelligent **synonym-based search** that automatically expands user queries with related keywords to find more relevant results.

### What Was Added

#### 1. **Keyword Synonym Mapping** (`backend/data/keyword_synonyms.json`)
- Contains 10 major categories of proverbs
- Each category has primary keywords and 15-30 synonyms
- Maps every synonym to its category/categories for intelligent retrieval

**Categories Included:**
- 🟢 **Truth & Honesty** - truth, honesty, integrity, authenticity, etc.
- 🟡 **Dharma & Morality** - dharma, righteousness, ethics, virtue, justice, etc.
- 🔵 **Help & Support** - help, support, assist, aid, guidance, etc.
- 🟣 **Donation & Charity** - donate, charity, generosity, kindness, alms, etc.
- 🔴 **Hard Work** - effort, dedication, perseverance, commitment, hustle, etc.
- 🟠 **Success & Victory** - victory, achievement, triumph, accomplish, prosper, etc.
- ⚫ **Failure & Loss** - failure, defeat, setback, loss, adversity, etc.
- ⚪ **Friendship & Relationships** - friendship, bond, trust, loyalty, companion, etc.
- 🟤 **Wisdom & Knowledge** - wisdom, knowledge, learning, awareness, insight, etc.
- 🟢 **Patience** - patience, tolerance, calmness, peace, composure, serenity, etc.

#### 2. **Enhanced Model** (`backend/model.py`)

New methods added to the `ProverbModel` class:

**`expand_query_with_synonyms(query)`**
- Analyzes user query and identifies matching keywords/synonyms
- Returns enhanced query with related terms
- Returns list of related category IDs
- Example: `"generosity"` → enhancements with `["donate", "charity", "kindness", "contribution", ...]`

**`get_category_keywords(category_id)`**
- Returns all synonyms for a given category
- Useful for filtering or discovering related proverbs

**Updated `search(query)`**
- Now uses synonym expansion automatically
- Results include `related_categories` field
- Better semantic matching through enhanced queries

#### 3. **Utility Functions** (`backend/utils.py`)

New helper functions:
- **`load_synonym_mapping()`** - Loads the synonym data
- **`get_synonyms_for_keyword(keyword)`** - Gets all synonyms for a keyword
- **`get_category_for_synonym(synonym)`** - Gets category info for a synonym
- **Updated `format_cards(results)`** - Now includes related categories

#### 4. **Test Script** (`backend/test_synonyms.py`)
- Demonstrates synonym expansion for various queries
- Shows search results with synonym enhancement
- Tests synonym lookup functionality

---

## How It Works

### Example 1: Basic Synonym Search
```
User Query: "generosity"

Processing:
1. Recognized "generosity" → Category #4 (Donation & Charity)
2. Query expanded to: "generosity donate charity kindness contribution offering kindness..."
3. Embeddings search with enhanced query
4. Results include related_categories: [4]

Results Feature:
- Find proverbs about giving, charity, and donations
- Even if original proverbs use different keywords
```

### Example 2: Multiple Keywords
```
User Query: "hard work and success"

Processing:
1. "hard work" → Category #5 (Hard Work)
2. "success" → Category #6 (Success & Victory)
3. Enhanced query includes: effort, dedication, persistence, victory, achievement, triumph...
4. related_categories: [5, 6]

Results:
- Proverbs about dedication leading to success
- Proverbs connecting effort and achievement
- Better coverage of the user's intent
```

---

## Usage

### In Your Backend Routes

The search functionality works automatically through the model:

```python
from model import ProverbModel

model = ProverbModel()

# Search automatically uses synonym expansion
results = model.search("perseverance")

# Results now include related_categories
for result in results:
    print(result['proverb'])
    print(f"Related categories: {result.get('related_categories', [])}")
```

### Get Synonyms Programmatically

```python
from utils import get_synonyms_for_keyword, get_category_for_synonym

# Get all synonyms for a keyword
synonyms = get_synonyms_for_keyword("patience")
# Returns: ["patience", "tolerance", "calmness", "peace", "composure", ...]

# Get category info for a synonym
categories = get_category_for_synonym("generosity")
# Returns: [{"id": 4, "name": "Donation & Charity", "color": "🟣", ...}]
```

---

## Testing the Feature

Run the test script to see the synonym expansion in action:

```bash
cd backend
python test_synonyms.py
```

This will show:
- How queries are expanded with synonyms
- Related categories detected
- Sample search results for each test query

---

## Frontend Integration (Optional)

You can optionally display the related categories in the UI:

```javascript
// In your chat component, when displaying results:
const result = results[0];

if (result.related_categories && result.related_categories.length > 0) {
  // Show the related categories as tags/badges
  console.log("Related topics:", result.related_categories);
}
```

---

## Performance

- **No significant slowdown**: Synonym expansion happens at query time, not indexing
- **Cached embeddings**: Still uses your existing FAISS index
- **Memory efficient**: Synonym mapping is loaded once at startup

---

## Future Enhancements

You could add:
1. **Multi-language synonyms**: Extend to Telugu/Hindi/other languages
2. **User-defined categories**: Allow users to create custom synonym groups
3. **Feedback loop**: Track which synonyms lead to good results
4. **Advanced filtering**: Filter results by related categories in UI
5. **Synonym suggestions**: When user searches, suggest related keywords

---

## File Structure

```
backend/
├── data/
│   ├── proverbs.csv
│   ├── embeddings.npy
│   ├── proverbs.index
│   └── keyword_synonyms.json  ← NEW
├── model.py                    ← UPDATED (4 new methods)
├── utils.py                    ← UPDATED (3 new functions)
├── test_synonyms.py            ← NEW
└── ...
```

---

## Troubleshooting

**Q: Synonym search isn't working**
- Check that `keyword_synonyms.json` exists in `backend/data/`
- Verify JSON is valid (no syntax errors)
- Restart the Python backend to reload the synonyms

**Q: Getting "Could not load synonym mapping" warning**
- Check file path: should be `backend/data/keyword_synonyms.json`
- Verify file permissions are readable
- Check for Unicode/encoding issues

**Q: Search results seem less relevant**
- Synonym expansion is additive, not replacing original query
- If results are poor, the issue might be with embeddings quality
- Try regenerating embeddings: delete `backend/embeddings/` folder and restart

---

## Summary

The synonym feature enables more intelligent, user-friendly search by:
- ✅ Understanding user intent beyond exact keyword matching
- ✅ Automatically suggesting related proverbs
- ✅ Providing better semantic matching
- ✅ Preparing foundation for advanced filtering/recommendations

Users can now search for "generosity" and find proverbs about "donation", "charity", "kindness", etc. automatically! 🎯
