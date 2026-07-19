# 🚀 Railway Deployment - Final Steps (Phone Friendly)

**Status:** Backend code is fixed and pushed to Railway. Now you just need to configure 2 services.

---

## ✅ What's Already Done

- ✅ Backend code fixed (path alias compilation)
- ✅ Frontend code ready
- ✅ Database migrations ready
- ✅ Seed data ready (70+ vocab, 5 lessons, 3 stories)
- ✅ All pushed to Railway

---

## 📱 JUST DO THIS (3 simple clicks per service)

### STEP 1: Refresh Railway Dashboard

1. Go to your Railway dashboard in Safari
2. **Refresh the page** (pull down, release)
3. You should see your Backend service **with a green checkmark** (might take 1-2 min)

If you see red ❌ instead, wait 30 seconds and refresh again.

---

### STEP 2: Copy Your Backend URL

1. **Tap on Backend service** (the card in your dashboard)
2. Look at the top - you'll see a URL like: `https://language-app-backend-xxxxx.railway.app`
3. **Long-press on that URL** and tap **Copy**
4. **Keep it copied** - you'll paste it next

---

### STEP 3: Create Frontend Service

1. Back on dashboard (tap the Railway logo)
2. Tap blue **"New"** button
3. Tap **"GitHub"**
4. Find **"Language-App"** and tap it
5. Wait 10 seconds for it to appear

---

### STEP 4: Configure Frontend

1. **Tap on the Frontend service** (the new card that just appeared)
2. Tap **"Settings"** tab (at the top)

**Set these 4 fields:**

| Field | Value |
|-------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Port** | `3000` |

3. Then tap **"Variables"** tab
4. **Add two variables:**

   **First one:**
   - Key: `NODE_ENV`
   - Value: `production`
   - Tap Add ✓

   **Second one (IMPORTANT):**
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: **PASTE the backend URL you copied** + `/api/v1`
   
   **Example:** If your backend URL was:
   ```
   https://language-app-backend-abc123.railway.app
   ```
   Then paste exactly:
   ```
   https://language-app-backend-abc123.railway.app/api/v1
   ```

5. Tap **"Deploy"** button (save and deploy)

---

### STEP 5: Wait for Both to Deploy

Frontend will build for 2-3 minutes. You'll see:
- **Backend**: Green checkmark with URL
- **Frontend**: Green checkmark with URL (shows `language-app-frontend-xxxxx.railway.app`)

---

### STEP 6: Test the App

1. **Tap the Frontend URL** - your app opens!
2. You should see the login screen
3. Try registering (use any email, password)
4. If it works → ✅ Everything is working!

---

### STEP 7: Seed the Database (One-time only)

1. Tap on **Backend service**
2. Look for **"Terminal"** tab (might need to scroll)
3. You'll see a command box
4. Type: `npm run db:seed`
5. Press Enter
6. Wait for message: `✅ Seed data inserted successfully!`

---

## ✨ Done! 

Go to your **Frontend URL** and:
- 📝 Register an account
- 🎓 Complete onboarding
- 👂 View 5 lessons with audio
- 📚 Practice vocabulary
- 📖 Read stories

---

## 🆘 If Something Breaks

**"Backend has red X"**
→ Wait 2 minutes and refresh. If still red, take a screenshot of the error and send it.

**"Frontend won't load"**
→ Make sure `NEXT_PUBLIC_API_URL` ends with `/api/v1` (check Variables tab)

**"Can't register"**
→ Check Backend logs (Deployments tab) - take a screenshot of any errors

**"No lessons show up"**
→ You skipped Step 7. Do `npm run db:seed` in Backend Terminal

---

That's it! You're done. The hard part is already done. 🎉
