# API Reference - Telugu Proverbs App

## Base URL
```
http://localhost:8000
```

---

## 1. Authentication

### Login
**Endpoint:** `POST /login`

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (Admin):**
```json
{
  "success": true,
  "role": "admin",
  "email": "admin321@gmail.com",
  "token": "admin-token-admin321@gmail.com"
}
```

**Response (User):**
```json
{
  "success": true,
  "role": "user",
  "email": "user@example.com",
  "token": "user-token-user@example.com",
  "user_id": "user@example.com"
}
```

**Test Credentials:**
- Email: `admin321@gmail.com`
- Password: `admin@321`

---

## 2. Search & Chat

### Chat/Search
**Endpoint:** `POST /chat`

**Request:**
```json
{
  "message": "help",
  "user_id": "user@example.com"
}
```

**Response:**
```json
{
  "type": "cards",
  "data": [
    {
      "proverb": "సత్యమేవ జయతే నానృతం",
      "proverb_english": "Satyameva jayate nanrtam",
      "meaning": "Only truth triumphs, not falsehood",
      "context": "Used when someone stays truthful...",
      "keywords": "Truth, Victory, Dharma",
      "theme": "Truth & Honesty",
      "score": 0.83,
      "related_categories": [1, 2]
    }
  ]
}
```

**Features:**
- Automatically expands keywords using synonym dictionary
- Filters out user's downvoted proverbs
- Boosts user's upvoted proverbs to top
- Returns relevance scores

---

## 3. Voting System

### Record Vote
**Endpoint:** `POST /vote`

**Request:**
```json
{
  "user_id": "user@example.com",
  "proverb_id": "satyameva_jayate",
  "keyword": "truth",
  "vote_type": "upvote"
}
```

**Parameters:**
- `user_id`: User identifier (email)
- `proverb_id`: Proverb identifier or index
- `keyword`: The keyword searched
- `vote_type`: Either `"upvote"` or `"downvote"`

**Response:**
```json
{
  "success": true,
  "message": "Vote recorded: upvote"
}
```

**Vote Impact:**
- **Upvote:** Proverb appears FIRST in next search for this keyword
- **Downvote:** Proverb HIDDEN in next search for this keyword

---

## 4. Admin - Proverb Management

### Add Single Proverb
**Endpoint:** `POST /admin/add-proverb`

**Request:**
```json
{
  "proverb_telugu": "సత్యమేవ జయతే",
  "proverb_english": "Satyameva Jayate",
  "meaning": "Truth always wins",
  "keywords": "truth, honesty, victory",
  "theme": "Truth & Honesty",
  "context": "Use when discussing the power of truth"
}
```

**Response:**
```json
{
  "success": true,
  "proverb_id": "507f1f77bcf86cd799439011",
  "message": "Proverb added and embeddings updated"
}
```

**Auto Actions:**
- Adds to MongoDB
- Regenerates FAISS embeddings
- Ready for search immediately

---

### Upload CSV Dataset
**Endpoint:** `POST /admin/upload-csv`

**Request:**
```json
{
  "csv_data": "proverb_telugu,proverb_english,meaning,keywords,theme,context\nసత్యమేవ జయతే,Satyameva Jayate,Truth always wins,...\n..."
}
```

**Expected CSV Columns:**
```
proverb_telugu,proverb_english,meaning,keywords,theme,context
```

**Example CSV:**
```csv
proverb_telugu,proverb_english,meaning,keywords,theme,context
సత్యమేవ జయతే,Satyameva Jayate,Truth always wins,truth,Truth & Honesty,When discussing morality
ధర్మో రక్షతి రక్షితః,Dharma Protects,Righteousness protects,dharma,Dharma & Morality,When acting morally
```

**Response:**
```json
{
  "success": true,
  "inserted": 25,
  "skipped": 3,
  "message": "Proverbs uploaded and embeddings updated"
}
```

**Features:**
- Avoids duplicate proverbs (checks by `proverb_telugu`)
- Returns inserted + skipped counts
- Auto-generates embeddings
- Bulk operation optimized

---

## 5. Analytics

### Get Analytics
**Endpoint:** `GET /analytics`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_proverbs": 321,
    "total_users": 45,
    "total_feedback": 182
  }
}
```

**Metrics:**
- `total_proverbs`: All proverbs in database
- `total_users`: Unique users who voted
- `total_feedback`: Total votes (upvotes + downvotes)

---

## 6. Maintenance

### Regenerate Embeddings
**Endpoint:** `POST /regenerate-embeddings`

**Response:**
```json
{
  "status": "success",
  "message": "Embeddings regenerated successfully"
}
```

**When to Use:**
- After manually inserting proverbs into DB
- If embeddings seem outdated
- After CSV import fails to auto-regenerate

---

## Error Responses

### Standard Error Format
```json
{
  "detail": "Error message here"
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad request (missing fields)
- `401` - Unauthorized (wrong admin credentials)
- `404` - Not found
- `500` - Server error

### Common Errors
```json
{
  "detail": "Email and password required"
}
```

```json
{
  "detail": "Failed to record vote"
}
```

```json
{
  "detail": "Explain feature has been disabled"
}
```

---

## Code Examples

### JavaScript/React - Vote
```javascript
const handleVote = async (proverb_id, consensus_type) => {
  const response = await fetch("http://localhost:8000/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: "user@example.com",
      proverb_id: proverb_id,
      keyword: "truth",
      vote_type: consensus_type === "👍" ? "upvote" : "downvote"
    })
  });
  const data = await response.json();
  console.log(data);
};
```

### Python - Admin Add Proverb
```python
import requests

url = "http://localhost:8000/admin/add-proverb"
payload = {
    "proverb_telugu": "సత్యమేవ జయతే",
    "proverb_english": "Satyameva Jayate",
    "meaning": "Truth always wins",
    "keywords": "truth, honesty",
    "theme": "Truth & Honesty",
    "context": "When discussing morality"
}
response = requests.post(url, json=payload)
print(response.json())
```

### Python - Upload CSV
```python
import requests

url = "http://localhost:8000/admin/upload-csv"
csv_content = """proverb_telugu,proverb_english,meaning,keywords,theme,context
సత్యమేవ జయతే,Satyameva Jayate,Truth wins,truth,Truth & Honesty,Morality"""

payload = {"csv_data": csv_content}
response = requests.post(url, json=payload)
print(response.json())  # {"success": true, "inserted": 1, "skipped": 0}
```

### cURL - Search with Vote Filtering
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "help",
    "user_id": "user@example.com"
  }'
```

---

## Rate Limits
Currently: **None** (implement in production)

## Authentication
- Admin endpoints: Token validation (not yet implemented, add Bearer token check)
- User endpoints: Public (rate limit recommended)

---

## Data Flow Diagram

```
User Query: "help"
    ↓
[1] Synonym Expansion: help → aid, assist, support, guidance...
    ↓
[2] FAISS Search: Find matching embeddings
    ↓
[3] fetch user's downvotes for "help"
    ↓
[4] Filter OUT downvoted proverbs
    ↓
[5] fetch user's upvotes for "help"  
    ↓
[6] Move upvoted proverbs to TOP
    ↓
[7] Return ranked results with scores
```

---

## WebSocket Support
**Not Currently Implemented** - Use polling with `/chat` endpoint

---

## Changelog

### v1.0 (Current)
- ✅ Admin authentication (hardcoded)
- ✅ User authentication (any email)
- ✅ Voting system (upvote/downvote)
- ✅ Vote-based filtering
- ✅ Admin CRUD for proverbs
- ✅ CSV bulk upload
- ✅ Analytics
- ✅ MongoDB integration
- ✅ Removed explain feature
