# RS1–RS6 + PKP Integration (Machine-Ready)

This folder contains:

- `PKP_RS1-6_v1.0.0.json` — a structured PKP object representing **one RS1–RS6 cycle** (and a reusable schema)
- `README_RS1-6.md` — what RS1–RS6 is, how to run it, and how it maps into PKP

---

## What is RS1–RS6?

RS1–RS6 is a **daily decision loop** for uncertain environments (markets, product launches, GTM, etc.).  
It separates observation from action so the system remains stable under stress:

1. **RS1 — Regime:** What environment are we operating in? (risk-on, risk-off, chop, etc.)
2. **RS2 — Signals:** What observations support/contradict that regime?
3. **RS3 — Risks:** What can break the thesis (and what are mitigations)?
4. **RS4 — Strategy:** What is the plan (portfolio posture + tactics)?
5. **RS5 — Risk Controls:** What hard constraints prevent blowups?
6. **RS6 — Steps:** What actions happen now, and what outputs must be captured?

**RS is not prediction. RS is process.**

---

## Why PKP?

PKP (Portable Knowledge Protocol) converts the RS loop into a portable artifact that other LLMs/agents can ingest.

- RS1–RS6 is the **loop**
- PKP is the **structure** that stores the loop
- Together they form a **portable decision OS**

---

## How RS1–RS6 is represented in PKP

The JSON has two top-level blocks:

- `pkp` — metadata, scope, glossary, schema notes (portable definitions)
- `instance` — one concrete run (inputs → RS loop → steps)

Inside `instance.rs_loop`, you will find:

- `RS1_regime`: label, hypotheses, confidence, evidence[]
- `RS2_signals`: a list of signals with reading + timeframe + notes + evidence[]
- `RS3_risks`: risk register entries (impact/likelihood/mitigation)
- `RS4_strategy`: portfolio plan (core + dry powder + trading sleeve)
- `RS5_risk_controls`: hard rules (max loss/day, max trades/day, sizing)
- `RS6_steps`: action plan (today, next 24–48h, required outputs)

---

## Evidence objects

Every RS block includes `evidence: []`.

Use a lightweight evidence object format:

```json
{{
  "type": "url|screenshot|note|market_data",
  "ref": "https://... or internal_ref",
  "summary": "One sentence",
  "timestamp": "2026-01-07T11:51:07-05:00"
}}
```

---

## Daily operating flow (recommended)

1) **Populate Inputs**
- account snapshot (balances, constraints, runway)
- market snapshot (SPY/QQQ/TLT/VIX, yields, calendar events, key levels)

2) **RS1: Name the regime**
- choose ONE label
- write 1–3 hypotheses

3) **RS2: Record signals**
- only include what you actually observe
- keep the set small (5–10 max)

4) **RS3: List risks**
- if you can’t state the mitigation, it isn’t actionable

5) **RS4: Define strategy**
- separate **long-term compounding** from **tactical optionality** from **intraday trading**

6) **RS5: Enforce constraints**
- hard daily loss limits
- max trades/day
- sizing method
- stop rules

7) **RS6: Output steps + required artifacts**
- positions screenshot
- open orders confirmation
- trade journal row (if any)

---

## How this applies to the Co_ Investor Agent context

The system is intentionally split:

- **Rollover IRA:** Barbell (core invested + substantial dry powder)
- **Roth IRA:** allocate after confirming holdings and contribution basis
- **Taxable TOD (cash account):** one planned trade/day, strict risk limits, avoid settlement mistakes

Goal: protect Co_ runway while creating a repeatable operating rhythm.

---

## CAM 2.0 alignment (behavioral governance)

RS5 is where CAM is enforced:
- max daily loss stops revenge trading
- max trades/day stops overtrading
- pre-commit ladder triggers stop “waiting for perfect bottoms”
- journaling turns outcomes into structured learning

---

## Machine ingestion tips

- keep numbers as numbers (not strings)
- use ISO timestamps with timezone offsets
- treat each day as a new `instance_id`
- store each instance in a collection for retrieval + analytics

---

## Optional extensions (if you want next)

- `PKP_RS1-6_collection.json` (array of daily instances)
- SQLite schema mirroring this PKP
- an agent prompt that consumes PKP and outputs the next RS cycle
Here’s a 30-second HeyGen script built around your photo + the Co_ narrative (clarity, capability, co-creation, local-first). No jargon, clean cadence, strong hook.

HeyGen Reel Script (30s) — “AI is my Co_creator”

Format: Talking head (you), captions on, subtle background music
Visual treatment: Start black & white / low contrast → shift to warmer / brighter when “Co_creator” hits.

⸻

0:00–0:03 — Hook (frustrated)

On-screen text: “Ever feel stuck… mid-idea?”
VO / Dialogue (you, calm but tense):
“I’m staring at the screen… and nothing’s landing.”

Direction: Slight sigh, tight jaw, eyes on laptop.

⸻

0:03–0:08 — The friction (relatable)

On-screen text: “Too many tabs. Not enough clarity.”
VO / Dialogue:
“Too many thoughts. Too little structure. And the clock is not my friend.”

⸻

0:08–0:12 — The turn (the realization)

On-screen text: “Then I remembered…”
VO / Dialogue (tone shifts):
“I don’t need more pressure. I need a co-creator.”

⸻

0:12–0:20 — The unlock (AI as partner)

On-screen text: “AI = Co_creator”
VO / Dialogue (more energized, light smile):
“So I opened AI—not to replace me…
but to sharpen me.
To turn a messy thought into a clean first draft… fast.”

Direction: Lift your posture. Let the light come in. This is where the color/brightness shifts.

⸻

0:20–0:26 — The payoff (creative genius emerges)

On-screen text: “Clarity. Momentum. Output.”
VO / Dialogue:
“And just like that… momentum shows up.
Ideas connect.
My creative brain comes back online.”

⸻

0:26–0:30 — CTA (Co_ brand close)

On-screen text: “Ready for your next big creation?”
VO / Dialogue (confident, simple):
“Ready for your next big creation with AI?
We’ll show you how.
Co_.”

End card (last frame):
“Co_ — Learn AI. Apply it. Win back time.”
Optional small text: “counderscore.com”

⸻

Caption Pack (paste into IG)

Ever feel stuck mid-idea?
AI isn’t here to replace your voice.
It’s here to help you find it faster.
Co_ teaches you how to turn curiosity into output.

⸻

Quick HeyGen Build Notes
	•	Scene 1 (0:00–0:12): Use your photo as background, add subtle “film grain” look, keep it monochrome.
	•	Scene 2 (0:12–0:30): Same framing, but brighten + warm tone; add a gentle light flare near the window for the “unlock.”

If you want, I can also write a 15-second version (punchier for Reels) with tighter lines and a stronger first 2 seconds.