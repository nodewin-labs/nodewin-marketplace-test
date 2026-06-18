---
name: audience-demographics
description: Explore demographic breakdown across all 7 LinkedIn Ads dimensions for any campaign, group, or portfolio-wide
---

Run audience demographics explorer using Supabase MCP `execute_sql`.

## Steps

### 1. Ask Scope
Accept optional filters: campaign group, individual campaign, date range (default 30 days).

### 2. Query 7 Dimensions
Query all `linkedin_ads.ad_member_*_analytics` tables:
- Seniority, Company Size, Industry, Job Function, Job Title, Region, Country
- For each: dimension value, impressions, share %, engagements, clicks, CTR, CPC

### 3. Present
7 ranked tables (top 15 per dimension). Flag concentration risks (any value > 30% share).
