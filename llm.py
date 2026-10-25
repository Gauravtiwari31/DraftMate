import os, json, hashlib, time, threading
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
from google import genai
from google.genai import types

load_dotenv()

CACHE = Path(os.getenv("CACHE_DIR", "demo_cache").strip() or "demo_cache"); CACHE.mkdir(exist_ok=True)
MODELS = {t: os.getenv(f"MODEL_{t.upper()}") for t in ("quick", "balanced", "advanced")}
CHAIN = {"advanced": ["advanced", "balanced", "quick"], "balanced": ["balanced", "quick"], "quick": ["quick"]}
CAP = {"quick": 1500, "balanced": 800, "advanced": 3000}
_groq = Groq(api_key=os.getenv("GROQ_API_KEY") or "missing")
_gem = genai.Client(api_key=os.getenv("GEMINI_API_KEY") or "missing")
stats = {"calls": {"quick": 0, "balanced": 0, "advanced": 0}, "cache_hits": 0, "errors": 0}
_lock = threading.Lock()

class Busy(Exception):
    pass


def model_label(model):
    """Display name for a model id from .env, e.g. 'openai/gpt-oss-120b' -> 'GPT-OSS 120B'."""
    if not model:
        return "Not configured"
    words = model.split("/")[-1].replace("-", " ").split()
    out = []
    for w in words:
        if w.lower() in ("gpt", "oss") or (w[:-1].isdigit() and w[-1].lower() == "b"):
            out.append(w.upper())
        else:
            out.append(w.capitalize())
    label = " ".join(out).replace("GPT OSS", "GPT-OSS")
    return label


def provider(model):
    return "Google Gemini" if "gemini" in (model or "") else "Groq"

def _call(tier, system, user, max_tokens):
    if "gemini" in (MODELS[tier] or ""):
        cfg = types.GenerateContentConfig(system_instruction=system, max_output_tokens=max_tokens,
                                          thinking_config=types.ThinkingConfig(thinking_budget=0))
        r = _gem.models.generate_content(model=MODELS[tier], contents=user, config=cfg)
        if not r.text:
            raise RuntimeError("empty gemini response")
        return r.text
    r = _groq.chat.completions.create(model=MODELS[tier], max_tokens=max_tokens,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}])
    content = r.choices[0].message.content
    if not content:
        raise RuntimeError("empty groq response")
    return content

def llm(tier, system, user, max_tokens=None, cap=True):
    # cap=False lets callers that must return a whole document (e.g. /edit) exceed the tier cap
    mt = min(max_tokens or CAP[tier], CAP[tier]) if cap else (max_tokens or CAP[tier])
    key = hashlib.sha256(json.dumps([tier, system, user, mt]).encode()).hexdigest()
    f = CACHE / f"{key}.json"
    if f.exists():
        try:
            text = json.loads(f.read_text())["text"]
            with _lock: stats["cache_hits"] += 1
            return text
        except Exception:
            pass  # corrupt cache entry: fall through and refetch
    for t in CHAIN[tier]:
        for attempt in (0, 1):
            try:
                text = _call(t, system, user, min(mt, CAP[t]) if cap else mt)
                with _lock: stats["calls"][t] += 1
                f.write_text(json.dumps({"text": text}))
                return text
            except Exception:
                with _lock: stats["errors"] += 1
                if attempt == 0: time.sleep(2)
    raise Busy()
