---
name: audience-demographics
description: General-purpose demographic explorer across all 7 LinkedIn Ads audience dimensions — seniority, company size, industry, job function, job title, region, country
---

# Audience Demographics

Explore who is actually seeing your ads across all 7 LinkedIn Ads demographic dimensions. Supports portfolio-wide, campaign group, or individual campaign granularity.

## Data Sources

All 7 `linkedin_ads.ad_member_*_analytics` tables, each with `"sponsoredCampaign"` for campaign-level filtering:

| Table | Dimension |
|-------|-----------|
| `ad_member_seniority_analytics` | Seniority level (URN 1-10) |
| `ad_member_company_size_analytics` | Company size bucket |
| `ad_member_industry_analytics` | Industry |
| `ad_member_job_function_analytics` | Job function |
| `ad_member_job_title_analytics` | Job title |
| `ad_member_region_analytics` | Region |
| `ad_member_country_analytics` | Country |

Plus `linkedin_ads.campaigns` and `linkedin_ads.campaign_groups` for name-to-ID resolution.

## Seniority URN Mapping

```
1 = Unpaid, 2 = Training, 3 = Entry, 4 = Senior, 5 = Manager,
6 = Director, 7 = VP, 8 = CXO, 9 = Partner, 10 = Owner
```

## Execution

### Step 1: Determine Scope

Ask the user for optional filters:
- **Campaign group** — filter by group name
- **Campaign** — filter by individual campaign name
- **Date range** — default last 30 days

Lookup IDs if needed:

```sql
SELECT id, name FROM linkedin_ads.campaign_groups ORDER BY name;
```

```sql
SELECT c.id, c.name, cg.name as group_name
FROM linkedin_ads.campaigns c
JOIN linkedin_ads.campaign_groups cg ON c."campaignGroup" = CONCAT('urn:li:sponsoredCampaignGroup:', cg.id)
WHERE c.name ILIKE '%{search_term}%'
ORDER BY c.name;
```

### Step 2: Query All 7 Dimensions

Run each query via Supabase MCP `execute_sql`. The WHERE clause adapts to scope:

- **Portfolio**: no campaign filter
- **Campaign group**: `JOIN linkedin_ads.campaigns c ON a."sponsoredCampaign" = c.id::text WHERE c."campaignGroup" = 'urn:li:sponsoredCampaignGroup:{group_id}'`
- **Individual campaign**: `WHERE a."sponsoredCampaign" = '{campaign_id}'`

**Template query (adapt table name and alias for each dimension):**

```sql
SELECT a.string_of_pivot_values AS dimension_value,
       SUM(a.impressions::int) AS impressions,
       ROUND(SUM(a.impressions::int) * 100.0 / NULLIF(SUM(SUM(a.impressions::int)) OVER (), 0), 1) AS impression_share_pct,
       SUM(COALESCE(a."totalEngagements"::int, 0)) AS engagements,
       SUM(COALESCE(a."landingPageClicks"::int, 0)) AS clicks,
       CASE WHEN SUM(a.impressions::int) > 0
         THEN ROUND(SUM(COALESCE(a."landingPageClicks"::int, 0)) * 100.0 / SUM(a.impressions::int), 2)
       END AS ctr,
       CASE WHEN SUM(COALESCE(a."landingPageClicks"::int, 0)) > 0
         THEN ROUND(SUM(COALESCE(a."costInUsd"::numeric, 0)) / SUM(a."landingPageClicks"::int), 2)
       END AS cpc
FROM linkedin_ads.ad_member_{DIMENSION}_analytics a
WHERE a.start_date >= '{date_start}'
  AND a.start_date <= '{date_end}'
  {SCOPE_FILTER}
GROUP BY a.string_of_pivot_values
ORDER BY impressions DESC
LIMIT 15;
```

Replace `{DIMENSION}` with: `seniority`, `company_size`, `industry`, `job_function`, `job_title`, `region`, `country`.

### Step 3: Present Results

For each dimension, present a ranked table:

```
## Seniority Distribution

| Seniority | Impressions | Share % | Engagements | Clicks | CTR % | CPC |
|-----------|-------------|---------|-------------|--------|-------|-----|
| Director  | 45,230      | 32.1%   | 1,204       | 312    | 0.69% | $4.21 |
| Manager   | 38,100      | 27.0%   | 890         | 245    | 0.64% | $5.12 |
| ...       |             |         |             |        |       |     |
```

Map seniority URNs to human-readable labels. Map company size codes to ranges.

### Step 4: Highlight Concentration Risks

Flag any dimension value with > 30% impression share as a concentration risk:

```
⚠️ Concentration: "Director" accounts for 32.1% of all impressions in Seniority dimension.
```

Also flag if the top 3 values in any dimension account for > 80% of impressions — indicates narrow reach.

## CLI Fallback

For terminal access, query the same tables via psql with `--profile {client_name}`.
