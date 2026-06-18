---
name: okr-onboarding
description: "Interview a user about their business and create their OKR dataset from scratch. Use whenever the user wants to define OKRs, set objectives and key results, build an OKR tree, plan targets for a quarter/half/year, or says 'okr onboarding', 'set up my OKRs', 'define our goals', 'help me with objectives'. Also use in workshops when guiding a participant through OKR creation. Produces data/okr-dataset.json (the single source of truth) plus data/okr-interview.yml (raw answers). The /okr-dashboard skill renders the dashboard from this dataset; /okr-update maintains it monthly."
---

# OKR Onboarding

Guide the user through a multi-phase interview to understand their business, define OKRs, and produce the canonical dataset. The dataset — not the dashboard, not this skill — is the durable asset.

**Before anything:** read `schema/okr-schema.md`. Every rule there is binding, especially: revenue is derived (never entered), outcome-vs-output for KRs, the months-array length contract, and `schema_version`.

**If a `data/okr-dataset.json` already exists with objectives:** stop. Confirm whether the user wants a NEW cycle (archive the old file as `okr-dataset-<cycle>.json` first) or wants `/okr-update` instead. Never silently overwrite.

---

## Phase 0 — Business Discovery

Invoke `/interview` to deeply understand the business before defining any OKRs. OKRs without business context are generic wish lists.

Use AskUserQuestion when available; otherwise ask conversationally. Go in rounds, reflect back between rounds, and **challenge the user** — don't accept surface-level answers.

**Round 0A — Identity & Market.** What does the business do? Who are the customers? What industry/market? Company size (team, revenue range, stage — startup/scaleup/enterprise)? What's the business model? (SaaS, services, marketplace, product-led, hybrid?) Who are the main competitors? What's the differentiation?

**Round 0B — Current Activities & Operations.** What are the core activities the team spends time on daily/weekly? Which teams/functions exist? (sales, marketing, CS, product, ops, finance?) What tools and systems are in use? (CRM, automation, analytics, databases?) What data do you already track? What's measured today vs. what should be?

**Round 0C — Customer Journey.** Walk through the customer lifecycle: how do prospects become aware? How are they educated? What's the selection/decision process? How does onboarding work? Where does ongoing value (impact) get delivered? Where do growth/expansion opportunities emerge? Map this to the Bowtie model if the user is familiar: Awareness → Education → Selection → Onboarding → Impact → Growth. Where are the bottlenecks and drop-offs today?

**Round 0D — Challenges & Aspirations.** What's working well right now? What's the biggest strength? What's broken or frustrating? Where do things fall through the cracks? What would change the trajectory of the business if you solved it? If you could only fix ONE thing this cycle, what would it be and why?

**Reflect back** the full business context before moving on. The user should feel understood — not interrogated. This summary becomes `meta.business_context` in the dataset and anchors everything that follows. **Do not proceed to Phase 1 until the user confirms the summary is accurate.**

---

## Phase 1 — OKR Direction & Baselines

Invoke `/interview` again, now with the Phase 0 context loaded. The user's business context shapes every question you ask.

**Round 1 — Direction.** Given everything you just told me: what would make this cycle a clear success? Which 3–5 outcomes matter most (ranked)? What's the time horizon and review cadence? Test every proposed objective with: *"Why is this important, and why now?"* No good answer → it's not an objective. Push back on objectives that don't connect to the challenges surfaced in Phase 0.

**Round 2 — Customer Journey OKRs.** For each Bowtie stage where you identified bottlenecks or opportunities in Phase 0: what's the measurable outcome you need? What's the current baseline (volume, velocity, conversion rate)? Which OKR dimension does this fall under — is it a top-level objective or a KR under a broader objective? Ensure the customer journey isn't just assumed — it's explicitly represented in the OKR tree.

**Round 3 — People / Process / Tech OKRs.** Beyond business outcomes, what organizational readiness is needed? **People:** Who needs training? What skills gap must close? How do you measure adoption? **Processes:** Which workflows need to change or be automated? What human gates stay? **Tech/Data:** What infrastructure, data architecture, or tooling must be in place for the business OKRs to succeed? These are enabling OKRs — they make the customer journey OKRs achievable.

**Round 4 — Baselines.** Current numbers for each candidate KR area (revenue, customers, audience, hours, conversion rates, etc.). Never let a KR exist without a baseline — "from X" is half the KR. If they don't know a baseline, the first project under that KR is "instrument it".

**Round 5 — Calibration.** Committed (must-hit, ~100%) vs stretch (0.6–0.7 is success) — explain the difference, let them choose, record it in `meta.kr_discipline`. Pacing across months: front-loaded / steady / back-loaded, and what real-world events anchor it (cohorts, seasonality, launches).

**Round 6 — Constraints & revenue model.** Hours genuinely available per week. The single most likely thing to break the plan. What they sell, at what price, and which KRs drive each revenue stream → this becomes `revenue_model.prices` and `drivers`. The revenue model formula adapts to THIS business — there is no hardcoded template.

---

## Phase 2 — Derive the tree

Based on Phase 0 + Phase 1 outputs:

- 3–5 objectives, qualitative and unscored, in the user's ranked order. Objectives should span both **business outcomes** (customer journey-driven) and **organizational readiness** (people/process/tech-driven). Each objective must trace back to a challenge or aspiration from Phase 0.
- 2–4 KRs per objective. Each KR: **outcome with a number** (baseline → target, time-bound). Apply the output test: a KR starting with "launch/build/create/publish" gets demoted to `projects` and you ask *"and what measurable result does that produce?"* — that answer is the KR.
- Tag each KR with its dimension: `customer_journey` (which Bowtie stage?) or `organizational` (people/process/tech?). This enables the dashboard to show progress by dimension.
- Monthly `targets` arrays per the chosen pacing. If `kr_discipline` is committed, calibrate targets to be genuinely hittable — push back on moonshot numbers.
- 2–5 `projects` per KR — the activities that drive it. Ground these in the actual operations and tools described in Phase 0. What existing workflows does this touch? Which team members own it?

---

## Phase 3 — Validate, restate, write

Invoke `/interview` one final time, presenting the full OKR tree for validation.

Use AskUserQuestion to walk through the tree objective by objective. For each:
- Does this objective connect to a real business need from Phase 0?
- Is each KR truly an outcome (not an output)?
- Are baselines and targets realistic given the constraints?
- Will the listed projects actually move the KRs?
- Is the customer journey adequately covered? Are there Bowtie stages with clear bottlenecks that have no OKR?
- Is organizational readiness (people/process/tech) addressed? Will the team be able to execute?
- Is anything critical missing?

**Push back hard** — the user should feel the tree was stress-tested, not rubber-stamped.

After explicit approval:

1. Validate against `schema/okr-schema.md`: array lengths match `meta.months`; every KR has baseline/targets/unit/type; derived KRs have empty targets/actuals; `schema_version` set; revenue drivers point at real KR ids.
2. Write `data/okr-interview.yml` (raw Q&A from all phases, so re-derivation never needs re-interviewing) and `data/okr-dataset.json` (including `meta.business_context` from Phase 0).
3. Offer to render the dashboard: copy `scripts/okr-dashboard.jsx`, replace the `__OKR_DATA__` token with the JSON contents, output as an artifact.

---

## Guardrails

- One dataset file is canonical. The dashboard is a view; exports from its edit mode get saved back into the same file.
- The revenue model formula adapts to the business — define `revenue_model.formula` as a string describing the derivation for THIS specific business. No hardcoded formula.
- Don't assume any specific tools, platforms, or tech stack — discover what they use in Phase 0.
- Timebox: onboarding is one session. If the tree isn't approved in one sitting, save the interview YAML and resume — don't restart.
