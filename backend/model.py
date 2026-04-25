import pandas as pd
import numpy as np
import faiss
import os
import json
from sentence_transformers import SentenceTransformer
from config import MODEL_NAME, DATA_PATH, TOP_K

class ProverbModel:
    def __init__(self):
        self.model = SentenceTransformer(MODEL_NAME)
        
        # Get base directory FIRST (needed for synonym mapping)
        self.base_dir = os.path.dirname(__file__)
        
        self.df = pd.read_csv(DATA_PATH)
        self.df["keywords"] = self.df.get("keywords", "").fillna("")
        self.df["context"] = self.df.get("context", "").fillna("")

        # Load synonym mapping
        self.synonym_data = self._load_synonym_mapping()
        self.synonym_to_category = self.synonym_data.get("synonym_to_category", {})
        self.categories = self.synonym_data.get("categories", [])

        # 🔥 Strong embedding text
        self.df["embedding_text"] = self.df.apply(
            lambda x: f"{x.get('proverb_telugu', '')} {x.get('proverb_english', '')} {x.get('meaning', '')} {x['context']} {x['keywords']}",
            axis=1
        )

        # Get embeddings directory
        self.embeddings_dir = os.path.join(self.base_dir, "embeddings")
        self.index_file = os.path.join(self.embeddings_dir, "proverbs.index")
        self.embeddings_file = os.path.join(self.embeddings_dir, "embeddings.npy")

        # Try to load cached embeddings
        if self._embeddings_exist():
            print("[INFO] Loading cached embeddings...")
            self._load_embeddings()
        else:
            print("[INFO] Generating new embeddings (this may take a moment)...")
            self._generate_and_save_embeddings()

    def _embeddings_exist(self):
        """Check if embeddings are cached"""
        return os.path.exists(self.index_file) and os.path.exists(self.embeddings_file)

    def _generate_and_save_embeddings(self):
        """Generate embeddings and save to disk"""
        # Reload CSV to pick up any new proverbs
        self.df = pd.read_csv(DATA_PATH)
        self.df["keywords"] = self.df.get("keywords", "").fillna("")
        self.df["context"] = self.df.get("context", "").fillna("")
        
        # Recreate embedding text
        self.df["embedding_text"] = self.df.apply(
            lambda x: f"{x.get('proverb_telugu', '')} {x.get('proverb_english', '')} {x.get('meaning', '')} {x['context']} {x['keywords']}",
            axis=1
        )
        
        embeddings = self.model.encode(
            self.df["embedding_text"].tolist(),
            normalize_embeddings=True,
            convert_to_numpy=True,
        )

        embeddings = embeddings.astype("float32")
        
        # Create embeddings directory if it doesn't exist
        os.makedirs(self.embeddings_dir, exist_ok=True)
        
        # Save embeddings
        np.save(self.embeddings_file, embeddings)
        
        # Create and save FAISS index
        self.index = faiss.IndexFlatIP(embeddings.shape[1])
        self.index.add(embeddings)
        faiss.write_index(self.index, self.index_file)
        
        print(f"[INFO] Embeddings saved to {self.embeddings_dir} ({len(self.df)} proverbs)")

    def _load_embeddings(self):
        """Load cached embeddings from disk"""
        # Load FAISS index
        self.index = faiss.read_index(self.index_file)
        
        # Load embeddings (for reference)
        embeddings = np.load(self.embeddings_file)
        
        print(f"[INFO] Embeddings loaded from {self.embeddings_dir} ({embeddings.shape[0]} vectors)")

    def _load_synonym_mapping(self):
        """Load keyword synonym mapping from JSON file"""
        synonym_file = os.path.join(self.base_dir, "data", "keyword_synonyms.json")
        try:
            with open(synonym_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                print(f"[INFO] Loaded synonym mapping with {len(data.get('categories', []))} categories")
                return data
        except Exception as e:
            print(f"[WARNING] Could not load synonym mapping: {e}")
            return {"categories": [], "synonym_to_category": {}}

    def clear_embeddings_cache(self):
        """Clear cached embeddings (forces regeneration on next restart)"""
        if os.path.exists(self.index_file):
            os.remove(self.index_file)
        if os.path.exists(self.embeddings_file):
            os.remove(self.embeddings_file)
        print(f"[INFO] Embeddings cache cleared")

    def expand_query_with_synonyms(self, query):
        """
        Expand user query with related synonyms and keywords.
        Returns enhanced query text and related categories.
        """
        query_lower = query.lower().strip()
        if not query_lower:
            return query, []
        
        # Split query into words
        words = query_lower.split()
        related_categories = set()
        expanded_terms = [query_lower]
        
        # Check each word against synonym mapping
        for word in words:
            if word in self.synonym_to_category:
                category_ids = self.synonym_to_category[word]
                if isinstance(category_ids, list):
                    related_categories.update(category_ids)
                else:
                    related_categories.add(category_ids)
                
                # Add synonyms from the category
                for cat_id in (category_ids if isinstance(category_ids, list) else [category_ids]):
                    for category in self.categories:
                        if category['id'] == cat_id:
                            # Add all synonyms from this category
                            expanded_terms.extend(category['synonyms'][:5])  # Limit to 5 synonyms per category
                            break
        
        # Create enhanced query
        enhanced_query = " ".join(set(expanded_terms[:20]))  # Limit to 20 terms
        
        print(f"[SEARCH] Original: '{query}' | Enhanced: '{enhanced_query[:100]}...'")
        print(f"[SEARCH] Related categories: {list(related_categories)}")
        
        return enhanced_query, list(related_categories)

    def get_category_keywords(self, category_id):
        """Get all synonyms for a given category ID"""
        for category in self.categories:
            if category['id'] == category_id:
                return category['synonyms']
        return []

    def search(self, query):
        query_text = query.strip()
        if not query_text:
            return []

        # Expand query with synonyms
        enhanced_query, related_categories = self.expand_query_with_synonyms(query_text)
        
        # Use enhanced query for embedding
        q_vec = self.model.encode([enhanced_query], normalize_embeddings=True, convert_to_numpy=True)
        q_vec = q_vec.astype("float32")

        D, I = self.index.search(q_vec, TOP_K)

        results = []
        for idx, score in zip(I[0], D[0]):
            row = self.df.iloc[idx]
            results.append({
                "proverb": row.get("proverb_telugu", ""),
                "proverb_english": row.get("proverb_english", ""),
                "meaning": row.get("meaning", ""),
                "context": row.get("context", ""),
                "keywords": row.get("keywords", ""),
                "theme": row.get("theme", ""),
                "score": float(score),
                "related_categories": related_categories
            })

        return results
    def filter_by_theme(self, themes):
        """Filter proverbs by theme/category - accepts list of theme names"""
        if isinstance(themes, str):
            themes = [themes]
        
        print(f"[MODEL DEBUG] filter_by_theme called with themes: {themes}")
        print(f"[MODEL DEBUG] DataFrame shape: {self.df.shape}")
        print(f"[MODEL DEBUG] Theme column sample: {self.df['theme'].head().tolist() if 'theme' in self.df.columns else 'COLUMN NOT FOUND'}")
        
        # Filter where theme matches any of the provided themes
        filtered = self.df[self.df["theme"].isin(themes)]
        
        print(f"[MODEL DEBUG] Filtered results: {len(filtered)} rows")
        
        if filtered.empty:
            return []
        
        results = []
        for _, row in filtered.iterrows():
            results.append({
                "proverb": row.get("proverb_telugu", ""),
                "proverb_english": row.get("proverb_english", ""),
                "meaning": row.get("meaning", ""),
                "context": row.get("context", ""),
                "keywords": row.get("keywords", ""),
                "theme": row.get("theme", ""),
                "score": 1.0
            })
        
        return results[:TOP_K]
