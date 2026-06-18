---
name: utm-tracking-convention
description: UTM parameter standard for all channels — Google Search, LinkedIn, Meta, email, events, partners. Includes HubSpot tracking templates.
version: "2026-06-09"
---

# UTM Tracking Convention

## The Five UTM Parameters

| Parameter | What it tracks | Required? |
|-----------|---------------|-----------|
| `utm_source` | Which platform or tool sent the traffic | Always |
| `utm_medium` | What type of channel it came from | Always |
| `utm_campaign` | Which campaign or initiative | Always |
| `utm_term` | Which keyword or audience triggered the ad | Paid only |
| `utm_content` | Which specific ad or creative was clicked | Paid only |

## utm_source Values

| Source | Value |
|--------|-------|
| Google Ads | `google` |
| LinkedIn Ads | `linkedin` |
| Meta Ads | `facebook` |
| HubSpot marketing email | `hubspot` |
| Newsletter | `newsletter` |
| Event or conference | event name, e.g. `mrx-summit` |
| Partner or referral | partner name |
| Organic social | `linkedin` or `instagram` |

## utm_medium Values

| Channel type | Value |
|-------------|-------|
| Google paid search | `cpc` |
| LinkedIn or Meta paid social | `paid-social` |
| Display / programmatic | `display` |
| Any email | `email` |
| Organic social post | `social` |
| Partner or referral link | `referral` |
| Event link | `event` |
| QR code | `qr` |
| Print | `print` |

## utm_campaign

**Paid ads** (Google, LinkedIn, Meta): Set automatically from platform campaign name. Must follow the Campaign Naming Convention.

**Non-paid** format: `[channel]-[audience-or-campaign]-[month+year]`
- `email-insights-leaders-jun26`
- `event-mrx-summit-jun26`
- `newsletter-product-update-jun26`

Rules: lowercase, hyphens only, no spaces.

## utm_term (Paid Only)

| Platform | How set | Value |
|----------|---------|-------|
| Google Ads | Auto via `{keyword}` | The search keyword |
| LinkedIn Ads | Not used | — |
| Meta Ads | Not used | — |

## utm_content (Paid Only)

| Platform | How set | Value |
|----------|---------|-------|
| Google Ads | Auto via `{creative}` | Numeric ad ID |
| LinkedIn Ads | Auto via `{creativeid}` | Numeric creative ID |
| Meta Ads | Auto via `{{ad.id}}` | Numeric ad ID |

## HubSpot Tracking Templates

Configured in HubSpot → Settings → Marketing → Ads → Tracking.

### Google Ads
```
utm_source=google
utm_medium=cpc
utm_campaign={_utmcampaign}
utm_term={keyword}
utm_content={creative}
```

### LinkedIn Ads
```
utm_source=linkedin
utm_medium=paid-social
utm_campaign={campaign_name}
utm_content={creativeid}
```

### Meta Ads
```
utm_source=facebook
utm_medium=paid-social
utm_campaign={campaign_name}
utm_term={{adset.id}}
utm_content={{ad.id}}
```

> Values in `{curly braces}` are dynamic — the ad platform fills them in at click time.

## Manual UTM Requirements

| Channel | Manual UTMs needed? |
|---------|-------------------|
| Google Ads | No — automated |
| LinkedIn Ads | No — automated |
| Meta Ads | No — automated |
| HubSpot marketing email | Yes |
| Newsletter | Yes |
| Event / conference links | Yes |
| Partner / referral links | Yes |
| Organic social | Yes (optional) |

## Rules

- Lowercase everything
- Use hyphens, not underscores or spaces, in values
- Never add UTMs to internal links (breaks GA4 session tracking)
- Test URLs before sending
- Never skip utm_source and utm_medium

## Change Log

### 2026-06-09 — Initial UTM structure introduced

| Platform | Parameter | Old | New | Why |
|----------|-----------|-----|-----|-----|
| Google Ads | utm_source | `adwords` | `google` | Legacy name → current standard |
| Google Ads | utm_medium | `ppc` | `cpc` | IAB standard, aligns with GA4 |
| Google Ads | utm_content | not set | `{creative}` | Creative-level tracking |
| LinkedIn Ads | utm_medium | `paid` | `paid-social` | More specific channel grouping |
| LinkedIn Ads | utm_content | not set | `{creativeid}` | Creative-level tracking |
| Meta Ads | utm_medium | `paid` | `paid-social` | Same as LinkedIn |
| Meta Ads | utm_term | not set | `{{adset.id}}` | Ad set level data |
| Meta Ads | utm_content | not set | `{{ad.id}}` | Creative-level tracking |
