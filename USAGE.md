# Usage Guide

Operational guide for running Playwright tests in this repo.

## Run Commands

```bash
# Default behavior: TEST_ENV falls back to DEV, runs both projects
TEST_ENV= THREADS=4 TAGS= PROJECT= npx playwright test

# API project only
TEST_ENV=DEV THREADS=4 TAGS=PHARMA-160 PROJECT=api npx playwright test

# E2E project only
TEST_ENV=DEV THREADS=4 TAGS=merchant PROJECT=e2e npx playwright test

# Multiple projects
TEST_ENV=STG THREADS=8 TAGS=smoke|regression PROJECT=e2e,api npx playwright test
```

## Environment Behavior

- `TEST_ENV`: environment selector used by config routing. Empty means `DEV`.
- `THREADS`: Playwright workers count (default `4`).
- `TAGS`: grep pattern used by the config; empty means no grep filter.
- `PROJECT`: `api`, `e2e`, `e2e,api`; empty means both.

## Tag Filtering

This repo uses tokenized, case-insensitive tag matching.

```bash
TAGS=merchant npx playwright test
TAGS='PHARMA-160|PHARMA-243|PHARMA-244' npx playwright test
```

## Discord Reporting Flow

1. Global setup posts suite header and creates run thread.
2. Header updates with live progress and pass/fail/skip summary.
3. API assertion failures are posted as compact snippets.
4. Final summary includes:
- pass/fail/skip totals
- rerun helper when failures include `PHARMA-<id>` in test titles
- report link (`Playwright HTML report is [here](...)`) when publishing succeeds

## Failure Rerun Helpers

When failures exist and PHARMA IDs are present, summary includes:

- CI placeholder link: `Rerun the failures [here](...)`
- Manual command preserving active env/threads/project:

```bash
TEST_ENV=DEV THREADS=4 TAGS="PHARMA-160|PHARMA-243|PHARMA-244" PROJECT=api npx playwright test
```

If no failures exist, summary shows: `Yay. No failures!`

## Report Publishing

- Publisher script: `scripts/publish-report.js`
- Default: publish is enabled
- Disable publishing with:

```bash
REPORT_PUBLISH=0 npx playwright test
```

## API Authoring Rules

For API test creation/update conventions, follow:

- [AGENTS.MD](./AGENTS.MD)

That file is the source-of-truth for:
- required imports/fixtures
- GraphQL query file separation
- happy path and negative auth patterns
- naming rules (`Res` suffix, no generic `res`)
