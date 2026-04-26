from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from model import ProverbModel
from session import get_session
from utils import format_cards, format_explanation
from config import ADMIN_EMAIL, ADMIN_PASSWORD, FRONTEND_ORIGINS, GOOGLE_CLIENT_ID
from db import store_vote, get_downvoted_proverbs, get_upvoted_proverbs, add_proverb, get_all_proverbs, bulk_insert_proverbs, get_analytics, check_duplicate_proverb_by_fields, submit_annotation, get_pending_annotations, approve_annotation, reject_annotation, get_annotator_stats, get_annotation_history, get_repository_proverbs, delete_proverb, upsert_user_auth
import csv
from io import StringIO
from indic_transliteration.sanscript import transliterate, TELUGU, ITRANS

app = FastAPI()
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    *FRONTEND_ORIGINS,
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
model = ProverbModel()

class Query(BaseModel):
    message: str
    user_id: str = "default"

class LoginRequest(BaseModel):
    email: str
    password: str

class VoteRequest(BaseModel):
    user_id: str
    proverb_id: str
    keyword: str
    vote_type: str

class SearchRequest(BaseModel):
    query: str
    user_id: Optional[str] = None

class ProverbRequest(BaseModel):
    proverb_telugu: str
    proverb_english: str
    meaning: str
    keywords: str
    theme: str
    context: str

class CSVUploadRequest(BaseModel):
    csv_data: str

class VerifyRequest(BaseModel):
    value: str

class AnnotationRequest(BaseModel):
    user_id: str
    proverb_telugu: str
    proverb_english: str
    meaning: str
    keywords: str
    context_meaning: str = ""


class GoogleAuthRequest(BaseModel):
    credential: str


def _normalize_csv_header(header: str) -> str:
    """Normalize CSV headers so we can support multiple naming styles."""
    return (header or "").strip().lstrip("\ufeff").lower().replace("-", "_").replace(" ", "_")


def _normalize_csv_row(row: dict) -> dict:
    """Return a normalized row dict with stable header keys."""
    normalized = {}
    for key, value in (row or {}).items():
        normalized[_normalize_csv_header(key)] = (value or "").strip()
    return normalized


def _get_csv_value(row: dict, aliases: list[str]) -> str:
    """Get first non-empty value from normalized CSV row by alias list."""
    for alias in aliases:
        value = row.get(alias, "")
        if value:
            return value.strip()
    return ""


def get_result_proverb_id(result: dict, fallback_index: int) -> str:
    return (
        str(result.get("_id"))
        if result.get("_id")
        else result.get("proverb_english")
        or result.get("proverb")
        or result.get("title")
        or str(fallback_index)
    )


def apply_vote_preferences(results: list, user_id: str | None, keyword: str) -> list:
    if not user_id:
        return [{**result, "id": get_result_proverb_id(result, index)} for index, result in enumerate(results)]

    normalized_keyword = keyword.strip().lower()
    downvoted_ids = set(get_downvoted_proverbs(user_id, normalized_keyword))
    upvoted_ids = set(get_upvoted_proverbs(user_id, normalized_keyword))

    upvoted_results = []
    regular_results = []

    for index, result in enumerate(results):
        proverb_id = get_result_proverb_id(result, index)
        user_vote = "upvote" if proverb_id in upvoted_ids else None
        enriched_result = {**result, "id": proverb_id, "user_vote": user_vote}

        if proverb_id in downvoted_ids:
            continue

        if proverb_id in upvoted_ids:
            upvoted_results.append(enriched_result)
        else:
            regular_results.append(enriched_result)

    final_results = upvoted_results + regular_results
    print(f"[VOTING] keyword='{normalized_keyword}' downvoted={len(downvoted_ids)} upvoted={len(upvoted_ids)} final={len(final_results)}")
    return final_results


@app.post("/login")
def login(req: LoginRequest):
    """
    Login endpoint supporting both admin and normal users
    Admin credentials are configured via ADMIN_EMAIL / ADMIN_PASSWORD env vars.
    Normal users: Any email/password (or integrate Supabase)
    """
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    # Check if admin
    if req.email == ADMIN_EMAIL and req.password == ADMIN_PASSWORD:
        upsert_user_auth(email=req.email, provider="local", role="admin")
        return {
            "success": True,
            "role": "admin",
            "email": req.email,
            "token": f"admin-token-{req.email}",
            "user_id": req.email
        }
    
    # Normal user login (simplified)
    upsert_user_auth(email=req.email, provider="local", role="user")
    return {
        "success": True,
        "role": "user",
        "email": req.email,
        "token": f"user-token-{req.email}",
        "user_id": req.email  # Use email as user_id
    }


@app.post("/auth/google")
def google_auth(req: GoogleAuthRequest):
    """Authenticate user with Google ID token and store user profile in MongoDB."""
    if not req.credential:
        raise HTTPException(status_code=400, detail="Google credential is required")

    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        payload = id_token.verify_oauth2_token(
            req.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google account email is unavailable")

        role = "admin" if email == ADMIN_EMAIL else "user"
        user = upsert_user_auth(
            email=email,
            provider="google",
            name=payload.get("name", ""),
            picture=payload.get("picture", ""),
            role=role,
            google_sub=payload.get("sub", "")
        )

        return {
            "success": True,
            "role": role,
            "email": email,
            "token": f"{role}-token-{email}",
            "user_id": email,
            "name": payload.get("name", ""),
            "picture": payload.get("picture", ""),
            "provider": "google",
            "profile": user or {}
        }
    except ImportError:
        raise HTTPException(status_code=500, detail="Google auth dependency is missing. Install google-auth.")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")


@app.post("/vote")
def vote(req: VoteRequest):
    """
    Store user vote (upvote/downvote)
    """
    if not req.user_id or not req.proverb_id or not req.vote_type:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if req.vote_type not in ["upvote", "downvote"]:
        raise HTTPException(status_code=400, detail="Invalid vote_type")
    
    success = store_vote(req.user_id, req.proverb_id, req.keyword.strip().lower(), req.vote_type)
    
    if success:
        return {"success": True, "message": f"Vote recorded: {req.vote_type}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to record vote")


@app.post("/regenerate-embeddings")
def regenerate_embeddings():
    """Regenerate embeddings from CSV (call after adding new proverbs)"""
    try:
        print("[API] Regenerating embeddings...")
        model.clear_embeddings_cache()
        model._generate_and_save_embeddings()
        return {"status": "success", "message": "Embeddings regenerated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate embeddings: {str(e)}")


@app.post("/chat")
def chat(query: Query):
    user_input = query.message.strip().lower()
    session = get_session(query.user_id)

    # Keyword to theme mapping
    THEME_MAPPING = {
        "truth": ["Truth & Honesty"],
        "honesty": ["Truth & Honesty"],
        "dharma": ["Dharma & Morality"],
        "morality": ["Dharma & Morality"],
        "peace": ["Peace & Patience"],
        "patience": ["Peace & Patience"],
        "knowledge": ["Knowledge & Wisdom"],
        "wisdom": ["Knowledge & Wisdom"],
        "hard work": ["Hard Work & Perseverance"],
        "perseverance": ["Hard Work & Perseverance"],
        "friendship": ["Friendship & Loyalty"],
        "loyalty": ["Friendship & Loyalty"],
        "greed": ["Greed & Materialism"],
        "deception": ["Deception & Betrayal"],
        "betrayal": ["Deception & Betrayal"],
    }

    try:
        # ?? MORE RESULTS
        if user_input == "more":
            start = session["offset"]
            end = start + 5
            more_results = session["last_results"][start:end]
            session["offset"] = min(len(session["last_results"]), end)
            return {"type": "cards", "data": format_cards(more_results)}

        # ?? EXPLAIN - REMOVED (no AI calls anymore)
        if user_input.startswith("explain"):
            raise HTTPException(status_code=400, detail="Explain feature has been disabled")

        # ?? SEARCH
        matched_themes = []
        for keyword, themes in THEME_MAPPING.items():
            if keyword in user_input:
                matched_themes.extend(themes)
                print(f"[DEBUG] Matched keyword '{keyword}' to themes: {themes}")
                break

        if matched_themes:
            print(f"[DEBUG] Theme search with themes: {matched_themes}")
            results = model.filter_by_theme(matched_themes)
            search_keyword = [k for k, v in THEME_MAPPING.items() if v == matched_themes][0]
        else:
            print(f"[DEBUG] Semantic search for: {user_input}")
            results = model.search(query.message)
            search_keyword = user_input

        final_results = apply_vote_preferences(results, query.user_id, search_keyword)

        session["last_results"] = final_results
        session["offset"] = min(len(final_results), 5)
        return {"type": "cards", "data": format_cards(final_results[:5])}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/admin/add-proverb")
def admin_add_proverb(req: ProverbRequest, token: str = None):
    """Add a new proverb (admin only)"""
    # TODO: Verify admin token
    try:
        proverb_data = {
            "proverb_telugu": req.proverb_telugu,
            "proverb_english": req.proverb_english,
            "meaning": req.meaning,
            "keywords": req.keywords,
            "theme": req.theme,
            "context": req.context
        }
        
        proverb_id = add_proverb(proverb_data)
        
        if proverb_id:
            # Regenerate embeddings for new data
            model.clear_embeddings_cache()
            model._generate_and_save_embeddings()
            
            return {"success": True, "proverb_id": proverb_id, "message": "Proverb added and embeddings updated"}
        else:
            raise HTTPException(status_code=500, detail="Failed to add proverb")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/upload-csv")
def admin_upload_csv(req: CSVUploadRequest, token: str = None):
    """
    Upload CSV file with proverbs (admin only)
    Expected columns: proverb_telugu, proverb_english, meaning, keywords, theme, context
    """
    # TODO: Verify admin token
    try:
        csv_file = StringIO(req.csv_data)
        reader = csv.DictReader(csv_file)

        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV header row is missing.")

        proverbs = []
        skipped_empty = 0
        for raw_row in reader:
            row = _normalize_csv_row(raw_row)
            proverb_telugu = _get_csv_value(row, ["proverb_telugu", "telugu", "proverb"])
            proverb_english = _get_csv_value(row, ["proverb_english", "english", "translation"])
            meaning = _get_csv_value(row, ["meaning", "explanation"])
            keywords = _get_csv_value(row, ["keywords", "keyword", "tags"])
            theme = _get_csv_value(row, ["theme", "category"])
            context = _get_csv_value(row, ["context", "context_meaning"])

            # Avoid storing blank placeholder records.
            if not proverb_telugu and not proverb_english and not meaning and not keywords:
                skipped_empty += 1
                continue

            proverbs.append({
                "proverb_telugu": proverb_telugu,
                "proverb_english": proverb_english,
                "meaning": meaning,
                "keywords": keywords,
                "theme": theme,
                "context": context
            })
        
        result = bulk_insert_proverbs(proverbs)
        
        # Regenerate embeddings
        model.clear_embeddings_cache()
        model._generate_and_save_embeddings()
        
        return {
            "success": True,
            "inserted": result["inserted"],
            "skipped": result["skipped"] + skipped_empty,
            "message": "Proverbs uploaded and embeddings updated"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics")
def analytics():
    """Get analytics data"""
    try:
        data = get_analytics()
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/verify")
def verify(req: VerifyRequest):
    """
    Verify if proverb exists by checking both Telugu and English transliterations.
    Similar to Flask's /verify endpoint.
    """
    try:
        value = req.value.strip()
        
        if not value:
            return {
                "status": "error",
                "message": "Empty value provided"
            }
        
        # Detect Telugu characters
        is_telugu = any('\u0C00' <= c <= '\u0C7F' for c in value)
        
        print(f"[Verify] Input: {value[:30]}..., Is Telugu: {is_telugu}")
        
        try:
            if is_telugu:
                telugu = value
                roman = transliterate(value, TELUGU, ITRANS).lower()
                print(f"[Verify] Transliterated: {roman}")
            else:
                roman = value.lower()
                telugu = transliterate(value, ITRANS, TELUGU)
                print(f"[Verify] Transliterated: telugu={telugu[:30]}")
        except Exception as trans_err:
            print(f"[Verify] Transliteration error: {str(trans_err)}")
            return {
                "status": "error",
                "message": f"Transliteration failed: {str(trans_err)}"
            }
        
        # Check if exists in MongoDB
        existing = check_duplicate_proverb_by_fields(proverb_telugu=telugu, proverb_english=roman)
        
        if existing:
            # Convert MongoDB ObjectId to string for JSON serialization
            result = {
                "status": "exists",
                "telugu": existing.get("proverb_telugu", ""),
                "english": existing.get("proverb_english", ""),
                "meaning": existing.get("meaning", ""),
                "keywords": existing.get("keywords", ""),
                "context": existing.get("context", "")
            }
            print(f"[Verify] Found existing proverb")
            return result
        
        result = {
            "status": "new",
            "telugu": telugu,
            "english": roman
        }
        print(f"[Verify] No duplicate found")
        return result
        
    except Exception as e:
        print(f"[Verify] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@app.post("/annotate/submit")
def submit_user_annotation(req: AnnotationRequest):
    """
    User submits a new proverb annotation for admin review
    """
    try:
        if not req.user_id or not req.proverb_telugu or not req.proverb_english:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        result = submit_annotation(
            user_id=req.user_id,
            proverb_telugu=req.proverb_telugu,
            proverb_english=req.proverb_english,
            meaning=req.meaning,
            keywords=req.keywords,
            context_meaning=req.context_meaning
        )
        
        if result["success"]:
            return {"success": True, "message": "Proverb submitted for approval", "id": result.get("id")}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to submit"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/pending-annotations")
def get_pending(role: str = None):
    """Get all pending annotations for admin review"""
    try:
        if role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        pending = get_pending_annotations()
        # Convert ObjectId to string for JSON serialization
        for p in pending:
            if "_id" in p:
                p["_id"] = str(p["_id"])
        return {
            "success": True,
            "count": len(pending),
            "data": pending
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/approve-annotation/{annotation_id}")
def approve_ann(annotation_id: str):
    """Admin approves an annotation"""
    try:
        result = approve_annotation(annotation_id)
        if result["success"]:
            model.clear_embeddings_cache()
            model._generate_and_save_embeddings()
            return {"success": True, "message": "Annotation approved"}
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/reject-annotation/{annotation_id}")
def reject_ann(annotation_id: str):
    """Admin rejects an annotation"""
    try:
        result = reject_annotation(annotation_id)
        if result["success"]:
            return {"success": True, "message": "Annotation rejected"}
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/annotators-stats")
def get_annotators_stats():
    """Get statistics for all annotators"""
    try:
        stats = get_annotator_stats()
        # Convert ObjectId to string for JSON serialization
        for s in stats:
            if "_id" in s:
                s["_id"] = str(s["_id"])
        return {
            "success": True,
            "count": len(stats),
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/history")
def get_history(status: str = None):
    """Get history of approved/rejected annotations"""
    try:
        history = get_annotation_history(status)
        # Convert ObjectId to string for JSON serialization
        for h in history:
            if "_id" in h:
                h["_id"] = str(h["_id"])
        return {
            "success": True,
            "count": len(history),
            "data": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/repository")
def get_repository(search: str = None):
    """Get all proverbs from repository"""
    try:
        proverbs = get_repository_proverbs(search)
        # Convert ObjectId to string for JSON serialization
        for p in proverbs:
            if "_id" in p:
                p["_id"] = str(p["_id"])
        return {
            "success": True,
            "count": len(proverbs),
            "data": proverbs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/admin/delete-proverb/{proverb_id}")
def delete_proverb_endpoint(proverb_id: str):
    """Delete a proverb from repository"""
    try:
        result = delete_proverb(proverb_id)
        if result["success"]:
            return {
                "success": True,
                "message": result["message"]
            }
        else:
            raise HTTPException(status_code=404, detail=result["error"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# User Dashboard Endpoints
@app.get("/proverbs")
def get_user_proverbs():
    """Get all proverbs for user dashboard"""
    try:
        proverbs = get_all_proverbs()
        for p in proverbs:
            if "_id" in p:
                p["_id"] = str(p["_id"])
        return {
            "success": True,
            "count": len(proverbs),
            "data": proverbs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search")
def search_proverbs(query: str, user_id: str = None):
    """Search proverbs by keyword or text"""
    if not query or len(query) < 2:
        return {"success": False, "data": [], "count": 0}
    
    try:
        results = model.search(query)
        final_results = apply_vote_preferences(results, user_id, query)
        for r in final_results:
            if "_id" in r:
                r["_id"] = str(r["_id"])
        return {
            "success": True,
            "count": len(final_results),
            "data": final_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/favorites")
def add_favorite(req: BaseModel):
    """Add proverb to user's favorites"""
    try:
        return {
            "success": True,
            "message": "Added to favorites"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/favorites")
def get_favorites(user_id: str):
    """Get user's favorite proverbs"""
    try:
        # For now, return all proverbs (you can modify this to filter by user in MongoDB)
        proverbs = get_all_proverbs()
        for p in proverbs:
            if "_id" in p:
                p["_id"] = str(p["_id"])
        return {
            "success": True,
            "count": len(proverbs),
            "data": proverbs[:10]  # Return first 10 as samples
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/feedback")
def submit_user_feedback(feedback_data: dict):
    """Submit feedback/rating for a proverb"""
    try:
        return {
            "success": True,
            "message": "Feedback submitted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
