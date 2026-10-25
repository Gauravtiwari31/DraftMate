import json
import re
from pathlib import Path
from llm import llm

DATA = Path(__file__).parent / "skills_data"
_cache = None


def _ensure():
    global _cache
    if _cache is None:
        _cache = {}
        for f in sorted(DATA.glob("*.json")):
            try:
                s = json.loads(f.read_text(encoding="utf-8"))
                _cache[s["id"]] = s
            except Exception:
                pass
    return _cache


def all_skills():
    return list(_ensure().values())


def real_ids():
    return [s["id"] for s in _ensure().values() if not s.get("stub")]


def get(skill_id):
    return _ensure().get(skill_id)


def parse_tag(message):
    """First @tag naming a known skill (stub or not); callers reject stubs."""
    for tag in re.findall(r"@([\w-]+)", message):
        if tag in _ensure():
            return tag
    return None


def is_stub(skill_id):
    s = get(skill_id)
    return bool(s and s.get("stub"))


def classify(message):
    real = [s for s in _ensure().values() if not s.get("stub")]
    system = (
        "You route Indian legal drafting requests to one skill. "
        "Reply with ONLY the skill id or 'general'. Skill ids: "
        + ", ".join(s["id"] for s in real)
    )
    try:
        out = llm("quick", system, message, max_tokens=500)
        out = out.strip().strip('"').strip("'").lower()
        if out in _ensure() and not _ensure()[out].get("stub"):
            return out
    except Exception:
        pass
    return None


def build_prompt(skill_id, message, chunks=None, style_block=""):
    skill = get(skill_id) if skill_id else None
    system = (
        "You are a legal drafting assistant for Indian law. Use headings and numbered clauses. "
        "Never invent case names, citations or section numbers; if unsure write [VERIFY]."
    )
    if skill:
        system = skill["system"]
    if style_block:
        system = system + "\n\n" + style_block
    parts = []
    if chunks:
        parts.append("Reference material:\n" + "\n---\n".join(chunks))
    parts.append(message)
    return skill, system, "\n\n".join(parts)
