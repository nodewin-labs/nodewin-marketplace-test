# OKR Dataset Schema — v1.0

The JSON file at `data/okr-dataset.json` is the **single source of truth** for the whole OKR system. The dashboard is a view+editor of it; the skills read and write it. Nothing else stores OKR state.

## Top level

| Field | Type | Rules |
|---|---|---|
| `meta.schema_version` | string | **Required.** Skills MUST refuse to load a file whose major version doesn't match theirs. |
| `meta.cycle` | string | e.g. `"H2-2026"` |
| `meta.months` | string[] | The month columns. All `targets`/`actuals` arrays MUST have exactly this length. |
| `meta.kr_discipline` | `"committed"` \| `"stretch"` | Committed = targets calibrated to 100%. |
| `meta.business_context` | string | Summary of the business from Phase 0 of onboarding: identity, market, operations, customer journey, challenges. Anchors all objectives. |
| `meta.change_log` | object[] | Append-only. Every TARGET edit adds `{date, kr_id, field, old, new, reason}`. Reason is required. |
| `revenue_model` | object | Prices + driver mapping. Revenue is always DERIVED — see below. |
| `revenue_model.formula` | string | Human-readable derivation formula for THIS business (e.g. `"new_customers × avg_deal_size + existing_mrr"`). No hardcoded template. |
| `objectives[]` | object[] | 3–5 objectives, each with 2–4 `krs`. Objectives should span customer journey outcomes AND organizational readiness (people/process/tech). |

## KR object

| Field | Type | Rules |
|---|---|---|
| `id` | string | `KR<obj>.<n>`, unique. |
| `statement` | string | An OUTCOME, not an output. If it starts with "Launch/Create/Build", it belongs in `projects`, not here. |
| `unit` | string | The measurable unit. |
| `type` | enum | `cumulative` (counts up), `inverted` (lower is better, e.g. hours), `milestone` (0/1), `derived` (computed; `targets`/`actuals` stay empty, never edited). |
| `baseline` | number | Starting value. |
| `targets` | number[] | Monthly target per `meta.months` slot. Editable only via change_log entry. |
| `actuals` | (number\|null)[] | `null` = not yet reported. Filled by `/okr-update`. Freely editable. |
| `dimension` | string | `"customer_journey"` (tag with Bowtie stage: awareness/education/selection/onboarding/impact/growth) or `"organizational"` (tag with pillar: people/process/tech). Enables dashboard filtering by dimension. |
| `bowtie_stage` | string? | If `dimension` is `customer_journey`: which Bowtie stage this KR targets. |
| `org_pillar` | string? | If `dimension` is `organizational`: `people`, `process`, or `tech`. |
| `projects` | string[] | The activities/outputs that drive the KR. |

## Revenue derivation (the one hard rule)

Revenue is never entered directly. It is computed from drivers defined during onboarding:

```
month_revenue[m] = f(driver_KRs[m], prices)
```

The formula `f` is business-specific and stored in `revenue_model.formula` as a human-readable string. Examples:

- SaaS: `new_customers[m] × avg_deal_size + existing_mrr[m]`
- Services: `(projects_sold[m] − projects_sold[m−1]) × avg_project_value`
- Marketplace: `gmv[m] × take_rate`

Each driver references a real KR id in `revenue_model.drivers`. Editing prices or driver targets/actuals changes revenue; editing "revenue" directly is impossible by design. This prevents the two-sources-of-truth failure.

## Progress / scoring convention

Per-KR progress for the combined chart (this is also the OKR score, 0.0–1.0):

- `cumulative` / `milestone`: `actual / target_dec`
- `inverted`: `(baseline − actual) / (baseline − target_dec)`
- `derived`: `derived_actual / success_bar_month`

## Versioning

Breaking schema changes bump the major version (`2.0`). Skills check `schema_version` before loading and stop with a clear message on mismatch — never silently coerce.
