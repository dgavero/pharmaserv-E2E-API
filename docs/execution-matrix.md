# Execution Matrix

Use this file to choose the correct runner entrypoint for the task at hand.

## Purpose

This repo has multiple ways to execute the suite:

- direct local Playwright runs
- local orchestrated full-suite runs
- local Docker parity runs
- GitHub Actions manual runs
- GitHub Actions scheduled runs

Choose the narrowest path that still matches the behavior you need to verify.

## Matrix

| Entrypoint | Purpose | When To Use | Main Env Vars | Defaults / Resolution | Output Shape |
| --- | --- | --- | --- | --- | --- |
| `npx playwright test` | Direct local run through `playwright.config.js` | Narrow debugging, targeted validation, spec/tag/project-level checks | `TEST_ENV`, `PROJECT` or `PROJECTS`, `TAGS`, `THREADS`, `HEADLESS`, `PW_BLOB_OUTPUT`, `CI` | `TEST_ENV=DEV`; `THREADS=4`; `HEADLESS=false` locally and `true` in CI; empty `PROJECT` runs both projects; empty `TAGS` means no grep filter | Console list reporter, `.playwright-report`, traces on failed `e2e`, optional `.blob-report` when `PW_BLOB_OUTPUT` is set |
| `npm run test:all` | Local full-suite orchestration through `scripts/ci/run-all.cjs` in `regression` mode | Full local regression pass without Docker, keeping one suite invocation | `TEST_ENV`, `THREADS`, `TAGS`, `DRY_RUN`, `DISCORD_REUSE_RUN` | `TEST_ENV=DEV`; `THREADS=4`; empty `TAGS`; `DRY_RUN=0`; `PROJECT` is forced empty so both projects run | Clears Discord run files and `.blob-report`, then runs `npx playwright test` once |
| `npm run test:all:stress` | Local orchestrated full-suite run in `stress` mode | High-load local pass when you want full-suite parallel intent | `TEST_ENV`, `THREADS`, `DRY_RUN`, `DISCORD_REUSE_RUN` | Same as `test:all`; `TAGS` is ignored in stress mode | Same outputs as `test:all`, but runs the full suite without tag filtering |
| `npm run docker:test` | Local Docker execution through `scripts/ci/docker-run.cjs` | Container parity check for local investigation or pre-CI reproduction | `MODE`, `TEST_ENV`, `THREADS`, `RUN_TAGS` or `TAGS`, `PROJECT`, `DOCKER_IMAGE`, `ENV_FILE`, `HEADLESS`, `DRY_RUN` | `MODE=basic`; `TEST_ENV=DEV`; `THREADS=4`; `HEADLESS=true`; `DOCKER_IMAGE=pharmaserv-tests` | Local Docker container run with mounted `.playwright-report`, `test-results`, `screenshots`, `.blob-report` |
| `npm run docker:test:regression` | Local Docker run in `regression` mode | Reproduce the containerized regression path locally | Same as `docker:test` | `MODE=regression` plus the same Docker defaults | Dockerized `npx playwright test` with the passed `RUN_TAGS` and `PROJECT` |
| `npm run docker:test:stress` | Local Docker run in `stress` mode | Reproduce the containerized stress path locally | Same as `docker:test` | `MODE=stress` plus the same Docker defaults | Dockerized `npm run test:all:stress` |
| GitHub Actions `workflow_dispatch` | Manual CI execution from `.github/workflows/tests.yml` | Shared verification, branch validation, or reproducible CI runs | Workflow inputs: `run_mode`, `threads`, `test_env`, `tags`; runtime env includes `REPORT_PUBLISH`, `CI`, `SOPS_AGE_KEY` | `run_mode=basic`; `threads=4`; `test_env=DEV`; empty `tags` runs smoke in `basic`; `regression` splits into `api` and `e2e` jobs | Uses `.github/workflows/_run-docker-tests.yml`, decrypts `.ci-secrets.env`, builds `pharmaserv-tests-ci`, uploads `.playwright-report`, `test-results`, `screenshots`, `.blob-report` |
| GitHub Actions `schedule` | Nightly QA regression from `.github/workflows/tests.yml` | Time-based shared coverage without manual input | Fixed workflow values: `mode=regression`, `test_env=QA`, `threads=2` | Two jobs: `qa-scheduled-api` and `qa-scheduled-e2e` | Same Docker/artefact flow as manual CI, with QA routing and scheduled trigger context |

## Notes

- `PROJECT` and `PROJECTS` are equivalent selector inputs in `playwright.config.js`; local scripts generally pass `PROJECT`.
- `HEADLESS` only changes browser visibility. It does not change test selection.
- `PW_BLOB_OUTPUT` only affects direct Playwright runs that go through `playwright.config.js`.
- Docker helpers use `RUN_TAGS` externally, then pass `TAGS` into Playwright inside the container.
- Local orchestrators and Docker runners intentionally clean or recreate report directories before running.

## Selection Guidance

- Use `npx playwright test` first for spec-level debugging.
- Use `npm run test:all` when you need a broader local regression without container overhead.
- Use `npm run docker:test` when you need local/CI parity.
- Use GitHub Actions manual runs when you need shared branch evidence or encrypted CI secrets.
- Use scheduled-run behavior as the reference for unattended QA regression expectations.
