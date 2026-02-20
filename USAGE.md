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

# Stress full run (single full-suite invocation)
THREADS=4 npm run test:all:stress

# Dry-run preview (no tests executed)
DRY_RUN=1 npm run test:all
```

## Environment Behavior

- `TEST_ENV`: environment selector used by config routing. Empty means `DEV`.
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
6. If a batch fails, next batches still run; final exit is failed when any batch failed.

- `stress` mode (`npm run test:all:stress`):

1. Runs a single full-suite Playwright invocation (no safe pauses).

## CI/CD Mode Behavior

- `push` to `main` runs one CI job in `safe + smoke` mode by default.
- `schedule` runs one CI job in `safe + full` mode by default.
- `workflow_dispatch` can choose:

1. `run_mode` (`basic`, `safe`, `stress`)
2. `threads`
3. `test_env` (`DEV` default, options: `DEV`, `QA`, `PROD`)
4. `safe_pause_seconds`
5. `tags` (`Run specific TAGS`, e.g. `PHARMA-180|PHARMA-181`)

- Mode behavior:

1. `basic` + empty `tags` runs smoke in one pass.
2. `basic` + non-empty `tags` runs matching tags directly in one pass.
3. `safe` + empty `tags` runs full 3-batch safe mode.
4. `safe` + non-empty `tags` runs matching tags directly in one pass.
5. `stress` ignores `tags` and runs full suite in one pass.

## Tag Filtering

This repo uses tokenized, case-insensitive tag matching.

```bash
TAGS=merchant npx playwright test
TAGS='PHARMA-160|PHARMA-243|PHARMA-244' npx playwright test
```

## Discord Reporting Flow

1. Global setup posts suite header and creates run thread.
2. Reporter updates progress incrementally while tests run.
3. Final summary includes:

- pass/fail/skip totals
- rerun helper when failures include `PHARMA-<id>` in test titles
- report link when publishing succeeds

4. Channel routing:

- `REPORT_PUBLISH=0` -> `LOCAL_RUNS_CHANNELID`
- `REPORT_PUBLISH!=0` -> `TEST_ENV` channel (`DEV/QA/PROD`)

## Failure Rerun Helpers

When failures exist and PHARMA IDs are present, summary includes:

- Manual command preserving active env/threads:

```bash
TEST_ENV=DEV THREADS=4 TAGS="PHARMA-160|PHARMA-243|PHARMA-244" npx playwright test
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
