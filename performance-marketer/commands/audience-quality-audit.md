---
name: audience-quality-audit
description: Audit targeting accuracy against persona and ICP definitions — diagnose if LinkedIn Ads targeting or persona prompt logic is wrong
---

Run audience quality audit using Supabase MCP `execute_sql`.

## Steps

### 1. Ask Scope
Ask user for scope: all campaigns, a campaign group, or a specific campaign.

### 2. Resolve Persona + ICP
```sql
SELECT persona_key, persona_name, seniority_min, matching_titles
FROM reference.persona_buckets WHERE is_active = true;
```
```sql
SELECT min_employee_count, industries_include, industries_exclude
FROM reference.icp_definition;
```

### 3. Query Delivery Demographics
Query `linkedin_ads.ad_member_seniority_analytics`, `ad_member_company_size_analytics`, `ad_member_industry_analytics` filtered by `"sponsoredCampaign"`.

### 4. Cross-Match + Diagnose
Compare delivery vs intent. Diagnose root cause: LinkedIn targeting vs persona prompt logic. Present mismatch table with severity and recommendations.
