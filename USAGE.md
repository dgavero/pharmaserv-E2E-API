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
TEST_ENV=DEV THREADS=8 TAGS=smoke|regression PROJECT=e2e,api npx playwright test

# Safe full run (recommended)
npm run test:all

# Safe full run with custom pause and workers
SAFE_PAUSE_SECONDS=30 THREADS=4 npm run test:all:safe

# Stress full run (parallel batches)
THREADS=4 npm run test:all:stress

# Dry-run preview (no tests executed)
DRY_RUN=1 npm run test:all
```

## Environment Behavior

- `TEST_ENV`: environment selector used by config routing. Empty means `DEV` (current config supports `DEV` and `PROD`).
- `THREADS`: Playwright workers count (default `4`).
- `TAGS`: grep pattern used by the config; empty means no grep filter.
- `PROJECT`: `api`, `e2e`, `e2e,api`; empty means both.
- `SAFE_PAUSE_SECONDS`: pause duration between safe batches (default `30`).
- `DRY_RUN`: when `1`, prints batch plan/commands without running tests.
- Discord channel mapping vars:
1. `DEV_TESTING_CHANNELID`
2. `QA_TESTING_CHANNELID`
3. `PROD_TESTING_CHANNELID`
4. `LOCAL_RUNS_CHANNELID`

## Batch Modes

- `safe` mode (default for `npm run test:all`):
1. API standalone (`api/tests`, excluding `@workflow`)
2. Pause (`SAFE_PAUSE_SECONDS`)
3. API E2E (`api/tests/e2e`)
4. Pause (`SAFE_PAUSE_SECONDS`)
5. UI E2E (`e2e/tests`)
- `stress` mode (`npm run test:all:stress`):
1. Runs API standalone, API E2E, and UI E2E in parallel.

## CI/CD Mode Behavior

- `push` to `main` and `schedule` use safe mode by default.
- `workflow_dispatch` can choose:
1. `run_mode` (`safe` or `stress`)
2. `threads`
3. `safe_pause_seconds`
4. `rerun_project` (`api`, `e2e`, `all`)
5. `rerun_tags` (optional TAGS regex, e.g. `PHARMA-180|PHARMA-181`)
- Direct `npx playwright test ...` commands bypass safe batching.
- Worker jobs run tests only; final Discord summary/report publish happens in one finalize job.

## Targeted Failed-Test Rerun (CI)

- Use `workflow_dispatch` with:
1. `rerun_tags` set to failed IDs (pipe-separated)
2. `rerun_project` set to `api`, `e2e`, or `all`
- Behavior:
1. When `rerun_tags` is non-empty, CI runs only `rerun-targeted` job.
2. Safe/stress batch jobs are skipped.
3. `rerun_project=all` maps to `PROJECT=e2e,api`.

## Tag Filtering

This repo uses tokenized, case-insensitive tag matching.

```bash
TAGS=merchant npx playwright test
TAGS='PHARMA-160|PHARMA-243|PHARMA-244' npx playwright test
```

## Discord Reporting Flow

1. CI worker jobs execute tests and upload JUnit/blob artifacts.
2. Finalize job aggregates artifacts across executed jobs.
3. Finalize job posts one Discord message/thread for the run.
4. Final summary includes:
- pass/fail/skip totals
- rerun helper when failures include `PHARMA-<id>` in test titles
- report link (`Playwright HTML report is [here](...)`) when publishing succeeds
5. Channel routing:
- `REPORT_PUBLISH=0` -> `LOCAL_RUNS_CHANNELID`
- `REPORT_PUBLISH!=0` -> `TEST_ENV` channel (`DEV/QA/PROD`)

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
