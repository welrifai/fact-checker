# fact-checker

A lightweight prototype web app for **real-time claim monitoring** on YouTube videos.

## What it does

- Accepts a YouTube URL as input.
- Streams caption snippets into a live feed with color-coded status labels:
  - likely true
  - possibly false
  - contentious
  - needs context
- Maintains a running references list.
- Lets you click any feed item to open a discussion panel with prompts.
- Adds inline definition tooltips for key terms (inflation, recession, GDP, etc.).
- Embeds the video player alongside the analysis feed.

## Local run

```bash
npm start
```

Open: `http://localhost:3000`

---

## Deploy step-by-step (Render)

This app is a plain Node server, so it deploys easily on Render/Railway/Fly.io.

### 1) Push code to GitHub

```bash
git remote add origin <your-repo-url>
git push -u origin <your-branch>
```

### 2) Create a Render Web Service

1. Sign in to https://render.com
2. Click **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Choose this repository and branch.

### 3) Configure build/start

- **Runtime:** Node
- **Build Command:** *(leave empty)*
- **Start Command:** `npm start`
- **Instance type:** Free (for testing) or paid.

### 4) Environment variables

No required env vars. `PORT` is provided by Render automatically.

### 5) Deploy

Click **Create Web Service** and wait for deploy.

### 6) Open deployed URL

You’ll get a URL like `https://your-app.onrender.com`.

---

## Why video can show “Video unavailable”

If the embedded player says **Video unavailable**, this is usually **not** a bug in your app. Common reasons:

1. The video owner disabled embedding.
2. Region restrictions / age restrictions.
3. Copyright/licensing restrictions.
4. Browser/network privacy settings blocking YouTube embeds.

The UI now shows an **“Open video on YouTube”** link under the player so users can still watch directly when embedding is blocked.

---

## Notes

This repository currently ships a deterministic caption stream to demonstrate the UI and real-time pipeline behavior.

To make it production-ready, connect a live caption source (YouTube caption APIs or ASR), then replace the heuristic classifier with retrieval + verifier models and moderated evidence ranking.
