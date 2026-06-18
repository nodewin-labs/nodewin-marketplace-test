---
name: onboarding
description: Validate campaign naming, persona mapping, and UTM tracking against live Supabase data
---

Run performance marketer onboarding using Supabase MCP `execute_sql`.

## Steps

### 1. Campaign Naming Compliance
Fetch all campaigns from `linkedin_ads.campaigns`, classify each as new convention / legacy / non-compliant.

### 2. Persona Mapping
Cross-reference persona abbreviations in campaign names against `reference.persona_buckets`. Flag unmapped personas.

### 3. Glossary Compliance
Parse campaign name fields and check against the approved abbreviation glossary in `references/campaign-naming-convention.md`.

### 4. UTM Verification
Present expected HubSpot tracking templates from `references/utm-tracking-convention.md`. Ask user to confirm.

### 5. Summary Dashboard
Present overall onboarding status with recommended actions.
