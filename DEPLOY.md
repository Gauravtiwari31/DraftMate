# DraftMate deployment guide

Backend (FastAPI) and frontend (static React build) both go on Render's free plan. Total time: about 20 minutes.

```
Browser ──> draftmate-web (Render static site, frontend/dist)
              │  VITE_API_URL
              ▼
            draftmate-api (Render web service, render.yaml) ──> Gemini, Groq, Tavily
```

## 0. Before you start
- Free accounts: GitHub, Render (https://render.com, sign in with GitHub).
- The three API keys from your local `.env`: `GEMINI_API_KEY`, `GROQ_API_KEY`, `TAVILY_API_KEY`.
- Local checks pass:
  ```
  python api_test.py
  cd frontend && npm run build
  ```

## 1. Push the code to GitHub
1. Create an empty repository on GitHub (no README), e.g. `draftmate`.
2. In the project folder:
   ```
   git add -A
   git commit -m "DraftMate: UI rebuild, skills, fixes"
   git branch -M main
   git remote add origin https://github.com/<you>/draftmate.git
   git push -u origin main
   ```
3. Check on GitHub that `.env` is **not** in the repo (it is gitignored). Never commit keys.
   Optional: leave `HACKATHON PROBLEM STATEMENT.pdf`, the PPT template and deck out of the repo.

## 2. Deploy the backend (Render web service)
1. Render dashboard → **New → Blueprint** → pick the repo. Render reads `render.yaml` and proposes the `draftmate-api` service.
2. It asks for the values marked `sync: false`. Enter:
   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | your Gemini key |
   | `GROQ_API_KEY` | your Groq key |
   | `TAVILY_API_KEY` | your Tavily key |
   | `ALLOWED_ORIGIN` | leave as `http://localhost:5173` for now; set in step 4 |

   Model IDs (`MODEL_QUICK`, `MODEL_BALANCED`, `MODEL_ADVANCED`) and `CACHE_DIR` are already set in `render.yaml`.
3. **Apply**. The first build takes a few minutes. When it is live, open
   `https://draftmate-api.onrender.com/health` (your URL may have a suffix). It should return `{"ok": true, ...}`.
4. If the build fails on a package, add an environment variable `PYTHON_VERSION` = `3.12.10` and redeploy.

## 3. Deploy the frontend (Render static site)
1. Render → **New → Static Site** → same repo.
2. Settings:
   | Field | Value |
   |---|---|
   | Name | `draftmate-web` |
   | Root Directory | `frontend` |
   | Build Command | `npm ci && npm run build` |
   | Publish Directory | `dist` |
   | Environment variable | `VITE_API_URL` = your backend URL from step 2, no trailing slash |
3. **Create Static Site**. Note the URL, e.g. `https://draftmate-web.onrender.com`.

`VITE_API_URL` is read at **build** time. If you change it later, trigger **Manual Deploy → Clear build cache & deploy**.

## 4. Connect the two
1. Backend service → **Environment** → set `ALLOWED_ORIGIN` to the frontend URL exactly, e.g. `https://draftmate-web.onrender.com` (no trailing slash; several origins can be comma-separated, e.g. add `http://localhost:5173` for local testing).
2. Save. Render redeploys the backend.

## 5. Check it works
1. From your PC:
   ```
   python smoke.py https://draftmate-api.onrender.com
   ```
   Expect `SMOKE: PASS`.
2. Open the frontend URL and run the tester checklist in `README.md`: upload `samples/reference_nda.docx`, `@legal_notice`, Verify citations, a voice or typed edit, Export DOCX.
3. Voice works on the HTTPS site in Chrome or Edge (allow the microphone).

## Things to know
- **Cold start:** free Render services sleep after about 15 minutes idle. The first request takes 30–60 s; the app shows "Waking server…" and retries. Open the site a minute before a demo.
- **Ephemeral disk:** uploaded documents live in memory and are lost when the service restarts. The committed `demo_cache` gives instant answers for the prewarmed demo flow.
- **Quota:** if Gemini's free quota is used up, drafts fall back to GPT-OSS 120B on Groq automatically. `GET /stats` shows calls and errors; `python check_quota.py` (locally) shows which tier is down.
- **Updating:** every push to `main` redeploys both services automatically.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Browser console shows a CORS error | `ALLOWED_ORIGIN` does not exactly match the frontend URL (check `https://` and no trailing slash) |
| Frontend calls `localhost:8000` | `VITE_API_URL` was missing at build time; set it and clear build cache & deploy |
| "All providers busy" toast | Free-tier rate limit; wait 30 s. Check keys on the backend's Environment page |
| `/health` fails or build errors | Open the service **Logs**; for Python package errors set `PYTHON_VERSION` (step 2.4) |
| Render asks for a card | Use the fallback: frontend on Vercel or Netlify (same build settings), backend run locally and exposed with a Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:8000`), then set `VITE_API_URL` to the tunnel URL and `ALLOWED_ORIGIN` to the frontend URL |
