---
name: onboarding
description: Interactive onboarding that validates campaign naming compliance, persona mapping accuracy, and UTM tracking setup against live Supabase data
---

# Performance Marketer Onboarding

Interactive validation of campaign naming conventions, persona mapping, and UTM tracking against live data. Run this when setting up the plugin for a new user or after naming convention changes.

## References

This skill reads:
- `references/campaign-naming-convention.md` — naming taxonomy with abbreviation glossary
- `references/utm-tracking-convention.md` — UTM parameter standard

## Data Sources

- `linkedin_ads.campaigns` — actual campaign names in the ad account
- `linkedin_ads.campaign_groups` — campaign group names
- `reference.persona_buckets` — persona definitions (persona_key, persona_name)
- `reference.icp_definition` — ICP criteria

## Execution

### Phase 1: Campaign Naming Compliance Audit

**Goal**: Determine how many campaigns follow the new convention vs legacy format vs non-compliant.

#### Step 1.1: Fetch all campaign names

```sql
SELECT c.id, c.name as campaign_name, cg.name as group_name, c.status
FROM linkedin_ads.campaigns c
LEFT JOIN linkedin_ads.campaign_groups cg
  ON c."campaignGroup" = CONCAT('urn:li:sponsoredCampaignGroup:', cg.id)
ORDER BY c.name;
```

#### Step 1.2: Classify each campaign

For each campaign name, determine which convention it follows:

**New convention** (2026-06+): Matches pattern `[PLATFORM]_[GEO]_[FUNNELSTAGE]_[CAMPAIGNTYPE]_[NOTES]`
- Starts with `LI_` or `META_` or `GS_`
- Has valid GEO (US, UK, EMEA, APAC, GLOBAL, CA, NA)
- Has valid funnel stage (TOF, MOF, BOF)
- Has valid campaign type (BRAND, NONBRAND, PROSP, RETARG, COMP, ABM)

**Legacy convention** (pre-2026): Matches patterns like `2025_WAVE1_CPG_TOFU_WV_...` or `COMPETITOR - CompanyName - MAX BID`
- Starts with year (2024_, 2025_, 2026_)
- Contains TOFU/MOFU/BOFU (old funnel stage format)
- Contains WAVE or COMPETITOR patterns

**Non-compliant**: Doesn't match either convention.

#### Step 1.3: Present compliance summary

```
## Campaign Naming Compliance

| Convention | Count | % | Status |
|-----------|-------|---|--------|
| New (2026-06) | 12 | 24% | ✅ |
| Legacy (pre-2026) | 35 | 70% | ⚠️ Parseable but outdated |
| Non-compliant | 3 | 6% | ❌ Manual review needed |

### Non-compliant campaigns (need renaming):
1. "Test Campaign ABC" — doesn't follow any convention
2. ...
```

Ask the user: "Do these classifications look correct? Any campaigns miscategorized?"

### Phase 2: Persona Mapping Validation

**Goal**: Verify that persona abbreviations in campaign names correctly map to `reference.persona_buckets`.

#### Step 2.1: Extract personas from campaign names

For new convention campaigns, extract the PERSONA field from ad set names (5th position).
For legacy campaigns, use `dbt.stg_persona_names` to extract persona groups.

```sql
-- Check what persona groups stg_persona_names extracts
SELECT DISTINCT persona_group, COUNT(*) as campaign_count
FROM dbt.stg_persona_names
GROUP BY persona_group
ORDER BY campaign_count DESC;
```

#### Step 2.2: Cross-reference against persona_buckets

```sql
SELECT persona_key, persona_name, is_active
FROM reference.persona_buckets
ORDER BY priority_tier;
```

For each persona found in campaign names:
- Convert abbreviation to persona_key (replace `-` with `_`)
- Check if it exists in `reference.persona_buckets`
- Flag any persona in campaigns that has no matching bucket

#### Step 2.3: Present mapping validation

```
## Persona Mapping

| Campaign Persona | → persona_key | Exists in Buckets? | Active? |
|-----------------|---------------|-------------------|---------|
| INSIGHTS-LEADERS | INSIGHTS_LEADERS | ✅ Yes | ✅ Active |
| INNOVATION-LEADERS | INNOVATION_LEADERS | ✅ Yes | ✅ Active |
| UNKNOWN-PERSONA | UNKNOWN_PERSONA | ❌ Missing | — |
```

Ask the user: "Are there any persona mappings that need to be added or corrected?"

### Phase 3: Naming Convention Field Validation

**Goal**: Verify all abbreviation values in use are in the approved glossary.

#### Step 3.1: Parse campaign names and extract each field

For new convention campaigns, split by `_` and check each position against the glossary:
- Position 1: PLATFORM (must be GS, LI, META)
- Position 2: GEO (must be US, UK, EMEA, APAC, GLOBAL, CA, NA)
- Position 3: FUNNELSTAGE (must be TOF, MOF, BOF)
- Position 4: CAMPAIGNTYPE (must be BRAND, NONBRAND, PROSP, RETARG, COMP, ABM)

#### Step 3.2: Surface unknown values

```
## Glossary Compliance

| Field | Unknown Values Found | Action |
|-------|---------------------|--------|
| GEO | `LATAM` (2 campaigns) | Add to glossary? |
| CAMPAIGNTYPE | All valid | ✅ |
| PERSONA | `EXECUTIVE` (1 ad set) | Add to glossary? |
```

Ask the user: "Should these new values be added to the glossary, or are they typos that need fixing?"

### Phase 4: UTM Tracking Verification

**Goal**: Confirm UTM tracking templates are correctly configured.

#### Step 4.1: Surface current tracking template

Present the expected HubSpot tracking templates from the UTM convention reference:

```
## UTM Tracking Templates (Expected)

### LinkedIn Ads
utm_source=linkedin
utm_medium=paid-social
utm_campaign={campaign_name}
utm_content={creativeid}

### Meta Ads
utm_source=facebook
utm_medium=paid-social
utm_campaign={campaign_name}
utm_term={{adset.id}}
utm_content={{ad.id}}

### Google Ads
utm_source=google
utm_medium=cpc
utm_campaign={_utmcampaign}
utm_term={keyword}
utm_content={creative}
```

Ask the user: "Can you confirm these tracking templates are live in HubSpot → Settings → Marketing → Ads → Tracking?"

#### Step 4.2: Check for UTM consistency

If HubSpot or GA4 data is accessible, check for legacy utm_medium values (`paid` instead of `paid-social`, `ppc` instead of `cpc`) that indicate old tracking templates are still active.

### Phase 5: Onboarding Summary

Present a final onboarding status dashboard:

```
## Onboarding Status

| Check | Status | Details |
|-------|--------|---------|
| Campaign naming compliance | ⚠️ | 70% legacy, 24% new, 6% non-compliant |
| Persona mapping | ✅ | All 10 personas mapped correctly |
| Glossary compliance | ⚠️ | 1 unknown GEO value |
| UTM tracking | ✅ | Confirmed by user |

### Recommended Actions
1. Rename 3 non-compliant campaigns to follow the new convention
2. Add `LATAM` to the GEO glossary (or correct to `GLOBAL`)
3. Gradually migrate 35 legacy campaigns to new naming as they're refreshed
```

## CLI Fallback

For terminal access, query the same tables via psql with `--profile {client_name}`.
