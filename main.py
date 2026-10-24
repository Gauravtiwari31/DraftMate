import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from llm import llm, Busy, stats

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
