import json
import os
from typing import Any

import pandas as pd

from config import DATA_PATH, MODEL_NAME, TOP_K, USE_EMBEDDINGS


class ProverbModel:
    def __init__(self):
        self.base_dir = os.path.dirname(__file__)
        self.use_embeddings = USE_EMBEDDINGS
        self.model = None
        self.index = None
        self.faiss = None

        self.embeddings_dir = os.path.join(self.base_dir, "embeddings")
        self.index_file = os.path.join(self.embeddings_dir, "proverbs.index")
        self.embeddings_file = os.path.join(self.embeddings_dir, "embeddings.npy")

        self._load_data()

        self.synonym_data = self._load_synonym_mapping()
        self.synonym_to_category = self.synonym_data.get("synonym_to_category", {})
        self.categories = self.synonym_data.get("categories", [])

        if self.use_embeddings:
            self._init_embedding_stack()
        else:
            print("[INFO] Running in lightweight search mode (no embeddings).")

    def _load_data(self):
        self.df = pd.read_csv(DATA_PATH)
        self.df["keywords"] = self.df.get("keywords", "").fillna("")
        self.df["context"] = self.df.get("context", "").fillna("")
        self.df["search_text"] = self.df.apply(
            lambda x: (
                f"{x.get('proverb_telugu', '')} "
                f"{x.get('proverb_english', '')} "
                f"{x.get('meaning', '')} "
                f"{x.get('context', '')} "
                f"{x.get('keywords', '')} "
                f"{x.get('theme', '')}"
            ).lower(),
            axis=1,
        )
        self.df["embedding_text"] = self.df.apply(
            lambda x: (
                f"{x.get('proverb_telugu', '')} "
                f"{x.get('proverb_english', '')} "
                f"{x.get('meaning', '')} "
                f"{x.get('context', '')} "
                f"{x.get('keywords', '')}"
            ),
            axis=1,
        )

    def _init_embedding_stack(self):
        try:
            import numpy as np
            import faiss
            from sentence_transformers import SentenceTransformer

            self.np = np
            self.faiss = faiss
            self.model = SentenceTransformer(MODEL_NAME)

            if self._embeddings_exist():
                print("[INFO] Loading cached embeddings...")
                self._load_embeddings()
            else:
                print("[INFO] Generating embeddings...")
                self._generate_and_save_embeddings()
        except Exception as exc:
            self.use_embeddings = False
            self.model = None
            self.index = None
            self.faiss = None
            print(f"[WARNING] Embeddings disabled due to init failure: {exc}")
            print("[INFO] Falling back to lightweight search mode.")

    def _embeddings_exist(self):
        return os.path.exists(self.index_file) and os.path.exists(self.embeddings_file)

    def _generate_and_save_embeddings(self):
        if not self.use_embeddings or self.model is None or self.faiss is None:
            print("[INFO] Embedding generation skipped (lightweight mode).")
            return

        self._load_data()

        embeddings = self.model.encode(
            self.df["embedding_text"].tolist(),
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).astype("float32")

        os.makedirs(self.embeddings_dir, exist_ok=True)
        self.np.save(self.embeddings_file, embeddings)

        self.index = self.faiss.IndexFlatIP(embeddings.shape[1])
        self.index.add(embeddings)
        self.faiss.write_index(self.index, self.index_file)
        print(f"[INFO] Embeddings saved ({len(self.df)} proverbs)")

    def _load_embeddings(self):
        if not self.use_embeddings or self.faiss is None:
            print("[INFO] Embedding load skipped (lightweight mode).")
            return

        self.index = self.faiss.read_index(self.index_file)
        embeddings = self.np.load(self.embeddings_file)
        print(f"[INFO] Embeddings loaded ({embeddings.shape[0]} vectors)")

    def _load_synonym_mapping(self):
        synonym_file = os.path.join(self.base_dir, "data", "keyword_synonyms.json")
        try:
            with open(synonym_file, "r", encoding="utf-8") as file:
                data = json.load(file)
            print(f"[INFO] Loaded synonym mapping with {len(data.get('categories', []))} categories")
            return data
        except Exception as exc:
            print(f"[WARNING] Could not load synonym mapping: {exc}")
            return {"categories": [], "synonym_to_category": {}}

    def clear_embeddings_cache(self):
        if os.path.exists(self.index_file):
            os.remove(self.index_file)
        if os.path.exists(self.embeddings_file):
            os.remove(self.embeddings_file)
        print("[INFO] Embeddings cache cleared")

    def expand_query_with_synonyms(self, query: str):
        query_lower = query.lower().strip()
        if not query_lower:
            return query, []

        words = query_lower.split()
        related_categories = set()
        expanded_terms = [query_lower]

        for word in words:
            if word in self.synonym_to_category:
                category_ids = self.synonym_to_category[word]
                if isinstance(category_ids, list):
                    related_categories.update(category_ids)
                else:
                    related_categories.add(category_ids)

                for cat_id in (category_ids if isinstance(category_ids, list) else [category_ids]):
                    for category in self.categories:
                        if category["id"] == cat_id:
                            expanded_terms.extend(category["synonyms"][:5])
                            break

        enhanced_query = " ".join(set(expanded_terms[:20]))
        return enhanced_query, list(related_categories)

    def _build_result(self, row: Any, score: float, related_categories=None):
        return {
            "proverb": row.get("proverb_telugu", ""),
            "proverb_english": row.get("proverb_english", ""),
            "meaning": row.get("meaning", ""),
            "context": row.get("context", ""),
            "keywords": row.get("keywords", ""),
            "theme": row.get("theme", ""),
            "score": float(score),
            "related_categories": related_categories or [],
        }

    def _search_with_embeddings(self, enhanced_query: str, related_categories: list[str]):
        q_vec = self.model.encode([enhanced_query], normalize_embeddings=True, convert_to_numpy=True).astype("float32")
        distances, indices = self.index.search(q_vec, TOP_K)

        results = []
        for idx, score in zip(indices[0], distances[0]):
            row = self.df.iloc[idx]
            results.append(self._build_result(row, score, related_categories))
        return results

    def _search_lightweight(self, enhanced_query: str, related_categories: list[str]):
        terms = [t for t in enhanced_query.lower().split() if t]
        query_phrase = enhanced_query.lower().strip()

        scored = []
        for _, row in self.df.iterrows():
            text = row.get("search_text", "")
            if not text:
                continue

            term_hits = sum(1 for term in terms if term in text)
            if term_hits == 0 and query_phrase not in text:
                continue

            phrase_bonus = 2 if query_phrase and query_phrase in text else 0
            score = term_hits + phrase_bonus
            scored.append((score, row))

        scored.sort(key=lambda item: item[0], reverse=True)
        return [self._build_result(row, score, related_categories) for score, row in scored[:TOP_K]]

    def search(self, query: str):
        query_text = query.strip()
        if not query_text:
            return []

        enhanced_query, related_categories = self.expand_query_with_synonyms(query_text)
        self._load_data()

        if self.use_embeddings and self.model is not None and self.index is not None:
            return self._search_with_embeddings(enhanced_query, related_categories)
        return self._search_lightweight(enhanced_query, related_categories)

    def filter_by_theme(self, themes):
        if isinstance(themes, str):
            themes = [themes]

        filtered = self.df[self.df["theme"].isin(themes)]
        if filtered.empty:
            return []

        results = []
        for _, row in filtered.iterrows():
            results.append(
                {
                    "proverb": row.get("proverb_telugu", ""),
                    "proverb_english": row.get("proverb_english", ""),
                    "meaning": row.get("meaning", ""),
                    "context": row.get("context", ""),
                    "keywords": row.get("keywords", ""),
                    "theme": row.get("theme", ""),
                    "score": 1.0,
                }
            )
        return results[:TOP_K]
