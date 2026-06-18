---
name: campaign-naming-convention
description: Paid campaign naming taxonomy for Google Search, LinkedIn, and Meta — campaign, ad set, and creative levels with abbreviation glossary
version: "2026-06"
---

# Paid Campaign Naming Convention

## Separator Rules

- `_` separates **categories** (platform, geo, funnel stage, etc.)
- `-` separates **values within a category** (e.g. multi-word audience segments)
- All naming is **ALLCAPS**
- Fields that don't apply use `NULL` as a placeholder. Never skip a field. Do not use `NA` — conflicts with North America region code.

## Principles

- Fields run **broadest → most specific**
- Each level (campaign → ad group → creative) only names what differentiates it from its siblings
- Every field has a fixed abbreviation glossary (see below)

---

## Campaign Level

### Google Search
```
GS_[GEO]_[FUNNELSTAGE]_[CAMPAIGNTYPE]_[PERSONA]_[AUDIENCE]_[OBJECTIVE]_[MATCHTYPE]_[LAUNCHDATE]_[NOTES]
```

### LinkedIn & Meta
```
[PLATFORM]_[GEO]_[FUNNELSTAGE]_[CAMPAIGNTYPE]_[NOTES]
```

> LinkedIn and Meta campaigns use a shortened structure. PERSONA, AUDIENCE, OBJECTIVE, ADFORMAT, and LAUNCHDATE are captured at the ad set level.

---

## Ad Set Level

### Google Search
```
[KEYWORD-THEME]_[MATCHTYPE]
```

### LinkedIn & Meta
```
[PLATFORM]_[GEO]_[FUNNELSTAGE]_[CAMPAIGNTYPE]_[PERSONA]_[AUDIENCE]_[OBJECTIVE]_[FORMAT]_[LAUNCHDATE]_[NOTES]
```

---

## Creative Level

```
[FORMAT]_[CONCEPT-HOOK]_[VERSION]_[NOTES]
```

---

## Abbreviation Glossary

### Platforms
| Full name | Abbreviation |
|-----------|--------------|
| Google Search | `GS` |
| LinkedIn | `LI` |
| Meta (Facebook/Instagram) | `META` |

### Geo
| Full name | Abbreviation |
|-----------|--------------|
| United States | `US` |
| United Kingdom | `UK` |
| Europe, Middle East & Africa | `EMEA` |
| Asia-Pacific | `APAC` |
| Global / no geo restriction | `GLOBAL` |
| Canada | `CA` |
| North America | `NA` |

### Funnel Stage
| Full name | Abbreviation |
|-----------|--------------|
| Top of funnel | `TOF` |
| Middle of funnel | `MOF` |
| Bottom of funnel | `BOF` |

### Campaign Type
| Full name | Abbreviation |
|-----------|--------------|
| Branded (Search) | `BRAND` |
| Non-branded (Search) | `NONBRAND` |
| Prospecting (Social) | `PROSP` |
| Retargeting (Social) | `RETARG` |
| Competitor | `COMP` |
| Account-based marketing | `ABM` |

### Persona (maps to `reference.persona_buckets.persona_key`)
| Naming Convention Value | persona_key |
|-------------------------|-------------|
| `BRAND-MARKETING-LEADERS` | `BRAND_MARKETING_LEADERS` |
| `CUSTOMER-EXPERIENCE-AND-ANALYTICS` | `CUSTOMER_EXPERIENCE_AND_ANALYTICS` |
| `DATA-AND-ANALYTICS` | `DATA_AND_ANALYTICS` |
| `INNOVATION-LEADERS` | `INNOVATION_LEADERS` |
| `INSIGHTS-LEADERS` | `INSIGHTS_LEADERS` |
| `MARKET-RESEARCH-AND-INTELLIGENCE` | `MARKET_RESEARCH_AND_INTELLIGENCE` |
| `PRODUCT-LEADERS` | `PRODUCT_LEADERS` |
| `PRODUCT-UX-RESEARCH` | `PRODUCT_UX_RESEARCH` |
| `RESEARCH-AGENCY-SERVICES` | `RESEARCH_AGENCY_SERVICES` |
| `RND-CONSUMER-RESEARCH` | `RND_CONSUMER_RESEARCH` |
| `MIX` (all personas) | _(no single bucket)_ |

> Conversion rule: replace `-` with `_` to get the persona_key. This enables programmatic lookup from campaign/ad set names to persona definitions.

### Objective
| Full name | Abbreviation |
|-----------|--------------|
| Demo request | `DEMO` |
| Traffic | `TRAFFIC` |
| Video views | `VIEWS` |
| Engagement | `ENG` |
| Reach | `REACH` |

### Audience
| Full name | Abbreviation |
|-----------|--------------|
| Competitor followers | `COMP-FOL` |
| Top 500 accounts | `T500` |
| Broad | `BROAD` |
| Website visitors | `WEB-VIS` |
| Lookalike | `LAL` |
| Account-based marketing list | `ABM` |
| 1:1 account target | `1-TO-1` |
| Keyword intent targeting | `KW-INTENT` |
| Event attendee / registrant list | `EVENT-LIST` |
| LinkedIn post engagers | `LI-POST-ENG` |

### Ad Format
| Full name | Abbreviation |
|-----------|--------------|
| Single image | `SINGLE-IMG` |
| Video | `VIDEO` |
| Carousel | `CAROUSEL` |
| Text ad | `TEXT` |
| Thought leader image ad | `THOUGHT-LEADER-IMG` |
| Thought leader video ad | `THOUGHT-LEADER-VIDEO` |
| Document ad | `DOC` |
| Follower Ad | `FOLLOWER-AD` |

### Match Type (Google Search only)
| Full name | Abbreviation |
|-----------|--------------|
| Exact match | `EXACT` |
| Phrase match | `PHRASE` |
| Broad match | `BROAD` |
| Mixed match types | `MIX` |

---

## Legacy Naming Convention (pre-2026-06)

Before this convention, Conveo used a different format:
```
2025_WAVE1_CPG_TOFU_WV_EU+AU+JT+Ind+Size_SI
```

Key differences:
- Year prefix instead of platform prefix
- `TOFU/MOFU/BOFU` instead of `TOF/MOF/BOF`
- Wave numbering instead of campaign type
- No standardized persona field at campaign level
- Persona extracted via `dbt.stg_persona_names` from patterns like "Persona ANALYTICS"

The onboarding skill validates which campaigns follow old vs new convention.
