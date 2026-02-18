# Playwright E2E + API Automation

Playwright test framework for Pharmaserv with:
- UI (`e2e`) and API (`api`) projects
- Discord live reporting
- HTML report publishing to GitHub Pages
- Tag/project/env-driven execution

## Features

- `PROJECT` selector support: `api`, `e2e`, or `e2e,api` (default runs both)
- `TEST_ENV` routing with default `DEV`
- Tokenized, case-insensitive `TAGS` filtering
- Safe batch runner for full suites (`api standalone` -> `api e2e` -> `ui e2e`) with pause controls
- Optional stress mode for parallel batch execution
- Discord run header + thread logs + final summary
- Rerun failed PHARMA IDs helper in summary
- Optional report publishing (`REPORT_PUBLISH=0` disables publish)

## Installation

```bash
npm install
```

## Quick Start

```bash
# Run all projects (default)
TEST_ENV=DEV THREADS=4 TAGS= PROJECT= npx playwright test

# API only
TEST_ENV=DEV THREADS=4 TAGS=PHARMA-160 PROJECT=api npx playwright test

# E2E only
TEST_ENV=DEV THREADS=4 TAGS=merchant PROJECT=e2e npx playwright test

# Safe full-run orchestration (recommended for shared DEV)
npm run test:all

# Stress full-run orchestration (parallel batches, high load)
npm run test:all:stress

# Safe dry-run preview (logs only, no test execution)
DRY_RUN=1 npm run test:all
```

## Safe vs Direct Run

- `npm run test:all` uses safe batch sequencing with pauses.
- Direct `npx playwright test ...` does not use batch safety and can overload shared DEV if scope is broad.

## Core Docs

- Usage and run patterns: [USAGE.md](./USAGE.md)
- Testing vision and engineering principles: [PROJECTVISIONS.md](./PROJECTVISIONS.md)
- API test authoring source-of-truth: [AGENTS.MD](./AGENTS.MD)
- Version history: [CHANGELOG.md](./CHANGELOG.md)

## Project Structure

```text
pharmaserv-E2E-API/
├── api/
│   ├── globalConfig.api.js
│   ├── helpers/
│   └── tests/
├── e2e/
│   ├── globalConfig.ui.js
│   ├── helpers/
│   ├── pages/
│   └── tests/
├── helpers/discord/
├── scripts/publish-report.js
├── playwright.config.js
├── globalSetup.js
└── AGENTS.MD
```

## Notes

- API test creation/update rules are maintained in `AGENTS.MD`.
- Keep GraphQL operations in sibling query files for reuse.
- Prefer descriptive response variable naming with `Res` suffix only.
