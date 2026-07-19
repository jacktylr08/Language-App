# Railway Deployment - Quick Start (Mobile Friendly)

Your app is fully ready. Follow these steps on your phone to deploy in ~15 minutes.

---

## Step 1: Create Railway Account (2 min)
1. Open **railway.app** on your phone
2. Click **"Start Building"** → **"Sign up"**
3. Choose **"Continue with GitHub"**
4. Authorize Railway to access your repos

---

## Step 2: Create Project (1 min)
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find **"Language-App"** in the list
4. Click **"Import"** → **"Authorize"**

---

## Step 3: Add Database Services (2 min)
Click **"New"** and add two services:

**1. PostgreSQL**
- Search "PostgreSQL" → Click it
- Click **"Create Service"**
- Railway auto-configures everything ✓

**2. Redis**  
- Search "Redis" → Click it
- Click **"Create Service"**
- Railway auto-configures everything ✓

---

## Step 4: Deploy Backend (3 min)

Click **"New"** → **"GitHub"** → **"Language-App"**

In the settings:
```
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm start
Port: 3001
```

Then go to **Variables** tab and add:
```
NODE_ENV=production
JWT_SECRET=your-secret-key-minimum-32-characters-here
```

Click **"Deploy"** — wait 2 minutes ✓

---

## Step 5: Deploy Frontend (3 min)

Click **"New"** → **"GitHub"** → **"Language-App"**

In the settings:
```
Root Directory: frontend
Build Command: npm install && npm run build
Start Command: npm start
Port: 3000
```

Get your backend URL:
- Go back to Backend service → **Deployments** tab
- Copy the URL (looks like `https://backend-xxxxx.railway.app`)

Then go to **Variables** tab and add:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://backend-xxxxx.railway.app/api/v1
```
(Replace `backend-xxxxx` with your actual URL)

Click **"Deploy"** — wait 2 minutes ✓

---

## Step 6: Seed Data (1 min)

In Railway:
- Click **Backend** service
- Click **"Terminal"** tab  
- Paste & run:
```bash
npm run db:seed
```

Wait for "✅ Seed data inserted successfully!"

---

## Step 7: Test on Your Phone! (30 sec)

1. Click **Frontend** service
2. Click the **URL** at the top (your app domain)
3. You'll see the Spanish Learning App landing page ✓

### First Test:
1. Click **"Register"**
2. Create account with any email
3. Complete **4-step onboarding**
4. See **5 lessons** available
5. Open a lesson → hear audio
6. Go to **Practice** tab → drill vocabulary

### Install as App (iOS/Android):
1. While on your app's URL
2. **iOS**: Tap Share → "Add to Home Screen"
3. **Android**: Tap ⋮ → "Install app"
4. Tap the new icon on your home screen!

---

## ✅ Done!

Your Spanish Learning App is live on your phone.

**What's included:**
- ✅ 70+ vocabulary words
- ✅ 5 complete lessons (foundation + core)
- ✅ 3 stories for reading practice
- ✅ Spaced repetition tracking
- ✅ Offline caching (PWA)
- ✅ Mobile app install

---

## Troubleshooting

**App loads but says "Can't reach API"?**
- Check NEXT_PUBLIC_API_URL matches your backend URL exactly
- Make sure `/api/v1` is at the end

**Backend build failing?**
- Click Backend → **Build Logs** tab
- Look for error messages
- Most common: missing environment variables

**Stuck?** Check the full deployment guide: see DEPLOYMENT.md

---

## Next Steps (Later)

Add your own Spanish content:
1. Add real audio files to S3
2. Create more lessons
3. Build your learning path
4. Share with other learners

For now, enjoy practicing! 🎉
