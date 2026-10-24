import re
import uuid
from pathlib import Path
from rank_bm25 import BM25Okapi
from markitdown import MarkItDown

_md = MarkItDown()

# doc_id -> {"bm25": BM25Okapi, "chunks": [str], "markdown": str, "tokens_full": int, "role": str}
DOCS = {}
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


class NoText(Exception):
    pass


def _tokenize(text):
    return re.findall(r"\w+", text.lower())


def _chunk(markdown):
    sections = re.split(r"(?m)^(#{1,6}\s+.*)$", markdown)
    pieces = []
    if len(sections) > 1:
        i = 1
        while i < len(sections):
            heading, body = sections[i], sections[i + 1] if i + 1 < len(sections) else ""
            pieces.append(heading + "\n" + body)
            i += 2
    else:
        pieces = [markdown]
    chunks = []
    for piece in pieces:
        words = piece.split()
        for j in range(0, len(words), 400):
            chunks.append(" ".join(words[j:j + 400]))
    return [c for c in chunks if c.strip()]


def ingest(path: Path, role: str) -> dict:
    result = _md.convert(str(path))
    markdown = (result.text_content or "").strip()
    if len(markdown) < 20:
        raise NoText()
    chunks = _chunk(markdown)
    if not chunks:
        raise NoText()
    bm25 = BM25Okapi([_tokenize(c) for c in chunks])
    doc_id = uuid.uuid4().hex[:12]
    DOCS[doc_id] = {
        "bm25": bm25,
        "chunks": chunks,
        "markdown": markdown,
        "tokens_full": len(markdown) // 4,
        "role": role,
    }
    return DOCS[doc_id] | {"doc_id": doc_id}


def get(doc_id: str):
    return DOCS.get(doc_id)


def retrieve(query: str, doc_ids, k=4):
    out = []
    for doc_id in doc_ids or []:
        doc = DOCS.get(doc_id)
        if not doc:
            continue
        scores = doc["bm25"].get_scores(_tokenize(query))
        ranked = sorted(range(len(doc["chunks"])), key=lambda i: -scores[i])[:k]
        out.extend(doc["chunks"][i] for i in ranked)
    return out[:k]


def first_words(doc_id: str, n=3000):
    doc = DOCS.get(doc_id)
    if not doc:
        return ""
    words = doc["markdown"].split()
    return " ".join(words[:n])
