# OKR System Plugin

OKR lifecycle management for Claude Code and Claude Cowork — from business discovery to monthly tracking.

## What's Inside

| Skill | Command | Purpose |
|-------|---------|---------|
| **okr-onboarding** | `/okr-system-plugin:okr-onboarding` | Multi-phase interview: business discovery → OKR tree → dataset |
| **okr-update** | `/okr-system-plugin:okr-update` | Monthly check-in: log actuals, confront gaps, re-render dashboard |
| **okr-dashboard** | `/okr-system-plugin:okr-dashboard` | Render interactive dashboard from dataset (read-only) |

## How It Works

1. **Onboarding** interviews you in 4 phases — business discovery (identity, market, customer journey, challenges), OKR direction (objectives, baselines, calibration), tree derivation, and validation. Uses `/interview` at each phase to push back on weak answers.
2. **The dataset** (`data/okr-dataset.json`) is the single source of truth. Everything else is a view.
3. **Monthly updates** capture actuals, surface gaps, and coach you on what to change.
4. **The dashboard** renders an interactive React artifact with progress charts, revenue derivation, and OKR scores.

## OKR Dimensions

The system tracks OKRs across two dimensions:

- **Customer Journey** — mapped to Bowtie stages (Awareness → Education → Selection → Onboarding → Impact → Growth)
- **Organizational Readiness** — mapped to three pillars (People / Process / Tech)

## Install

### Option A: Claude Code CLI

```bash
claude --plugin-dir /path/to/okr-system-plugin
```

### Option B: Copy to your plugins directory

```bash
cp -r okr-system-plugin ~/.claude/plugins/
```

### Option C: From GitHub (after pushing)

```bash
git clone https://github.com/YOUR-ORG/okr-system-plugin.git
claude --plugin-dir ./okr-system-plugin
```

## Setup for a New OKR Project

This plugin is designed for **dedicated Cowork projects** — each project gets its own OKR dataset with project-local memory.

```bash
# Create a new project directory
mkdir -p ~/my-company-okrs

# Copy the plugin's data scaffolding into it
cp -r schema/ ~/my-company-okrs/
cp -r scripts/ ~/my-company-okrs/
cp -r data/ ~/my-company-okrs/

# Open in Claude Cowork with the plugin loaded
cd ~/my-company-okrs
claude --plugin-dir /path/to/okr-system-plugin
```

Then run:
```
/okr-system-plugin:okr-onboarding
```

## File Structure

```
okr-system-plugin/
├── .claude-plugin/
│   └── plugin.json              ← Plugin manifest
├── README.md                    ← This file
├── skills/
│   ├── okr-onboarding/SKILL.md  ← Business discovery + OKR interview
│   ├── okr-update/SKILL.md      ← Monthly check-in
│   └── okr-dashboard/SKILL.md   ← Dashboard renderer
├── schema/
│   └── okr-schema.md            ← Dataset validation rules
├── scripts/
│   └── okr-dashboard.jsx        ← React dashboard template
└── data/
    └── okr-dataset.json         ← Empty scaffold (populated by onboarding)
```

## Schema Highlights

- Revenue is **always derived** — never entered directly. The formula adapts to your business model.
- Every KR has a `dimension` tag: `customer_journey` (with Bowtie stage) or `organizational` (with pillar: people/process/tech).
- Targets are immutable by default — changes require a reason logged in `meta.change_log`.
- `meta.business_context` preserves the Phase 0 discovery so you never lose context.

## Requirements

- Claude Code or Claude Desktop (Cowork mode)
- The `/interview` skill must be available (bundled with most Claude Code setups)
