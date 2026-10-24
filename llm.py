import os, json, hashlib, time, threading
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
from google import genai
from google.genai import types

load_dotenv()

CACHE = Path(os.getenv("CACHE_DIR", "demo_cache")); CACHE.mkdir(exist_ok=True)
MODELS = {t: os.getenv(f"MODEL_{t.upper()}") for t in ("quick", "balanced", "advanced")}
CHAIN = {"advanced": ["advanced", "balanced", "quick"], "balanced": ["balanced", "quick"], "quick": ["quick"]}
CAP = {"quick": 1500, "balanced": 800, "advanced": 3000}
_groq = Groq(api_key=os.getenv("GROQ_API_KEY") or "missing")
_gem = genai.Client(api_key=os.getenv("GEMINI_API_KEY") or "missing")
stats = {"calls": {"quick": 0, "balanced": 0, "advanced": 0}, "cache_hits": 0, "errors": 0}
_lock = threading.Lock()

class Busy(Exception):
    pass

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
    return r.choices[0].message.content

def llm(tier, system, user, max_tokens=None):
    mt = min(max_tokens or CAP[tier], CAP[tier])
    key = hashlib.sha256(json.dumps([tier, system, user, mt]).encode()).hexdigest()
    f = CACHE / f"{key}.json"
    if f.exists():
        with _lock: stats["cache_hits"] += 1
        return json.loads(f.read_text())["text"]
    for t in CHAIN[tier]:
        for attempt in (0, 1):
            try:
                text = _call(t, system, user, min(mt, CAP[t]))
                with _lock: stats["calls"][t] += 1
                f.write_text(json.dumps({"text": text}))
                return text
            except Exception:
                with _lock: stats["errors"] += 1
                if attempt == 0: time.sleep(2)
    raise Busy()
