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
import style as style_mod
import verify as verify_mod
import voice as voice_mod
from export_docx import export_docx
from fastapi import UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse

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
    result = {"doc_id": doc["doc_id"], "tokens_full": doc["tokens_full"]}
    if role == "reference":
        try:
            s = style_mod.extract(doc["doc_id"], docs_mod)
            if s:
                doc["style"] = s
                result["style"] = s
        except Exception:
            pass
    return result


@app.get("/skills")
def get_skills():
    return [
        {"id": s["id"], "name": s["name"], "category": s.get("category", ""), "description": s.get("description", ""), "stub": bool(s.get("stub"))}
        for s in skills_mod.all_skills()
    ]


@app.post("/edit")
async def edit(payload: dict):
    instruction = payload.get("instruction", "")
    draft = payload.get("draft", "")
    if not draft:
        raise HTTPException(status_code=422, detail="no draft to edit")
    system = (
        "You are an Indian legal drafting assistant. Apply this instruction to the draft and return "
        "the FULL revised draft. Keep everything not covered by the instruction unchanged. "
        "Never invent case names, citations or section numbers; if unsure write [VERIFY]."
    )
    revised = llm("advanced", system, f"Instruction: {instruction}\n\nDraft:\n{draft}")
    return {"draft": revised}


@app.post("/verify")
async def verify(payload: dict):
    text = payload.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=422, detail="no text to verify")
    try:
        return verify_mod.verify(text)
    except Busy:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="verification unavailable")


@app.post("/voice")
async def voice(payload: dict):
    transcript = payload.get("transcript", "")
    if not transcript.strip():
        raise HTTPException(status_code=422, detail="empty transcript")
    return voice_mod.voice(transcript, payload.get("draft", ""))


@app.post("/export")
async def export(payload: dict):
    draft = payload.get("draft", "")
    if payload.get("format") != "docx":
        raise HTTPException(status_code=422, detail="only docx export is supported")
    if not draft.strip():
        raise HTTPException(status_code=422, detail="no draft to export")
    import uuid as _uuid
    p = docs_mod.UPLOAD_DIR / f"export_{_uuid.uuid4().hex[:8]}.docx"
    export_docx(draft, p)
    return FileResponse(p, filename="vidhi_draft.docx",
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")


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
    style_block = ""
    for d in doc_ids:
        doc = docs_mod.get(d)
        if doc and doc.get("role") == "reference" and doc.get("style"):
            style_block = style_mod.inject_block(doc["style"])
            break
    skill, system, user = skills_mod.build_prompt(skill_id, message, chunks, style_block)
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
