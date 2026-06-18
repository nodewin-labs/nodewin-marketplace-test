---
name: campaign-benchmarking
description: Compare campaigns against portfolio-wide internal benchmarks with tier ranking, outlier detection, and week-over-week trends
---

# Campaign Benchmarking

Rank campaigns against internal portfolio benchmarks. Identifies top performers, underperformers, and statistical outliers with actionable recommendations.

## Data Sources

- `dbt.mart_campaign_performance` — campaign-level metrics by date (CTR, CPC, CPM, engagement rate, cost)
- `dbt.mart_daily_spend_summary` — daily spend with 7d moving averages
- `linkedin_ads.campaigns` — campaign metadata
- `linkedin_ads.campaign_groups` — campaign group metadata

## Execution

### Step 1: Calculate Portfolio Benchmarks

Compute portfolio-wide averages and standard deviations from the last 90 days. Only include campaigns with meaningful volume (> 500 impressions total).

```sql
SELECT
  ROUND(AVG(ctr)::numeric, 3) AS avg_ctr,
  ROUND(STDDEV(ctr)::numeric, 3) AS stddev_ctr,
  ROUND(AVG(cpc)::numeric, 2) AS avg_cpc,
  ROUND(STDDEV(cpc)::numeric, 2) AS stddev_cpc,
  ROUND(AVG(cpm)::numeric, 2) AS avg_cpm,
  ROUND(STDDEV(cpm)::numeric, 2) AS stddev_cpm,
  ROUND(AVG(engagement_rate)::numeric, 3) AS avg_engagement_rate,
  ROUND(STDDEV(engagement_rate)::numeric, 3) AS stddev_engagement_rate,
  COUNT(DISTINCT campaign_name) AS campaigns_in_benchmark
FROM dbt.mart_campaign_performance
WHERE start_date >= current_date - interval '90 days'
  AND impressions > 0;
```

### Step 2: Rank Individual Campaigns

Get campaign performance for the analysis period (default: last 30 days):

```sql
SELECT campaign_name, objective_type,
  SUM(impressions) AS impressions,
  SUM(clicks) AS clicks,
  SUM(cost_usd) AS cost,
  ROUND(AVG(ctr)::numeric, 3) AS ctr,
  ROUND(AVG(cpc)::numeric, 2) AS cpc,
  ROUND(AVG(cpm)::numeric, 2) AS cpm,
  ROUND(AVG(engagement_rate)::numeric, 3) AS engagement_rate
FROM dbt.mart_campaign_performance
WHERE start_date >= current_date - interval '30 days'
  AND impressions > 0
GROUP BY campaign_name, objective_type
ORDER BY cost DESC;
```

### Step 3: Assign Performance Tiers

For each campaign, compare each metric against the portfolio benchmark:

| Tier | Criteria | Badge |
|------|----------|-------|
| **Top Performer** | CTR > avg + 1σ AND CPC < avg - 1σ (better in positive direction) | 🟢 |
| **On Track** | All metrics within 1σ of average | 🔵 |
| **Underperformer** | Any metric worse than avg ± 1σ (negative direction) | 🟡 |
| **Outlier** | Any metric beyond avg ± 2σ (flag for investigation) | 🔴 |

**Direction awareness:**
- CTR, engagement_rate: higher = better (top performer > avg + 1σ)
- CPC, CPM: lower = better (top performer < avg - 1σ)

Overall tier = worst individual metric tier.

### Step 4: Week-over-Week Trends

```sql
SELECT campaign_name, start_date,
  ctr, cpc, cpm, engagement_rate,
  LAG(ctr) OVER (PARTITION BY campaign_name ORDER BY start_date) AS prev_ctr,
  LAG(cpc) OVER (PARTITION BY campaign_name ORDER BY start_date) AS prev_cpc,
  LAG(cpm) OVER (PARTITION BY campaign_name ORDER BY start_date) AS prev_cpm,
  LAG(engagement_rate) OVER (PARTITION BY campaign_name ORDER BY start_date) AS prev_engagement_rate
FROM dbt.mart_campaign_performance
WHERE start_date >= current_date - interval '14 days'
ORDER BY campaign_name, start_date;
```

Calculate WoW change % for each metric. Flag:
- **Improving**: metric moving in positive direction > 10%
- **Stable**: within ±10%
- **Declining**: metric moving in negative direction > 10%

### Step 5: Present Benchmark Report

**Portfolio Benchmarks (90-day):**
```
| Metric          | Average | Std Dev | Good (>avg+1σ) | Bad (<avg-1σ) |
|-----------------|---------|---------|----------------|---------------|
| CTR             | 0.72%   | 0.31%   | > 1.03%        | < 0.41%       |
| CPC             | $5.40   | $2.10   | < $3.30        | > $7.50       |
| CPM             | $38.20  | $12.50  | < $25.70       | > $50.70      |
| Engagement Rate | 0.45%   | 0.18%   | > 0.63%        | < 0.27%       |
```

**Campaign Rankings:**
```
| Campaign | Tier | CTR (vs avg) | CPC (vs avg) | CPM (vs avg) | Eng% (vs avg) | WoW Trend | Action |
```

For underperformers and outliers, include specific recommended actions:
- **High CPC**: Narrow audience, improve ad relevance, test new creatives
- **Low CTR**: Refresh creative, adjust copy, test different formats
- **Low engagement**: Review audience-content fit, test thought leadership content
- **Declining trend**: Possible creative fatigue, consider pausing and refreshing

## CLI Fallback

For terminal access, query the same dbt marts via psql with `--profile {client_name}`.
