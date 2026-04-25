"""
MongoDB utility functions for user feedback and admin operations
"""

from pymongo import MongoClient
from config import MONGODB_URI, MONGODB_DB
from datetime import datetime
from bson.objectid import ObjectId

# Global client (initialize on first use)
_client = None
_db = None

def get_db():
    """Get MongoDB database connection"""
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGODB_URI)
        _db = _client[MONGODB_DB]
        print(f"[MongoDB] Connected to {MONGODB_DB}")
    return _db

def close_db():
    """Close MongoDB connection"""
    global _client
    if _client:
        _client.close()
        print("[MongoDB] Connection closed")

def store_vote(user_id: str, proverb_id: str, keyword: str, vote_type: str):
    """
    Store user vote (upvote/downvote)
    
    Args:
        user_id: User ID
        proverb_id: Proverb ID or index
        keyword: Keyword searched
        vote_type: "upvote" or "downvote"
    """
    try:
        db = get_db()
        collection = db["user_feedback"]
        
        # Check if vote already exists
        existing = collection.find_one({
            "user_id": user_id,
            "proverb_id": proverb_id,
            "keyword": keyword
        })
        
        if existing:
            # Update existing vote
            collection.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "vote_type": vote_type,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        else:
            # Insert new vote
            collection.insert_one({
                "user_id": user_id,
                "proverb_id": proverb_id,
                "keyword": keyword,
                "vote_type": vote_type,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
        
        print(f"[Vote stored] user={user_id}, proverb={proverb_id}, vote={vote_type}")
        return True
    except Exception as e:
        print(f"[Vote error] {str(e)}")
        return False

def get_downvoted_proverbs(user_id: str, keyword: str) -> list:
    """Get all downvoted proverb IDs for user and keyword"""
    try:
        db = get_db()
        collection = db["user_feedback"]
        
        results = collection.find({
            "user_id": user_id,
            "keyword": keyword,
            "vote_type": "downvote"
        })
        
        downvoted = [str(r["proverb_id"]) for r in results]
        return downvoted
    except Exception as e:
        print(f"[Downvote fetch error] {str(e)}")
        return []

def get_upvoted_proverbs(user_id: str, keyword: str) -> list:
    """Get all upvoted proverb IDs for user and keyword"""
    try:
        db = get_db()
        collection = db["user_feedback"]
        
        results = collection.find({
            "user_id": user_id,
            "keyword": keyword,
            "vote_type": "upvote"
        })
        
        upvoted = [str(r["proverb_id"]) for r in results]
        return upvoted
    except Exception as e:
        print(f"[Upvote fetch error] {str(e)}")
        return []

def add_proverb(proverb_data: dict):
    """Add new proverb to MongoDB"""
    try:
        db = get_db()
        collection = db["proverbs"]
        
        proverb_data["created_at"] = datetime.utcnow()
        result = collection.insert_one(proverb_data)
        
        print(f"[Proverb added] ID: {result.inserted_id}")
        return str(result.inserted_id)
    except Exception as e:
        print(f"[Add proverb error] {str(e)}")
        return None

def get_all_proverbs():
    """Get all proverbs from MongoDB"""
    try:
        db = get_db()
        collection = db["proverbs"]
        
        results = list(collection.find())
        return results
    except Exception as e:
        print(f"[Get proverbs error] {str(e)}")
        return []

def check_duplicate_proverb(proverb_telugu: str) -> bool:
    """Check if proverb already exists"""
    try:
        db = get_db()
        collection = db["proverbs"]
        
        result = collection.find_one({"proverb_telugu": proverb_telugu})
        return result is not None
    except Exception as e:
        print(f"[Duplicate check error] {str(e)}")
        return False

def bulk_insert_proverbs(proverbs: list):
    """Bulk insert proverbs from CSV, avoiding duplicates"""
    try:
        db = get_db()
        collection = db["proverbs"]
        
        inserted_count = 0
        skipped_count = 0
        
        for proverb in proverbs:
            proverb_telugu = str(proverb.get("proverb_telugu", "") or "").strip()
            proverb_english = str(proverb.get("proverb_english", "") or "").strip()

            # Skip records that don't contain at least one proverb text field.
            if not proverb_telugu and not proverb_english:
                skipped_count += 1
                continue

            existing = check_duplicate_proverb_by_fields(
                proverb_telugu=proverb_telugu,
                proverb_english=proverb_english
            )
            if existing:
                skipped_count += 1
                continue

            proverb["proverb_telugu"] = proverb_telugu
            proverb["proverb_english"] = proverb_english
            proverb["created_at"] = datetime.utcnow()
            collection.insert_one(proverb)
            inserted_count += 1
        
        print(f"[Bulk insert] Inserted: {inserted_count}, Skipped (duplicates): {skipped_count}")
        return {"inserted": inserted_count, "skipped": skipped_count}
    except Exception as e:
        print(f"[Bulk insert error] {str(e)}")
        return {"inserted": 0, "skipped": 0}

def get_analytics():
    """Get analytics data"""
    try:
        db = get_db()
        
        # Count total proverbs
        proverbs_count = db["proverbs"].count_documents({})
        
        # Count user feedback entries (unique users)
        users = db["user_feedback"].distinct("user_id")
        users_count = len(users)
        
        # Count total feedback
        feedback_count = db["user_feedback"].count_documents({})
        
        return {
            "total_proverbs": proverbs_count,
            "total_users": users_count,
            "total_feedback": feedback_count
        }
    except Exception as e:
        print(f"[Analytics error] {str(e)}")
        return {"total_proverbs": 0, "total_users": 0, "total_feedback": 0}

def check_duplicate_proverb_by_fields(proverb_telugu: str = "", proverb_english: str = ""):
    """Check if proverb exists by Telugu or English fields"""
    try:
        db = get_db()
        collection = db["proverbs"]
        
        # Build query
        or_conditions = []
        
        if proverb_telugu and proverb_telugu.strip():
            or_conditions.append({"proverb_telugu": {"$regex": proverb_telugu.strip(), "$options": "i"}})
        
        if proverb_english and proverb_english.strip():
            or_conditions.append({"proverb_english": {"$regex": proverb_english.strip(), "$options": "i"}})
        
        if not or_conditions:
            print("[Duplicate check] No search criteria provided")
            return None
        
        # If only one condition, use it directly
        if len(or_conditions) == 1:
            query = or_conditions[0]
        else:
            query = {"$or": or_conditions}
        
        result = collection.find_one(query)
        
        if result:
            print(f"[Duplicate found] Telugu: {result.get('proverb_telugu', '')[:30]}...")
        else:
            print(f"[No duplicate] Searched for: telugu='{proverb_telugu[:30]}...' english='{proverb_english[:30]}...'")
        
        return result
    except Exception as e:
        print(f"[Duplicate check error] {str(e)}")
        return None

def submit_annotation(
    user_id: str,
    proverb_telugu: str,
    proverb_english: str,
    meaning: str,
    keywords: str,
    context_meaning: str = ""
):
    """Submit a new annotation for admin approval"""
    try:
        db = get_db()
        collection = db["pending_annotations"]
        
        result = collection.insert_one({
            "user_id": user_id,
            "proverb_telugu": proverb_telugu,
            "proverb_english": proverb_english,
            "meaning": meaning,
            "keywords": keywords,
            "context_meaning": context_meaning or "",
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        print(f"[Annotation submitted] ID: {result.inserted_id}, User: {user_id}")
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        print(f"[Submit annotation error] {str(e)}")
        return {"success": False, "error": str(e)}

def get_pending_annotations():
    """Get all pending annotations for admin review"""
    try:
        db = get_db()
        collection = db["pending_annotations"]
        
        results = list(collection.find({"status": "pending"}).sort("created_at", -1))
        return results
    except Exception as e:
        print(f"[Get pending error] {str(e)}")
        return []

def approve_annotation(annotation_id: str):
    """Admin approves an annotation and moves it to proverbs collection"""
    try:
        db = get_db()
        pending_col = db["pending_annotations"]
        proverbs_col = db["proverbs"]
        
        annotation = pending_col.find_one({"_id": ObjectId(annotation_id)})
        if not annotation:
            return {"success": False, "error": "Annotation not found"}
        
        # Add to proverbs collection
        proverb_data = {
            "proverb_telugu": annotation["proverb_telugu"],
            "proverb_english": annotation["proverb_english"],
            "meaning": annotation["meaning"],
            "keywords": annotation["keywords"],
            "context": annotation.get("context_meaning", ""),
            "context_meaning": annotation.get("context_meaning", ""),
            "submitted_by": annotation["user_id"],
            "created_at": datetime.utcnow()
        }
        
        result = proverbs_col.insert_one(proverb_data)
        
        # Update pending status
        pending_col.update_one(
            {"_id": ObjectId(annotation_id)},
            {"$set": {"status": "approved", "updated_at": datetime.utcnow()}}
        )
        
        print(f"[Annotation approved] ID: {annotation_id}")
        return {"success": True, "proverb_id": str(result.inserted_id)}
    except Exception as e:
        print(f"[Approve annotation error] {str(e)}")
        return {"success": False, "error": str(e)}

def reject_annotation(annotation_id: str):
    """Admin rejects an annotation"""
    try:
        db = get_db()
        collection = db["pending_annotations"]
        
        collection.update_one(
            {"_id": ObjectId(annotation_id)},
            {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
        )
        
        print(f"[Annotation rejected] ID: {annotation_id}")
        return {"success": True}
    except Exception as e:
        print(f"[Reject annotation error] {str(e)}")
        return {"success": False, "error": str(e)}

def get_annotator_stats():
    """Get statistics for all annotators"""
    try:
        db = get_db()
        pending_col = db["pending_annotations"]
        
        # Get all annotators with their submission stats
        pipeline = [
            {
                "$group": {
                    "_id": "$user_id",
                    "submitted": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "pending"]}, 1, 0]
                        }
                    },
                    "approved": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "approved"]}, 1, 0]
                        }
                    },
                    "rejected": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]
                        }
                    },
                    "total_submitted": {"$sum": 1}
                }
            },
            {"$sort": {"approved": -1}}
        ]
        
        results = list(pending_col.aggregate(pipeline))
        return results
    except Exception as e:
        print(f"[Get annotator stats error] {str(e)}")
        return []

def get_annotation_history(status: str = None):
    """Get history of approved/rejected annotations"""
    try:
        db = get_db()
        collection = db["pending_annotations"]
        
        if status:
            results = list(collection.find({"status": status}).sort("updated_at", -1))
        else:
            results = list(collection.find({"status": {"$in": ["approved", "rejected"]}}).sort("updated_at", -1))
        
        return results
    except Exception as e:
        print(f"[Get history error] {str(e)}")
        return []

def get_repository_proverbs(search_query: str = None):
    """Get all proverbs from repository with optional search"""
    try:
        db = get_db()
        collection = db["proverbs"]
        
        if search_query:
            results = list(collection.find({
                "$or": [
                    {"proverb_telugu": {"$regex": search_query, "$options": "i"}},
                    {"proverb_english": {"$regex": search_query, "$options": "i"}},
                    {"keywords": {"$regex": search_query, "$options": "i"}},
                    {"meaning": {"$regex": search_query, "$options": "i"}}
                ]
            }).sort("_id", -1))
        else:
            results = list(collection.find().sort("_id", -1))
        
        return results
    except Exception as e:
        print(f"[Get repository error] {str(e)}")
        return []

def delete_proverb(proverb_id: str):
    """Delete a proverb from repository by ID"""
    try:
        db = get_db()
        collection = db["proverbs"]
        
        result = collection.delete_one({"_id": ObjectId(proverb_id)})
        
        if result.deleted_count > 0:
            print(f"[Proverb deleted] ID: {proverb_id}")
            return {"success": True, "message": "Proverb deleted successfully"}
        else:
            print(f"[Delete error] Proverb not found: {proverb_id}")
            return {"success": False, "error": "Proverb not found"}
    except Exception as e:
        print(f"[Delete proverb error] {str(e)}")
        return {"success": False, "error": str(e)}
