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

- `push` to `main` and `schedule` run one CI job in `safe + smoke` mode by default.
- `workflow_dispatch` can choose:
1. `run_mode` (`safe` or `stress`)
2. `suite_scope` (`smoke` or `full`) for non-rerun runs
3. `threads`
4. `test_env` (`DEV` default, options: `DEV`, `QA`, `PROD`)
5. `safe_pause_seconds`
6. `rerun_project` (`api`, `e2e`, `all`)
7. `rerun_tags` (`Run specific TAGS`, e.g. `PHARMA-180|PHARMA-181`)
- When `rerun_tags` is empty:
1. `safe + smoke` runs one Playwright invocation with smoke tags
2. `safe + full` runs `npm run test:all:safe` (3 safe batches with pauses)
3. `stress` runs `npm run test:all:stress`
- When `rerun_tags` is set, CI runs only matching tags in the selected project scope.

## Targeted Failed-Test Rerun (CI)

- Use `workflow_dispatch` with:
1. `rerun_tags` set to failed IDs (pipe-separated)
2. `rerun_project` set to `api`, `e2e`, or `all`
- Behavior:
1. `rerun_tags` non-empty switches CI to targeted execution.
2. `rerun_project=all` maps to `PROJECT=e2e,api`.

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
- report link (`Playwright HTML report is [here](...)`) when publishing succeeds
4. Channel routing:
- `REPORT_PUBLISH=0` -> `LOCAL_RUNS_CHANNELID`
- `REPORT_PUBLISH!=0` -> `TEST_ENV` channel (`DEV/QA/PROD`)

## Failure Rerun Helpers

When failures exist and PHARMA IDs are present, summary includes:

- CI placeholder link: `Rerun the failures [here](...)`
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
