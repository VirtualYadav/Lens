# 📱 Deploy Lens on your phone (no laptop)

This is the **only** guide you need. Do everything from your phone browser.

## ⏱️ Time: 30-40 min · 💰 Cost: $0/month

---

## Before you start (1 min)

Get your free Gemini API key:
1. Open https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Tap **"Create API key"** → **"Create in new project"**
4. **Copy the key** (looks like `AIzaSy...`, 39 chars)

You'll also need free accounts (sign up takes 30 sec each):
- **GitHub** → https://github.com/signup
- **Render** → https://render.com (sign up with GitHub)
- **Vercel** → https://vercel.com (sign up with GitHub)

---

## Step 1: Upload code to GitHub (5 min)

### 1a. Get the project
- Download `lens-project.zip` (tap the file icon in the chat)
- Extract on phone:
  - **Android:** Files by Google → tap the zip → Extract
  - **iPhone:** Files app → tap the zip → share to "Save to Files" → tap to extract

### 1b. Create a new GitHub repo
1. Open https://github.com (phone browser)
2. Tap **+** (top right) → **New repository**
3. Name: `lens`
4. **Public** (required for free Render)
5. ❌ DO NOT add README
6. Tap **Create repository**

### 1c. Upload the files
1. Tap **"uploading an existing file"**
2. Tap **"choose your files"**
3. Select ALL files from the extracted folder:
   - On Android: tap first file, then long-press to multi-select
   - On iPhone: use Files app to multi-select
4. Wait for upload (may take 1-2 min)
5. Scroll down → tap **Commit changes**

---

## Step 2: Deploy backend to Render (10 min)

1. Open https://render.com → sign in with GitHub
2. Tap **New +** → **Web Service**
3. Find your `lens` repo → tap **Connect**

### Fill in the form:

| Field | Value |
|---|---|
| **Name** | `lens-backend` |
| **Region** | Pick closest (Singapore for Asia) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | **Free** |

### Add the API key:
- Scroll to **Environment Variables**
- Tap **Add Environment Variable**
- **Key:** `GEMINI_API_KEY`
- **Value:** paste your Gemini key
- Tap **Add**

### Deploy:
- Tap **Create Web Service**
- Wait 3-5 min for build (you'll see logs)
- When done, you'll see: `Your service is live at https://lens-backend-xxxx.onrender.com`
- **📋 COPY THIS URL**

### Test it:
- Open that URL in your phone browser
- You should see: `{"status":"ok","service":"lens","version":"1.0.0"}`
- ✅ Backend is live!

⚠️ **Free tier note:** The backend sleeps after 15 min of no use. First request takes ~30 sec to wake up. After that it's fast.

---

## Step 3: Deploy frontend to Vercel (10 min)

1. Open https://vercel.com → sign in with GitHub
2. Tap **Add New...** → **Project**
3. Find your `lens` repo → tap **Import**

### Configure:
- **Project Name:** `lens-frontend` (or anything)
- Tap **Edit** next to Root Directory → set to `frontend`
- Framework Preset: **Vite** (auto-detected)

### Add backend URL:
- Scroll to **Environment Variables**
- **Name:** `VITE_API_URL`
- **Value:** paste your Render URL from Step 2 (no trailing slash!)
- Tap **Add**

### Deploy:
- Tap **Deploy**
- Wait 2-3 min
- You'll see: **🎉 Congratulations!**
- **📋 COPY the URL** (e.g. `https://lens-frontend-xxxx.vercel.app`)

### Test:
- Open your Vercel URL in phone browser
- You should see the Lens upload screen with violet/cyan gradient
- ✅ If yes → ready to install!

---

## Step 4: Install on your phone (1 min)

### Android (Chrome):
1. Open your Vercel URL in Chrome
2. Tap **⋮** menu
3. Tap **"Install app"** or **"Add to Home Screen"**
4. Tap **Install**
5. ✅ Lens appears on your home screen

### iPhone (Safari):
1. Open your Vercel URL in Safari (NOT Chrome)
2. Tap **Share** button ↑
3. Tap **"Add to Home Screen"**
4. Tap **Add**
5. ✅ Lens appears on your home screen

---

## Step 5: Use it!

1. Open the Lens app from your home screen
2. **Switch language** in the top-right (try Hindi 🇮🇳 if you speak it)
3. **Upload** a file from `sample-data/`
4. Tap a **Quick Action** (Summary, Top 10, Trends, etc.) or ask anything
5. Get insight cards, charts, and follow-up suggestions

### Try these cool features:
- **Insights:** Every result has a one-line key finding highlighted
- **Follow-ups:** After any answer, Lens suggests 2-3 next questions to tap
- **Multilingual:** Ask in Hindi, get answer in Hindi
- **Quick Actions:** Buttons for Summary, Top 10, Trends, Outliers, Compare
- **Cmd+K:** Press to focus the chat input (laptop only, mostly)

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| "Network error" on upload | Backend is sleeping. Wait 30 sec and try again |
| Vercel shows blank page | Check `VITE_API_URL` is set correctly in Vercel env vars |
| Render build failed | Check the build log; usually a typo in requirements.txt |
| PWA won't install | Use Chrome (Android) or Safari (iPhone), not in-app browsers |
| Uploaded files disappear | Expected on free tier — re-upload after server restart |
| "CORS error" in console | Shouldn't happen (CORS is `*`); if it does, double-check Render URL has `https://` |

## 🔄 Updating later

- Edit files in GitHub (tap file → pencil icon → make changes → commit)
- Render + Vercel auto-deploy on push to `main`
- Wait 2-5 min, then refresh your Lens PWA

## 💡 Pro tips

- **Set language once** in the top-right; Lens uses it for all responses
- **Use Quick Actions** for fast standard analyses
- **Recent files** shows last 5 uploads (browser-side only — files still need re-uploading on free tier)
- **Tap a follow-up suggestion** to chain questions naturally
