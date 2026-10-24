import os, time
from dotenv import load_dotenv

load_dotenv()

QUICK = os.getenv("MODEL_QUICK", "llama-3.1-8b-instant")
BALANCED = os.getenv("MODEL_BALANCED", "llama-3.3-70b-versatile")
ADVANCED = os.getenv("MODEL_ADVANCED", "gemini-2.5-flash")


def check_groq(model):
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return False, 0.0, "GROQ_API_KEY missing"
    from groq import Groq
    client = Groq(api_key=key)
    t0 = time.time()
    r = client.chat.completions.create(
        model=model,
        max_tokens=500,
        messages=[{"role": "user", "content": "Reply with the single word: ok"}],
    )
    dt = time.time() - t0
    return bool(r.choices[0].message.content), dt, r.choices[0].message.content


def check_gemini(model):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return False, 0.0, "GEMINI_API_KEY missing"
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=key)
    t0 = time.time()
    cfg = types.GenerateContentConfig(
        system_instruction="Reply with the single word: ok",
        max_output_tokens=100,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )
    r = client.models.generate_content(model=model, contents="ping", config=cfg)
    dt = time.time() - t0
    return bool(r.text), dt, r.text


def main():
    tiers = [("quick", QUICK), ("balanced", BALANCED), ("advanced", ADVANCED)]
    for tier, model in tiers:
        try:
            if "gemini" in model:
                ok, dt, detail = check_gemini(model)
            else:
                ok, dt, detail = check_groq(model)
            print(f"tier={tier} model={model} ok={ok} latency={dt:.2f}s detail={detail!r}")
        except Exception as e:
            print(f"tier={tier} model={model} ok=False error={type(e).__name__}: {str(e)[:120]}")


if __name__ == "__main__":
    main()
