# 🚀 SplitTrip — Deploy Guide (Supabase + Vercel)

Estimated time: **15–20 minutes**. No coding needed after this.

---

## PART 1 — Set up Supabase (free database)

### Step 1: Create a Supabase account
1. Go to **https://supabase.com** and click **Start for free**
2. Sign up with GitHub or email
3. Click **New project**
4. Fill in:
   - **Name:** `splittrip`
   - **Database Password:** choose a strong password (save it somewhere)
   - **Region:** pick closest to you (e.g. Frankfurt for Europe)
5. Click **Create new project** — wait ~2 minutes for it to spin up

---

### Step 2: Run the database schema
1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase-schema.sql` from the project folder
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (green button) — you should see "Success"

---

### Step 3: Get your API keys
1. In Supabase, go to **Settings → API** (gear icon in left sidebar)
2. Copy these two values — you'll need them soon:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon / public** key → a long string starting with `eyJ...`

---

## PART 2 — Put code on GitHub

### Step 4: Create a GitHub repo
1. Go to **https://github.com/new**
2. Repository name: `splittrip`
3. Set to **Private** (recommended)
4. Click **Create repository**

### Step 5: Upload your code
You have two options:

**Option A — GitHub website (easiest, no terminal)**
1. In your new repo, click **uploading an existing file**
2. Drag and drop ALL the project files and folders
3. Click **Commit changes**

**Option B — Terminal (if you have Git installed)**
```bash
cd /path/to/splittrip        # navigate to the project folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/splittrip.git
git push -u origin main
```

---

## PART 3 — Deploy on Vercel (free hosting)

### Step 6: Create a Vercel account
1. Go to **https://vercel.com** and click **Sign Up**
2. Sign up with GitHub (easiest — it links your repos automatically)

### Step 7: Import your project
1. On your Vercel dashboard, click **Add New → Project**
2. Find `splittrip` in the list and click **Import**
3. Leave all settings as default (Vercel auto-detects Next.js)
4. **DO NOT click Deploy yet** — first add environment variables below

### Step 8: Add environment variables
Still on the import page, scroll to **Environment Variables** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL from Step 3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key from Step 3 |

Click **Add** after each one.

### Step 9: Deploy!
1. Click **Deploy**
2. Wait ~2 minutes — Vercel builds and deploys your app
3. You'll get a URL like: `https://splittrip-xyz.vercel.app` 🎉

---

## PART 4 — Test your app

### Step 10: Try it out
1. Open your Vercel URL
2. Click **Create a new trip**
3. Fill in trip name, currency, your name → Create
4. You land on the trip board — copy the invite link from the **Members** tab
5. Open the link in another browser tab (or send to a friend)
6. They enter their name and join — you both see the same board!

---

## PART 5 — Optional: Custom domain

### Step 11 (optional): Add a custom domain
1. In Vercel, go to your project → **Settings → Domains**
2. Add your domain (e.g. `splittrip.yourdomain.com`)
3. Follow the DNS instructions Vercel shows you
4. Takes 5–30 minutes to propagate

---

## ⚡ Quick reference

| Thing | Where to find it |
|-------|-----------------|
| Your app URL | Vercel dashboard |
| Database | Supabase → Table Editor |
| View all trips | Supabase → Table Editor → trips |
| View all expenses | Supabase → Table Editor → expenses |
| Receipts | Supabase → Storage → receipts |
| Re-deploy after code change | Push to GitHub → Vercel auto-deploys |

---

## 🆘 Troubleshooting

**"Trip not found"** — Check that you ran the SQL schema correctly in Supabase

**Receipts not uploading** — Make sure the storage bucket SQL ran (last section of schema file)

**Build fails on Vercel** — Check that both environment variables are set correctly, no extra spaces

**Data not saving** — Go to Supabase → Settings → API → make sure anon key is correct

---

## 🏗️ Architecture summary

```
Browser (Next.js)
    │
    ├── /                  → Create or join trip
    ├── /trip/[CODE]       → Trip board (expenses, balances, members)
    │
    └── API Routes
        ├── /api/trips     → Create trip, get by code
        ├── /api/members   → Join trip, list members
        ├── /api/expenses  → Add, list, delete expenses
        └── /api/upload    → Upload receipt photos

Supabase (PostgreSQL)
    ├── trips table
    ├── members table
    ├── expenses table
    └── receipts bucket (file storage)
```
