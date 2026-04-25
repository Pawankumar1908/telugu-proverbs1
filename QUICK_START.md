# 🚀 Quick Start Checklist

## Prerequisites
- [ ] Python 3.8+ installed
- [ ] Node.js 14+ installed
- [ ] MongoDB installed locally OR MongoDB Atlas account
- [ ] Git (optional)

---

## Setup Steps

### Step 1: Backend Setup (5 min)

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create .env file:**
   ```bash
   cp .env.example .env
   ```
   Or manually create `backend/.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   ```

4. **Verify MongoDB is running:**
   ```bash
   mongod
   # In another terminal:
   mongo
   ```

5. **Start Backend:**
   ```bash
   python -m uvicorn app:app --reload
   ```
   ✅ Should see: `Uvicorn running on http://127.0.0.1:8000`

---

### Step 2: Frontend Setup (3 min)

1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Frontend:**
   ```bash
   npm run dev
   ```
   ✅ Should see: `http://localhost:5173`

---

### Step 3: Test Admin Features (2 min)

1. **Open browser:**
   ```
   http://localhost:5173
   ```

2. **Login with Admin:**
   - Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env`
   - Use those same values in the login form
   - Should redirect to `/admin` dashboard

3. **In Admin Dashboard:**
   - [ ] Click "Analytics" tab → should show 0 proverbs
   - [ ] Click "Add Proverb" tab → fill form → click "Add Proverb"
   - [ ] Click "Upload CSV" → select a CSV file → upload

---

### Step 4: Test User Features (2 min)

1. **Logout from admin** (click "Sign Out")

2. **Login as regular user:**
   - Email: `user@example.com`
   - Password: `test123`
   - ✅ Should go to main chat dashboard

3. **Search for a proverb:**
   - Type: "help"
   - ✅ Should show proverb cards

4. **Test voting:**
   - Click 👍 or 👎 button on a card
   - ✅ Button should highlight

5. **Test upvote boost:**
   - Search again with same keyword
   - ✅ Upvoted proverb should appear first

---

## Verification Checklist

### Backend API
- [ ] `POST /login` works (test with Postman/cURL)
- [ ] `POST /chat` returns proverbs
- [ ] `POST /vote` stores votes
- [ ] `GET /analytics` returns counts
- [ ] `POST /admin/add-proverb` works
- [ ] `POST /admin/upload-csv` works

### Frontend UI
- [ ] Login page displays correctly
- [ ] Admin dashboard has 3 tabs
- [ ] Chat dashboard shows proverb cards
- [ ] Vote buttons are clickable
- [ ] No "Explain" button present

### Database
- [ ] MongoDB running (`mongo` command works)
- [ ] `user_feedback` collection created (after first vote)
- [ ] Votes appear in collection (check with `mongo`)
   ```javascript
   use telugu_proverbs
   db.user_feedback.find().pretty()
   ```

---

## Troubleshooting During Setup

### Issue: "MongoDB connection refused"
**Solution:**
```bash
# Start MongoDB
mongod

# In another terminal
mongo  # Should connect successfully
```

### Issue: "Port 8000 already in use"
**Solution:**
```bash
# Kill process using port 8000
# On Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# On Mac/Linux:
lsof -i :8000
kill -9 <PID>
```

### Issue: "npm command not found"
**Solution:**
```bash
# Install Node.js from nodejs.org
# Verify installation:
node --version
npm --version
```

### Issue: "Python module not found"
**Solution:**
```bash
# Reinstall requirements
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

---

## Test Scenarios

### Scenario 1: Admin Adds Proverb
```
1. Login using your `ADMIN_EMAIL` value from `.env`
2. Go to "Add Proverb" tab
3. Fill form:
   - Telugu: "నిజం విజయం"
   - English: "Truth Wins"
   - Meaning: "Truth always prevails"
   - Keywords: "truth, victory"
   - Theme: "Truth & Honesty"
   - Context: "When telling the truth"
4. Click "Add Proverb"
5. ✅ Should see success message
```

### Scenario 2: Vote Filtering
```
1. Login: user@example.com
2. Search: "truth"
3. See proverb card
4. Click 👍 "Helpful"
5. Search again: "truth"
6. ✅ Same proverb should appear FIRST
```

### Scenario 3: Vote Exclusion
```
1. Login: user@example.com
2. Search: "truth"
3. See proverb card
4. Click 👎 "Not Helpful"
5. Search again: "truth"
6. ✅ Same proverb should be HIDDEN
```

### Scenario 4: Synonym Search
```
1. Search: "generous"
2. Backend expands to: "donation, charity, kindness, etc."
3. ✅ Should find donation-related proverbs
```

---

## Files to Check

### Backend
- ✅ `backend/app.py` - Main API
- ✅ `backend/db.py` - MongoDB functions
- ✅ `backend/config.py` - Configuration
- ✅ `backend/.env` - Environment variables

### Frontend  
- ✅ `frontend/src/App.jsx` - Main app logic
- ✅ `frontend/src/components/AdminDashboard.jsx` - Admin panel
- ✅ `frontend/src/components/ProverbCard.jsx` - Vote buttons
- ✅ `frontend/src/components/Login.jsx` - Login form

---

## Documentation Files

- 📖 `IMPLEMENTATION_GUIDE.md` - Complete guide
- 📖 `API_REFERENCE.md` - All endpoints
- 📖 `IMPLEMENTATION_SUMMARY.md` - What was done
- 📖 `SYNONYM_FEATURE.md` - How synonym search works
- 📖 `README.md` - Original project readme

---

## Next Steps After Verification

1. **Read documentation:**
   - `IMPLEMENTATION_GUIDE.md` for detailed setup
   - `API_REFERENCE.md` for API details

2. **Test edge cases:**
   - Try uploading CSV with duplicates
   - Try voting for same proverb twice
   - Try searching with no results

3. **Deploy (when ready):**
   - Set up MongoDB Atlas
   - Deploy backend to Heroku/Railway
   - Deploy frontend to Vercel/Netlify
   - Update API URLs in frontend

4. **Add more features:**
   - Supabase OAuth integration
   - Advanced analytics
   - Recommendation engine

---

## Support Contacts

### For Backend Issues
- Check `backend/app.py` logs
- Verify MongoDB connection
- Check `.env` file config

### For Frontend Issues  
- Check browser console (F12)
- Verify backend is running
- Check network tab for API calls

### For Database Issues
- Use `mongo` CLI to inspect
- Check MongoDB Atlas dashboard
- Verify collections and indexes

---

## Success Criteria

You'll know everything is working when:
1. ✅ Admin login redirects to dashboard
2. ✅ User login shows proverbs
3. ✅ Vote buttons work
4. ✅ Upvotes boost next search
5. ✅ Downvotes hide proverb
6. ✅ Admin can add/upload proverbs
7. ✅ Analytics show counts
8. ✅ No "Explain" button anywhere
9. ✅ No console errors
10. ✅ Responses < 1 sec

---

## Final Checklist Before Going Live

- [ ] MongoDB production instance set up
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] CORS rules configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Backups automated
- [ ] SSL certificates installed
- [ ] API keys secured
- [ ] Admin credentials changed from default

---

## 🎉 You're All Set!

Your Telugu Proverbs app is now:
- ✅ Authenticated (admin + users)
- ✅ Vote-enabled (filtering + boosting)
- ✅ Admin-managed (add/upload proverbs)
- ✅ Analytics-tracked (dashboards)
- ✅ Production-ready (minimal changes)

**Enjoy! 🚀**
