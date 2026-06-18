---
name: okr-update
description: "Monthly OKR check-in: interview the user for actuals against an EXISTING data/okr-dataset.json and update it, so the progress charts gain a new data point. Use whenever the user wants to log progress, report monthly numbers, update actuals, do an OKR review/check-in, or says 'okr update', 'log this month', 'here are our numbers', 'how are we tracking'. Also handles mid-cycle target re-baselining (with mandatory change_log reason). Requires a dataset created by /okr-onboarding — if none exists, route there instead."
---

# OKR Update

Capture this month's actuals through a short interview, update the canonical dataset, and re-render the dashboard. This is the skill that turns the dashboard from a plan-viewer into a progress tracker — without it the system goes stale.

**Before anything:** load `data/okr-dataset.json`. Check `meta.schema_version` against `schema/okr-schema.md` — on major-version mismatch, STOP with a clear message; never coerce. If the file doesn't exist, tell the user to run `/okr-onboarding` first.

## Phase 1 — Orient

1. Determine which month is being reported (default: the most recent month whose `actuals` are still null and whose calendar month has started). Confirm with the user.
2. Show a one-line status per KR before asking anything: last actual, this month's target, gap. This primes honest answers and surfaces drift immediately.

## Phase 2 — Actuals interview (grouped, max 3 questions per round)

For each non-derived KR, ask for the month's actual in its `unit`. Group by objective. Rules:

- **Numbers only.** If the user answers vaguely ("pretty good", "almost there"), ask for the number. If they genuinely don't know, record `null` and add "instrument <unit>" to that KR's projects — an unmeasurable committed KR is a planning bug worth surfacing.
- **Derived KRs are never asked.** Revenue recalculates from drivers; say so if the user tries to report revenue directly.
- **Inverted KRs:** remind the user lower is better when asking (e.g. delivery hours).
- **Milestones:** ask for 0/1 plus one sentence of evidence.

After numbers, ask two qualitative questions and store the answers in a `checkins` list under `meta` (append `{month, notes, biggest_blocker}`): *what most explains this month's numbers?* and *what's the biggest blocker for next month?*

## Phase 3 — Confront the gaps (the coaching step)

For every KR where actual < target (or > target for inverted), name the gap and ask ONE forward-looking question: which existing project stalls, or what new project would close it? Update that KR's `projects` if the user commits to something new. Challenge weak answers — but never edit targets yourself to make a month look better.

**Target re-baselining:** only if the user explicitly asks. Require a reason, append `{date, kr_id, field, old, new, reason}` to `meta.change_log`, and remind them: committed KRs are meant to stay fixed for the cycle; the scar is the point.

## Phase 4 — Write & re-render

1. Update `actuals` for the reported month, bump `meta.last_modified`, validate array lengths.
2. Save `data/okr-dataset.json` (the one canonical file).
3. Re-render the dashboard: copy `scripts/okr-dashboard.jsx`, replace `__OKR_DATA__` with the updated JSON, output as an artifact. Point out the new data point on the progress and revenue lines and the current OKR score per KR.
4. Close with the single most at-risk KR for next month, in one sentence.

## Guardrails

- Never invent or interpolate actuals. Null is honest; a guess is corruption.
- Don't add new KRs or objectives here — that's a re-onboarding decision.
- If two months are unreported, capture both, oldest first.
