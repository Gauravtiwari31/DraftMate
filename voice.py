import json
from llm import llm
from skills import real_ids

ACTIONS = ("dictate", "edit", "use_skill", "verify", "export", "overwrite", "delete", "undo")


def _parse(out):
    m = json.loads(out[out.find("{"):out.rfind("}") + 1])
    action = m.get("action", "none")
    if action not in ACTIONS:
        action = "none"
    return {
        "action": action,
        "skill": m.get("skill"),
        "text": m.get("text"),
        "needs_confirm": bool(m.get("needs_confirm")),
        "message": m.get("message"),
    }


def parse_action(transcript, draft):
    system = (
        "You convert a spoken or typed command about a legal draft into an action. "
        'Return ONLY JSON {"action":"dictate"|"edit"|"use_skill"|"verify"|"export"|"overwrite"|"delete"|"undo"|"none",'
        '"skill":string|null,"text":string|null,"needs_confirm":bool,"message":string|null}. '
        "Rules: raw dictation to add to the draft -> dictate (text=the dictated words). "
        "A change request for the existing draft -> edit (text=the instruction). "
        "A request to invoke a drafting skill -> use_skill (skill=one of " + ", ".join(real_ids()) + "). "
        "Check citations -> verify. Export as DOCX -> export. "
        "Replace the entire draft with words the user dictates -> overwrite (text=those words). "
        "Replace, redo or start over with a new document of some type (e.g. 'replace the draft with an NDA', "
        "'start over with a legal notice') -> use_skill with the matching skill. Delete everything -> delete. "
        "Undo the last change -> undo. Unrecognised -> none (message=short explanation)."
    )
    user = f"Command: {transcript}\n\nCurrent draft (first 500 chars): {draft[:500]}"
    for _ in (0, 1):
        try:
            out = llm("quick", system, user, max_tokens=500)
            return _parse(out)
        except Exception:
            continue
    return {"action": "none", "skill": None, "text": None, "needs_confirm": False,
            "message": "Command not understood. Try: 'make clause 3 shorter', 'delete the draft', 'verify citations', 'export to Word'."}


def voice(transcript, draft):
    result = parse_action(transcript, draft)
    if result["action"] in ("overwrite", "delete"):
        result["needs_confirm"] = True
    return result
