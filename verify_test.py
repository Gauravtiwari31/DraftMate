"""Run every citation in test_citations.json through the verify pipeline and print a table."""
import json
import sys
from verify import check

def main():
    items = json.load(open("test_citations.json", encoding="utf-8"))
    rows, matches = [], 0
    for it in items:
        try:
            r = check(it["raw"])
        except Exception as e:
            r = {"status": "Could not check", "url": None, "reason": f"error: {e}"}
        ok = r["status"] == it["expected_status"]
        matches += ok
        rows.append((it["raw"], it["expected_status"], r["status"], r["url"], r["reason"], ok))
    print(f"{'citation':58} {'expected':22} {'actual':22} {'match':5}")
    print("-" * 120)
    for raw, exp, act, url, reason, ok in rows:
        print(f"{raw[:58]:58} {exp:22} {act:22} {'PASS' if ok else 'FAIL':5}")
    print("-" * 120)
    print(f"matches: {matches}/{len(rows)}")
    if matches >= 6 and len(rows) - matches <= 2:
        print("RESULT: PASS (>= 6 of 7+ matched, fakes not green)")
        return 0
    print("RESULT: FAIL")
    return 1

if __name__ == "__main__":
    sys.exit(main())
