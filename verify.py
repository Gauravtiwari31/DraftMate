import hashlib
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from dotenv import load_dotenv
from llm import llm, Busy

load_dotenv()

ALLOWED_DOMAINS = ["indiankanoon.org", "indiacode.nic.in", "sci.gov.in"]
CACHE = Path(os.getenv("CACHE_DIR", "demo_cache")); CACHE.mkdir(exist_ok=True)
_tavily = None


def _client():
    global _tavily
    if _tavily is None:
        from tavily import TavilyClient
        _tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY") or "missing")
    return _tavily


def _tavily_search(query):
    # disk cache on every Tavily call
    key = hashlib.sha256(query.encode()).hexdigest()
    f = CACHE / f"tavily_{key}.json"
    if f.exists():
        return json.loads(f.read_text())
    r = _client().search(query=query, include_domains=ALLOWED_DOMAINS, max_results=3)
    results = [
        {"title": x.get("title", ""), "url": x.get("url", ""), "snippet": (x.get("content") or "")[:300]}
        for x in r.get("results", [])
    ]
    f.write_text(json.dumps(results))
    return results


def _extract_citations(text):
    system = (
        "Extract every legal citation from the text: case citations (e.g. 'Kesavananda Bharati v. State of Kerala, "
        "(1973) 4 SCC 225'), statute sections (e.g. 'Section 27, Indian Contract Act, 1872'). "
        'Return ONLY a JSON array, each item {"raw":str,"case":str|null,"year":int|null,"reporter":str|null,"court":str|null,"section":str|null}. '
        "If there are no citations return []."
    )
    out = llm("quick", system, text)
    try:
        start, end = out.find("["), out.rfind("]")
        data = json.loads(out[start:end + 1])
        return [c for c in data if isinstance(c, dict) and c.get("raw")]
    except Exception:
        return None


def _match_citation(citation, results):
    system = (
        "You check whether a search result confirms a legal citation. "
        'Return ONLY JSON {"match":"full"|"partial"|"none","index":0,"reason":"one short sentence"}. '
        "index is the 0-based index of the best matching result (0 if none match)."
    )
    user = (
        f"Citation: {citation}\n\nSearch results:\n"
        + "\n\n".join(
            f"[{i}] {r['title']}\n{r['url']}\n{r['snippet']}" for i, r in enumerate(results[:3])
        )
    )
    out = llm("quick", system, user)
    m = json.loads(out[out.find("{"):out.rfind("}") + 1])
    match = m.get("match", "none")
    if match not in ("full", "partial", "none"):
        match = "none"
    index = m.get("index", 0)
    if not isinstance(index, int) or not 0 <= index <= 2:
        index = 0
    return match, index, str(m.get("reason", ""))


def status(match, url):
    if match == "full" and url and any(d in url for d in ALLOWED_DOMAINS):
        return "Verified"
    if match == "partial" and url:
        return "Partially Verified"
    return "Unverified"


def _check_one(citation):
    item = {"citation": citation["raw"], "status": "Could not check", "url": None, "reason": "check failed"}
    try:
        results = _tavily_search(citation["raw"])
    except Exception:
        item = {"citation": citation["raw"], "status": "Could not check", "url": None, "reason": "search unavailable"}
        return item
    if not results:
        return {"citation": citation["raw"], "status": "Unverified", "url": None, "reason": "no source found"}
    try:
        match, index, reason = _match_citation(citation["raw"], results)
    except Exception:
        return {"citation": citation["raw"], "status": "Could not check", "url": None, "reason": "could not compare citation"}
    url = results[index]["url"] if index < len(results) else None
    if match == "none":
        return {"citation": citation["raw"], "status": "Unverified", "url": None, "reason": reason or "no matching source"}
    return {"citation": citation["raw"], "status": status(match, url), "url": url, "reason": reason}


def check(citation_raw):
    return _check_one({"raw": citation_raw})


def verify(text):
    citations = _extract_citations(text)
    if citations is None:
        # retry once on bad extraction JSON
        citations = _extract_citations(text)
    if citations is None:
        raise Busy()
    with ThreadPoolExecutor(max_workers=5) as ex:
        return list(ex.map(_check_one, citations))
