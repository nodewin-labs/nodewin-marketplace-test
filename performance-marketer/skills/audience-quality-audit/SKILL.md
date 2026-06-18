---
name: audience-quality-audit
description: Cross-reference LinkedIn Ads delivery demographics against persona buckets and ICP definitions to flag targeting mismatches and diagnose root cause (ads targeting vs persona prompt logic)
---

# Audience Quality Audit

Cross-match **campaign dimensions × persona buckets × actual demographic delivery** to answer: "Is our targeting actually reaching who we think it is?"

## Data Sources

- `reference.persona_buckets` — persona definitions with `seniority_min`, `matching_titles`, `anti_persona_titles`, `departments`
- `reference.icp_definition` — ICP criteria: `min_employee_count`, `industries_include`, `industries_exclude`, `regions_include`, `regions_exclude`
- `linkedin_ads.ad_member_seniority_analytics` — seniority delivery by campaign (`"sponsoredCampaign"`)
- `linkedin_ads.ad_member_company_size_analytics` — company size delivery by campaign
- `linkedin_ads.ad_member_industry_analytics` — industry delivery by campaign
- `linkedin_ads.campaigns` — campaign metadata (name, group, objective)
- `linkedin_ads.campaign_groups` — campaign group metadata
- `dbt.stg_persona_names` — maps campaign → persona group via naming convention
- `public.pli` — person-level intelligence with `buyer_persona_type`, `seniority`, `title`

## Seniority URN Mapping

```
1 = Unpaid
2 = Training
3 = Entry
4 = Senior
5 = Manager
6 = Director
7 = VP
8 = CXO
9 = Partner
10 = Owner
```

## Company Size Bucket Mapping

```
SIZE_1 = 1
SIZE_2_TO_10 = 2-10
SIZE_11_TO_50 = 11-50
SIZE_51_TO_200 = 51-200
SIZE_201_TO_500 = 201-500
SIZE_501_TO_1000 = 501-1000
SIZE_1001_TO_5000 = 1001-5000
SIZE_5001_TO_10000 = 5001-10000
SIZE_10001_OR_MORE = 10001+
```

## Execution

### Step 1: Determine Scope

Ask the user what to audit. Support 3 granularity levels:

1. **Portfolio-wide** — all active campaigns
2. **Campaign group** — by group name
3. **Individual campaign** — by campaign name

Lookup IDs if the user provides names:

```sql
-- Find campaign groups
SELECT id, name FROM linkedin_ads.campaign_groups ORDER BY name;
```

```sql
-- Find campaigns (optionally filtered by group)
SELECT c.id, c.name, cg.name as group_name
FROM linkedin_ads.campaigns c
JOIN linkedin_ads.campaign_groups cg ON c."campaignGroup" = CONCAT('urn:li:sponsoredCampaignGroup:', cg.id)
WHERE c.name ILIKE '%{search_term}%'
ORDER BY c.name;
```

### Step 2: Resolve Persona + ICP Intent

```sql
-- Get persona mapping for campaigns in scope
SELECT campaign_id, campaign_name, persona_group
FROM dbt.stg_persona_names
WHERE campaign_id IN ({campaign_ids});
```

```sql
-- Get persona definitions
SELECT persona_key, persona_name, matching_titles, seniority_min,
       anti_persona_titles, departments, priority_tier
FROM reference.persona_buckets
WHERE is_active = true;
```

```sql
-- Get ICP definition
SELECT min_employee_count, industries_include, industries_exclude,
       regions_include, regions_exclude, seniority_min
FROM reference.icp_definition;
```

### Step 3: Query Delivery Demographics

Filter all queries by the campaigns in scope using `"sponsoredCampaign"`.

**Seniority distribution:**
```sql
SELECT string_of_pivot_values AS seniority_urn,
       SUM(impressions::int) AS impressions,
       ROUND(SUM(impressions::int) * 100.0 / NULLIF(SUM(SUM(impressions::int)) OVER (), 0), 1) AS pct
FROM linkedin_ads.ad_member_seniority_analytics
WHERE "sponsoredCampaign" IN ({campaign_ids})
  AND start_date >= current_date - interval '30 days'
GROUP BY string_of_pivot_values
ORDER BY impressions DESC;
```

**Company size distribution:**
```sql
SELECT string_of_pivot_values AS company_size,
       SUM(impressions::int) AS impressions,
       ROUND(SUM(impressions::int) * 100.0 / NULLIF(SUM(SUM(impressions::int)) OVER (), 0), 1) AS pct
FROM linkedin_ads.ad_member_company_size_analytics
WHERE "sponsoredCampaign" IN ({campaign_ids})
  AND start_date >= current_date - interval '30 days'
GROUP BY string_of_pivot_values
ORDER BY impressions DESC;
```

**Industry distribution:**
```sql
SELECT string_of_pivot_values AS industry,
       SUM(impressions::int) AS impressions,
       ROUND(SUM(impressions::int) * 100.0 / NULLIF(SUM(SUM(impressions::int)) OVER (), 0), 1) AS pct
FROM linkedin_ads.ad_member_industry_analytics
WHERE "sponsoredCampaign" IN ({campaign_ids})
  AND start_date >= current_date - interval '30 days'
GROUP BY string_of_pivot_values
ORDER BY impressions DESC;
```

### Step 4: Cross-Match Against Intent

For each dimension, calculate the mismatch percentage:

**Seniority mismatch:**
- Map URN numbers to labels using the mapping above
- Extract the persona's `seniority_min` array (e.g., `["Director", "VP", "CXO"]`)
- Calculate: % of impressions going to seniority levels BELOW the minimum (e.g., Manager, Senior, Entry)
- A persona requiring Director+ but delivering 40% to Manager = 40% mismatch

**Company size mismatch:**
- Parse SIZE_X_TO_Y to extract the upper bound number
- Compare against ICP's `min_employee_count`
- Calculate: % of impressions in size buckets where upper bound < min_employee_count
- ICP requiring 200+ but 15% going to SIZE_51_TO_200 = 15% mismatch

**Industry mismatch:**
- Compare delivered industries against ICP's `industries_exclude` list
- Calculate: % of impressions going to excluded industries

### Step 5: Diagnose Root Cause

Two possible failure modes — determine which applies:

**A. LinkedIn Ads targeting is wrong:**
- Delivery demographics don't match ICP/persona intent
- The persona definition is correct but LinkedIn is serving to wrong audience
- **Recommendation**: Adjust LinkedIn Ads targeting (exclude seniority levels, tighten company size filter, add industry exclusions)

**B. Persona prompt logic is wrong:**
- The `reference.persona_buckets` rules are internally contradictory
- Example: `seniority_min: ["Director"]` but `matching_titles` includes "Research Manager" (Manager-level)
- Validate by querying PLI:

```sql
-- Check actual seniority distribution of contacts classified under this persona
SELECT seniority, COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct
FROM public.pli
WHERE buyer_persona_type = '{PERSONA_KEY}'
  AND buyer_persona_type IS NOT NULL
GROUP BY seniority
ORDER BY count DESC;
```

```sql
-- Check if matching_titles include lower-seniority titles
SELECT title, seniority, COUNT(*) as count
FROM public.pli
WHERE buyer_persona_type = '{PERSONA_KEY}'
  AND seniority NOT IN ('Director', 'VP', 'CXO', 'Partner', 'Owner')
GROUP BY title, seniority
ORDER BY count DESC
LIMIT 20;
```

If PLI shows Manager-level people classified into a Director+ persona → the persona prompt is misclassifying → recommend persona bucket rule fixes.

### Step 6: Present Audit Report

**Mismatch Summary Table:**

```
| Dimension     | Intent (Persona/ICP) | Actual Delivery     | Mismatch % | Severity | Root Cause        |
|---------------|----------------------|---------------------|------------|----------|-------------------|
| Seniority     | Director+            | 40% Manager         | 40%        | 🔴 HIGH  | Persona prompt    |
| Company Size  | 200+ employees       | 15% in 51-200       | 15%        | 🟡 MED   | LinkedIn targeting|
| Industry      | Excl: Manufacturing  | 3% Manufacturing    | 3%         | 🟢 LOW   | LinkedIn targeting|
```

**Severity thresholds:**
- 🔴 HIGH: > 25% mismatch
- 🟡 MEDIUM: 10-25% mismatch
- 🟢 LOW: < 10% mismatch

**For each HIGH/MEDIUM mismatch, provide:**
1. Root cause diagnosis (LinkedIn targeting vs persona prompt)
2. Specific fix recommendation
3. Expected impact of the fix

## CLI Fallback

For terminal access, query the same tables via psql with `--profile {client_name}`.
