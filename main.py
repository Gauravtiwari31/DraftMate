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
import skills as skills_mod
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


@app.get("/skills")
def get_skills():
    return [
        {"id": s["id"], "name": s["name"], "category": s.get("category", ""), "description": s.get("description", ""), "stub": bool(s.get("stub"))}
        for s in skills_mod.all_skills()
    ]


@app.post("/chat")
async def chat(payload: dict):
    message = payload.get("message", "")
    doc_ids = payload.get("doc_ids") or []
    if not isinstance(doc_ids, list):
        doc_ids = []
    skill_id = payload.get("skill") or skills_mod.parse_tag(message)
    if not skill_id:
        skill_id = skills_mod.classify(message)
    chunks = docs_mod.retrieve(message, doc_ids, k=4)
    skill, system, user = skills_mod.build_prompt(skill_id, message, chunks)
    tier = skill["tier"] if skill else payload.get("tier", "advanced")
    if tier not in ("quick", "balanced", "advanced"):
        tier = "advanced"
    draft = llm(tier, system, user, max_tokens=skill["max_tokens"] if skill else None)
    tokens_full = sum((docs_mod.get(d) or {}).get("tokens_full", 0) for d in doc_ids) + len(message) // 4
    return {
        "draft": draft,
        "skill": skill_id,
        "tokens_full": tokens_full,
        "tokens_sent": len(system + user) // 4,
    }
