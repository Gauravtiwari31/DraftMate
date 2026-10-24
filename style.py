import json
from llm import llm

FIELDS = ("tone", "heading_pattern", "defined_terms_style", "clause_patterns", "formatting_rules")


def extract(doc_id, docs_mod):
    text = docs_mod.first_words(doc_id, 3000)
    if not text:
        return None
    system = (
        "You analyse the writing style of a legal document. "
        'Return ONLY JSON {"tone":str,"heading_pattern":str,"defined_terms_style":str,'
        '"clause_patterns":[str],"formatting_rules":[str]} describing the document\'s drafting style. '
        "Do not analyse substance, only style."
    )
    for _ in (0, 1):
        try:
            out = llm("advanced", system, text, max_tokens=600)
            m = json.loads(out[out.find("{"):out.rfind("}") + 1])
            if all(f in m for f in FIELDS):
                return m
        except Exception:
            continue
    return None


def inject_block(style):
    if not style:
        return ""
    lines = [
        f"Tone: {style.get('tone', '')}",
        f"Heading pattern: {style.get('heading_pattern', '')}",
        f"Defined terms style: {style.get('defined_terms_style', '')}",
        "Clause patterns: " + "; ".join(style.get("clause_patterns", [])[:3]),
        "Formatting rules: " + "; ".join(style.get("formatting_rules", [])[:3]),
        "Preserve substantive meaning; change style only.",
    ]
    return "\n".join(lines)
