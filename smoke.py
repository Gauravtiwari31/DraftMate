"""Smoke test: smoke.py <BASE_URL> — health, skills, chat, verify."""
import sys
import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"


def main():
    passed = True

    r = requests.get(BASE + "/health", timeout=60)
    print(f"health: {r.status_code} {r.text[:100]}")
    passed &= r.status_code == 200 and r.json().get("ok") is True

    r = requests.get(BASE + "/skills", timeout=60)
    skills = r.json() if r.status_code == 200 else []
    real = [s for s in skills if not s.get("stub")]
    print(f"skills: {r.status_code} total={len(skills)} real={len(real)}")
    passed &= r.status_code == 200 and len(real) >= 6

    r = requests.post(BASE + "/chat", json={
        "message": "@legal_notice Draft a one-paragraph rent recovery notice for Rs 50,000.",
        "tier": "advanced", "doc_ids": [],
    }, timeout=300)
    body = r.json()
    print(f"chat: {r.status_code} skill={body.get('skill')} draft_chars={len(body.get('draft') or '')}")
    passed &= r.status_code == 200 and len(body.get("draft") or "") > 50

    r = requests.post(BASE + "/verify", json={
        "text": "See Kesavananda Bharati v. State of Kerala, (1973) 4 SCC 225.",
    }, timeout=300)
    print(f"verify: {r.status_code} {r.text[:200]}")
    passed &= r.status_code == 200 and isinstance(r.json(), list)

    r = requests.get(BASE + "/stats", timeout=60)
    print(f"stats: {r.status_code} {r.text}")
    passed &= r.status_code == 200

    print("SMOKE:", "PASS" if passed else "FAIL")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
