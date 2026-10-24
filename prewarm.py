"""Run the demo flow once against a local server to fill demo_cache."""
import json
import sys
import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"


def main():
    ok = True
    r = requests.get(BASE + "/health", timeout=60)
    print("health:", r.status_code, r.json())
    with open("samples/reference_nda.docx", "rb") as f:
        r = requests.post(BASE + "/upload", files={"file": f}, data={"role": "reference"}, timeout=120)
    print("upload:", r.status_code, r.json())
    doc_id = r.json()["doc_id"]
    r = requests.post(BASE + "/chat", json={
        "message": "@legal_notice My tenant has not paid rent of Rs 90,000 for six months in Pune. Draft a recovery notice.",
        "tier": "advanced", "doc_ids": [doc_id],
    }, timeout=300)
    print("chat:", r.status_code, "skill:", r.json().get("skill"))
    draft = r.json()["draft"]
    r = requests.post(BASE + "/edit", json={"instruction": "make the demand paragraph shorter and more formal", "draft": draft}, timeout=300)
    print("edit:", r.status_code)
    r = requests.post(BASE + "/verify", json={"text": draft + "\nReference: Kesavananda Bharati v. State of Kerala, (1973) 4 SCC 225.\nAlso see Vishaka Sharma v. State of Rajasthan, (1997) 6 SCC 241."}, timeout=300)
    print("verify:", r.status_code, r.json())
    r = requests.post(BASE + "/export", json={"draft": draft, "format": "docx"}, timeout=120)
    print("export:", r.status_code, len(r.content), "bytes")
    if ok:
        print("prewarm complete")


if __name__ == "__main__":
    main()
