---
name: okr-dashboard
description: "Render the OKR dashboard from an existing data/okr-dataset.json. Use whenever the user wants to see their OKR dashboard, view progress, check their OKR score, or says 'show my OKRs', 'okr dashboard', 'render the dashboard', 'how are my OKRs'. Reads the dataset, injects it into the JSX template, and outputs the interactive artifact. Requires a dataset created by /okr-onboarding — if none exists, route there instead."
---

# OKR Dashboard

Render the interactive OKR dashboard from the canonical dataset. This is the view layer — it reads, never writes.

**Before anything:** load `data/okr-dataset.json`. If the file doesn't exist or only contains the empty scaffold (no `objectives` array), tell the user to run `/okr-onboarding` first. Check `meta.schema_version` against `schema/okr-schema.md` — on major-version mismatch, STOP with a clear message.

## Rendering

1. Read `scripts/okr-dashboard.jsx` — this is the template.
2. Read `data/okr-dataset.json` — this is the data.
3. Replace the `__OKR_DATA__` token in the JSX with the full JSON contents (inline, not as a string — it's assigned directly to `const SEED`).
4. Output the result as a React artifact. The artifact uses Recharts (`LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ReferenceLine`, `ResponsiveContainer`).

## What the user sees

**View mode** (default):
- OKR tree: objectives with expandable KRs showing statement, baseline → target, and projects
- Progress chart: % of December target per KR (= OKR score × 100), one line per KR
- Revenue chart: derived target vs derived actual vs success bar

**Edit mode** (toggle in the dashboard):
- Monthly targets and actuals per KR (actuals are free to edit; target edits require a reason)
- Prices that drive the revenue derivation
- Change log of target re-baselines

**Export:** the dashboard has an "Export JSON" button that copies the updated dataset to clipboard. Remind the user to save it back to `data/okr-dataset.json` if they made edits.

## After rendering

- Point out notable data: current OKR scores, any KRs at risk, revenue trend
- If all actuals are null, remind them to run `/okr-update` to start tracking progress
- If they want to edit targets or log actuals, suggest `/okr-update` for the guided flow or Edit mode for quick changes

## Guardrails

- This skill is read-only — it never modifies the dataset file
- If the user asks to update actuals, route to `/okr-update`
- If the user asks to create new OKRs, route to `/okr-onboarding`
