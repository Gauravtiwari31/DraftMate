// Local, instant prompt-strength score: one point group per thing a legal request usually needs.
const CHECKS = [
  { pts: 15, ok: (t) => /\b(draft|review|redline|summari[sz]e|analy[sz]e|research|prepare|write|check)\b/i.test(t),
    tip: "Say what you want done: draft, review, summarise, analyse or research." },
  { pts: 15, ok: (t, c) => !!c.skill, tip: "Pick a skill or type @ to route the request to the right legal workflow." },
  { pts: 15, ok: (t) => /\b(india|delhi|mumbai|bengaluru|bangalore|chennai|kolkata|pune|hyderabad|lucknow|noida|gurugram|state of|high court|supreme court|district|tribunal|act|section)\b/i.test(t),
    tip: "Add the jurisdiction (state, city or court) and any Act that applies." },
  { pts: 15, ok: (t) => /\b(v\.?|vs\.?|between|tenant|landlord|employer|employee|company|client|buyer|seller|builder|contractor|petitioner|respondent|party|parties|mr|ms|m\/s)\b/i.test(t),
    tip: "Name the parties and their roles (e.g. landlord and tenant)." },
  { pts: 15, ok: (t) => /(rs\.?|₹|inr|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(19|20)\d{2}\b|\b\d+\s*(days|months|years)\b|\d[\d,]{3,})/i.test(t),
    tip: "Include key amounts and dates." },
  { pts: 10, ok: (t) => t.trim().length >= 80, tip: "Add more facts — a couple of sentences of background helps." },
  { pts: 15, ok: (t, c) => c.docs > 0, tip: "Attach a reference or source document so the draft follows your style and facts." },
];

export function scorePrompt(text, ctx) {
  if (!text.trim()) return { score: 0, tip: "Add the purpose, jurisdiction and specific requirements to get a more accurate response." };
  let score = 0;
  let tip = null;
  for (const c of CHECKS) {
    if (c.ok(text, ctx)) score += c.pts;
    else if (!tip) tip = c.tip;
  }
  return { score: Math.min(100, score), tip: tip || "Looks complete. Review placeholders before sending." };
}
