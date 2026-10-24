import os
import json
import uuid
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from llm import llm, Busy, stats
import docs as docs_mod
from fastapi import UploadFile, File, Form, HTTPException

app = FastAPI(title="vidhi")

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGIN", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Busy)
async def busy_handler(request: Request, exc: Busy):
    return JSONResponse(status_code=429, content={"error": "busy", "retry_after": 30})

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/stats")
def get_stats():
    return stats

@app.post("/upload")
async def upload(file: UploadFile = File(...), role: str = Form("reference")):
    if role not in ("reference", "source"):
        role = "reference"
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="file too large (max 5 MB)")
    suffix = Path(file.filename).suffix or ".bin"
    path = docs_mod.UPLOAD_DIR / f"{uuid.uuid4().hex[:12]}{suffix}"
    path.write_bytes(data)
    try:
        doc = docs_mod.ingest(path, role)
    except docs_mod.NoText:
        raise HTTPException(status_code=422, detail="no extractable text")
    return {"doc_id": doc["doc_id"], "tokens_full": doc["tokens_full"]}


@app.post("/chat")
async def chat(payload: dict):
    message = payload.get("message", "")
    tier = payload.get("tier", "advanced")
    if tier not in ("quick", "balanced", "advanced"):
        tier = "advanced"
    system = "You are a legal drafting assistant for Indian law. Use headings and numbered clauses. Never invent case names, citations or section numbers; if unsure write [VERIFY]."
    prompt = f"Draft the following request:\n\n{message}"
    draft = llm(tier, system, prompt)
    return {"draft": draft, "skill": None, "tokens_full": len(message) // 4, "tokens_sent": len(system + prompt) // 4}
