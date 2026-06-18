---
name: campaign-benchmarking
description: Benchmark campaigns against portfolio-wide internal averages with tier ranking and outlier detection
---

Run campaign benchmarking using Supabase MCP `execute_sql`.

## Steps

### 1. Calculate Portfolio Benchmarks
```sql
SELECT ROUND(AVG(ctr)::numeric, 3) AS avg_ctr, ROUND(STDDEV(ctr)::numeric, 3) AS stddev_ctr,
       ROUND(AVG(cpc)::numeric, 2) AS avg_cpc, ROUND(STDDEV(cpc)::numeric, 2) AS stddev_cpc,
       ROUND(AVG(cpm)::numeric, 2) AS avg_cpm, ROUND(STDDEV(cpm)::numeric, 2) AS stddev_cpm
FROM dbt.mart_campaign_performance
WHERE start_date >= current_date - interval '90 days' AND impressions > 0;
```

### 2. Rank Campaigns
Query last 30 days from `dbt.mart_campaign_performance`, rank each campaign vs portfolio averages.

### 3. Assign Tiers
- 🟢 Top Performer: > avg + 1σ (positive direction)
- 🔵 On Track: within 1σ
- 🟡 Underperformer: < avg - 1σ (negative direction)
- 🔴 Outlier: beyond 2σ

### 4. Present
Ranked table with tier badges, WoW trends, and recommended actions for non-green campaigns.
