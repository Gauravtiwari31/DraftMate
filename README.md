# Vidhi — DraftMate Legal Drafting Studio

AI legal drafting studio for Indian law: upload a reference document, draft with skills, verify citations against allow-listed legal sources, edit by voice or typed command, export DOCX. Human review required — it flags what it can't confirm instead of inventing.

## Requirements
- Python 3.12+ (tested on 3.14) and Node 18+ (tested on 24)
- 3 free API keys (no card needed):
  - Gemini — https://aistudio.google.com (Get API key)
  - Groq — https://console.groq.com (API Keys)
  - Tavily — https://tavily.com (1000 free searches/month)

## .env setup
Copy `.env.example` to `.env` and fill in the three keys. Model IDs live in `.env` only — never in code or git.

## Run
```
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
cd frontend && npm install && npm run dev
```
Open http://localhost:5173 (backend at http://localhost:8000). Local is the primary demo; deployment status in PROGRESS.md.

## Tester checklist (browser)
1. Upload `samples/reference_nda.docx` with the **reference** toggle → style profile + token meter appear.
2. Type `@legal_notice` + your facts → draft appears in the reference's tone.
3. Click **Verify citations** → expect green (verified), amber (partially verified), red (unverified/planted fake).
4. Mic or typed command: "make clause 3 shorter and more formal" → diff view → **Accept**.
5. Command: "delete the draft" → confirmation modal → choose **No**, draft stays.
6. **Export DOCX** → file downloads and opens in Word.
7. Typed command box works without the mic (Chrome/Edge only for voice).
8. If the backend was asleep, the "Waking server…" loader clears once `/health` responds.

## Bug report template
```
What I did: (exact steps / command)
What I expected:
What happened:
Screenshot:
```

## Common problems
- **"python not found"** — install Python 3.12+ from python.org; on Windows `py -3` also works.
- **Port in use** — stop the old server (or use another port; frontend reads `VITE_API_URL`).
- **401/403 or missing key** — put the key in `.env`, restart the backend; `python check_quota.py` shows which tier is down.
- **Voice does nothing** — Web Speech needs Chrome/Edge on localhost or HTTPS; use the typed command box.
- **"All providers busy" toast** — free-tier rate limit; it auto-retries once; check `GET /stats`.
