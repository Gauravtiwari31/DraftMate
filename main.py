import io
import os
import uuid
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from llm import llm, Busy, stats, MODELS, model_label, provider
import docs as docs_mod
import skills as skills_mod
import style as style_mod
import verify as verify_mod
import voice as voice_mod
from export_docx import export_docx
from fastapi import UploadFile, File, Form, HTTPException
from fastapi.responses import Response

app = FastAPI(title="DraftMate")

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGIN", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_UPLOADS = {".pdf", ".docx", ".txt", ".md"}
MAX_UPLOAD = 5 * 1024 * 1024
TIERS = ("quick", "balanced", "advanced")


def _text(payload, key):
    """String field from a JSON body; None/missing -> "", any other type -> 422."""
    v = payload.get(key)
    if v is None:
        return ""
    if not isinstance(v, str):
        raise HTTPException(status_code=422, detail=f"'{key}' must be a string")
    return v


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
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_UPLOADS:
        raise HTTPException(status_code=415, detail="unsupported file type (use PDF, DOCX, TXT or MD)")
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="file too large (max 5 MB)")
    path = docs_mod.UPLOAD_DIR / f"{uuid.uuid4().hex[:12]}{suffix}"
    path.write_bytes(data)
    try:
        doc = docs_mod.ingest(path, role)
    except docs_mod.NoText:
        raise HTTPException(status_code=422, detail="no extractable text")
    except Exception:
        raise HTTPException(status_code=422, detail="could not read this file")
    finally:
        # the markdown is kept in memory; the raw upload is not needed
        path.unlink(missing_ok=True)
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


MODEL_NOTES = {
    "quick": "Faster responses, short outputs",
    "balanced": "Balanced and versatile",
    "advanced": "Best for full legal drafts and analysis",
}


@app.get("/models")
def get_models():
    return [
        {"tier": t, "model": MODELS[t], "label": model_label(MODELS[t]), "provider": provider(MODELS[t]),
         "description": MODEL_NOTES[t]}
        for t in ("advanced", "balanced", "quick")
    ]


@app.post("/improve")
async def improve(payload: dict):
    message = _text(payload, "message")
    if not message.strip():
        raise HTTPException(status_code=422, detail="empty message")
    system = (
        "You improve requests sent to an Indian legal drafting assistant. Rewrite the user's request so it states: "
        "the task and purpose, jurisdiction (India, plus state/court if relevant), the parties, key facts, amounts and "
        "dates, and the desired output format. Keep every fact the user gave; never invent facts, names, amounts, "
        "citations or section numbers; write [placeholders] for missing details. Keep any @skill tag at the start. "
        "Return ONLY the rewritten request, at most 120 words."
    )
    out = llm("quick", system, message, max_tokens=1000).strip().strip('"')
    tag = skills_mod.parse_tag(message)
    if tag and f"@{tag}" not in out:
        out = f"@{tag} {out}"
    return {"message": out}


@app.get("/skills")
def get_skills():
    return [
        {"id": s["id"], "name": s["name"], "category": s.get("category", ""), "description": s.get("description", ""), "stub": bool(s.get("stub"))}
        for s in skills_mod.all_skills()
    ]


@app.post("/edit")
async def edit(payload: dict):
    instruction = _text(payload, "instruction")
    draft = _text(payload, "draft")
    if not draft.strip():
        raise HTTPException(status_code=422, detail="no draft to edit")
    system = (
        "You are an Indian legal drafting assistant. Apply this instruction to the draft and return "
        "the FULL revised draft. Keep everything not covered by the instruction unchanged. "
        "Never invent case names, citations or section numbers; if unsure write [VERIFY]."
    )
    # the model returns the whole draft, so the output budget must fit it (~4 chars/token + headroom)
    budget = max(3000, len(draft) // 3 + 500)
    if budget > 16000:
        raise HTTPException(status_code=413, detail="draft too long to edit in one pass; edit a section at a time")
    revised = llm("advanced", system, f"Instruction: {instruction}\n\nDraft:\n{draft}", max_tokens=budget, cap=False)
    return {"draft": revised}


@app.post("/verify")
async def verify(payload: dict):
    text = _text(payload, "text")
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
    transcript = _text(payload, "transcript")
    if not transcript.strip():
        raise HTTPException(status_code=422, detail="empty transcript")
    return voice_mod.voice(transcript, _text(payload, "draft"))


@app.post("/export")
async def export(payload: dict):
    draft = _text(payload, "draft")
    if payload.get("format") != "docx":
        raise HTTPException(status_code=422, detail="only docx export is supported")
    if not draft.strip():
        raise HTTPException(status_code=422, detail="no draft to export")
    buf = io.BytesIO()
    export_docx(draft, buf)
    return Response(buf.getvalue(),
                    media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    headers={"Content-Disposition": 'attachment; filename="draftmate_draft.docx"'})


@app.post("/chat")
async def chat(payload: dict):
    message = _text(payload, "message")
    if not message.strip():
        raise HTTPException(status_code=422, detail="empty message")
    doc_ids = payload.get("doc_ids") or []
    if not isinstance(doc_ids, list):
        doc_ids = []
    doc_ids = [d for d in doc_ids if isinstance(d, str)]
    requested = payload.get("skill")
    skill_id = requested if isinstance(requested, str) and skills_mod.get(requested) else None
    skill_id = skill_id or skills_mod.parse_tag(message)
    if skill_id and skills_mod.is_stub(skill_id):
        raise HTTPException(status_code=422, detail=f"skill '{skill_id}' is coming soon")
    if not skill_id:
        skill_id = skills_mod.classify(message)
    chunks = docs_mod.retrieve(message, doc_ids, k=4, whole=bool((skills_mod.get(skill_id) or {}).get("whole_doc")))
    style_block = ""
    for d in doc_ids:
        doc = docs_mod.get(d)
        if doc and doc.get("role") == "reference" and doc.get("style"):
            style_block = style_mod.inject_block(doc["style"])
            break
    skill, system, user = skills_mod.build_prompt(skill_id, message, chunks, style_block)
    # an explicit model choice from the UI wins; "auto"/missing uses the skill's default tier
    tier = payload.get("tier")
    if tier not in TIERS:
        tier = skill["tier"] if skill else "advanced"
    draft = llm(tier, system, user, max_tokens=skill["max_tokens"] if skill else None)
    tokens_full = sum((docs_mod.get(d) or {}).get("tokens_full", 0) for d in doc_ids) + len(message) // 4
    return {
        "draft": draft,
        "skill": skill_id,
        "tokens_full": tokens_full,
        "tokens_sent": len(system + user) // 4,
    }
