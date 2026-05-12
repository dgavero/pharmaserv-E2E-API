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
- Regression runner for full-suite single-invocation execution
- Smoke selection is supported in CI (`basic` runs in one pass)
- Optional stress mode for full parallel execution
- Incremental Discord progress reporting during CI runs
- Rerun failed PHARMA IDs helper in summary

## Discord Channel Routing

- If `REPORT_PUBLISH=0`, reports go to `LOCAL_RUNS_CHANNELID` regardless of `TEST_ENV`.
- If `REPORT_PUBLISH!=0`, channel is selected by `TEST_ENV`:

1. `DEV` -> `DEV_TESTING_CHANNELID`
2. `QA` -> `QA_TESTING_CHANNELID`
3. `PROD` -> `PROD_TESTING_CHANNELID`

- Fallback channel is always `LOCAL_RUNS_CHANNELID`.

## Installation

```bash
npm install
```

## First Run

Use this checklist for a clean local setup before you troubleshoot framework behavior.

1. Use Node.js 20 to match CI.
2. Install dependencies:

```bash
npm install
```

3. Install Playwright browsers:

```bash
npx playwright install
```

4. Choose one local config path:
- Plain local env files:
  copy [.env.example](/Users/dgavero/pw/pharmaserv/pharmaserv-E2E-API/.env.example) to `.env`, then fill in real values locally.
- Encrypted env bundle:
  use [secrets/README.md](/Users/dgavero/pw/pharmaserv/pharmaserv-E2E-API/secrets/README.md), then load secrets with:

```bash
eval "$(TEST_ENV=DEV npm run -s secrets:load)"
```

5. If you plan to use local Docker runs, install Docker Desktop or a compatible local Docker Engine and confirm `docker` is available on your shell path.

6. Run one narrow sanity check per layer:

```bash
# API sanity
TEST_ENV=DEV THREADS=1 PROJECT=api TAGS=PHARMA-160 npx playwright test

# E2E sanity
TEST_ENV=DEV THREADS=1 PROJECT=e2e TAGS=merchant npx playwright test
```

## Quick Start

Running on macOS/Linux:

```bash
# Run all projects (default)
TEST_ENV=DEV THREADS=4 TAGS= PROJECT= npx playwright test

# API only
TEST_ENV=DEV THREADS=4 TAGS=PHARMA-160 PROJECT=api npx playwright test

# E2E only
TEST_ENV=DEV THREADS=4 TAGS=merchant PROJECT=e2e npx playwright test

# Regression full-run orchestration
npm run test:all

# Stress full-run orchestration (single full invocation with parallel workers, high load)
npm run test:all:stress

# Regression dry-run preview (logs only, no test execution)
DRY_RUN=1 npm run test:all
```

Running on Windows PowerShell:

```powershell
$env:TEST_ENV='DEV'; $env:THREADS='4'; $env:TAGS=''; $env:PROJECT=''; npx playwright test
$env:DRY_RUN='1'; npm run test:all; Remove-Item Env:DRY_RUN
```

Running local Docker on macOS/Linux:

```bash
npm run docker:build
npm run docker:test
npm run docker:test:regression
npm run docker:test:stress
TEST_ENV=DEV TAGS=e2e-1 PROJECT=e2e ./scripts/ci/docker-run.sh
```

Running local Docker on Windows PowerShell:

```powershell
npm run docker:build
npm run docker:test
$env:TEST_ENV='DEV'; $env:RUN_TAGS='e2e-1'; $env:PROJECT='e2e'; npm run docker:test; Remove-Item Env:TEST_ENV; Remove-Item Env:RUN_TAGS; Remove-Item Env:PROJECT
```

## Environment Profiles (DEV/QA/PROD)

Use profile files so test code never changes across environments:

1. Keep shared defaults in `.env`.
2. Put env-specific credentials/data in `.env.dev`, `.env.qa`, `.env.prod`.
3. Optional local overrides: `.env.local` and `.env.<env>.local`.
4. Switch environment only with `TEST_ENV`.

```bash
TEST_ENV=DEV PROJECT=api npx playwright test
TEST_ENV=QA PROJECT=api npx playwright test
TEST_ENV=PROD PROJECT=api npx playwright test
```

Load order is:
`.env` -> `.env.<test_env>` -> `.env.local` -> `.env.<test_env>.local`
(shell/CI vars override files).

API URL resolution for API tests:
`API_BASE_URL` (explicit override) -> `API_BASE_URL_<TEST_ENV>` (`API_BASE_URL_DEV|QA|PROD`).

## Encrypted Secrets (sops + age)

Credential and environment data can be sourced from encrypted bundles in `secrets/` instead of GitHub repo secret-per-key mapping.

1. Build encrypted files from local profile files:

Running on macOS/Linux:

```bash
SOPS_AGE_RECIPIENTS="age1..." npm run secrets:encrypt
```

Running on Windows PowerShell:

```powershell
$env:SOPS_AGE_RECIPIENTS='age1...'; npm run secrets:encrypt; Remove-Item Env:SOPS_AGE_RECIPIENTS
```

2. Runtime load (local):

Running on macOS/Linux:

```bash
eval "$(TEST_ENV=DEV npm run -s secrets:load)"
```

Running on Windows PowerShell:

```powershell
npm run secrets:install-tools
Invoke-Expression "& { $(npm run -s secrets:load:powershell) }"
```

3. CI load:

- Set one bootstrap secret: `SOPS_AGE_KEY` (full age private key file content).
- Workflow decrypts `secrets/secrets.<env>.enc.json` and exports vars to `GITHUB_ENV`.

Details: [secrets/README.md](./secrets/README.md)

## Regression vs Direct Run

- `npm run test:all` runs a single full-suite invocation (`regression` mode).
- Direct `npx playwright test ...` remains useful for targeted local runs.
- `npm run docker:test*` runs the local Docker workflow from macOS, Linux, and Windows PowerShell.

## CI Behavior

- `push` to `main`: runs `test-merge` job in `basic + smoke` mode.
- `schedule`: runs full QA regression coverage in parallel `api` + `e2e` jobs.

## CI Architecture

Current CI flow from trigger to outputs:

```text
push main
  -> .github/workflows/tests.yml
  -> test-merge
  -> .github/workflows/_run-docker-tests.yml
  -> scripts/secrets/load-secrets.js
  -> scripts/ci/run-tests-in-docker.sh
  -> Docker image pharmaserv-tests-ci
  -> playwright run
  -> artifacts: .playwright-report, test-results, screenshots, .blob-report
  -> Discord/report publishing based on branch routing

workflow_dispatch
  -> .github/workflows/tests.yml
  -> test-manual or regression-api + regression-e2e
  -> .github/workflows/_run-docker-tests.yml
  -> scripts/ci/run-tests-in-docker.sh
  -> Docker image pharmaserv-tests-ci
  -> playwright run
  -> artifacts + Discord/report outputs

schedule
  -> .github/workflows/tests.yml
  -> qa-scheduled-api + qa-scheduled-e2e
  -> .github/workflows/_run-docker-tests.yml
  -> scripts/ci/run-tests-in-docker.sh
  -> Docker image pharmaserv-tests-ci
  -> playwright run
  -> artifacts + Discord/report outputs
```

## CI Manual Run Inputs

- In GitHub Actions `workflow_dispatch`, you can set:

1. `run_mode` (`basic`, `regression`, `stress`)
2. `threads`
3. `test_env` (`DEV` default, options: `DEV`, `QA`, `PROD`)
4. `tags` (`Run specific TAGS`, example: `PHARMA-180|PHARMA-181`)

- Behavior:

1. `stress` ignores `tags` and runs full suite in parallel.
2. `regression` runs one workflow with two parallel jobs:
   - `regression-api` -> `PROJECT=api`
   - `regression-e2e` -> `PROJECT=e2e`
3. `regression` supports optional `tags` filtering inside each parallel job.
4. `basic` + empty `tags` runs smoke tags.
5. `basic` + non-empty `tags` runs matching tags directly.

## Core Docs

- Usage and run patterns: [USAGE.md](./USAGE.md)
- API test authoring source-of-truth: [AGENTS.md](./AGENTS.md)
- Execution entrypoints and when to use them: [docs/execution-matrix.md](./docs/execution-matrix.md)
- Framework change validation for approval-required areas: [docs/framework-change-checklist.md](./docs/framework-change-checklist.md)
- Runtime env var reference and dummy values: [.env.example](./.env.example)
- Framework architecture and extension rules:
  - [docs/architecture.md](./docs/architecture.md)
  - [docs/test-layer-map.md](./docs/test-layer-map.md)
  - [docs/coding-standards.md](./docs/coding-standards.md)
  - [docs/api-validation-checklist.md](./docs/api-validation-checklist.md)
  - [docs/change-workflow.md](./docs/change-workflow.md)
  - [docs/risk-checklist.md](./docs/risk-checklist.md)

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
├── scripts/ci/publish-report.js
├── playwright.config.js
├── globalSetup.js
└── AGENTS.md
```

## Notes

- API test creation/update rules are maintained in `AGENTS.md`.
- Keep GraphQL operations in sibling query files for reuse.
- Prefer descriptive response variable naming with `Res` suffix only.

## Current Framework Direction

- API auth uses explicit role logins plus named account/profile resolution.
- API workflow specs should prefer shared workflow steps under `api/tests/e2e/shared/steps/` over repeated inline role login + `safeGraphQL(...)`.
- Merchant hybrid specs use:
  - `merchantPortalContext.js`
  - `getMerchantPortalAccount(...)`
  - merchant page objects for merchant operations
  - hybrid action modules for patient/admin/rider API orchestration
- Merchant hybrid branch binding is explicit through the active merchant account profile.
- Active rider/patient/branch IDs should resolve through account/profile helpers, not direct spec-level env reads.

## Preferred Extension Path

- New API feature test:
  - add the spec under `api/tests/<role>/<feature>/`
  - place long GraphQL operations in a sibling query file
  - use account/profile helpers instead of direct env ID reads
- New API workflow test:
  - add or reuse operations in `api/tests/e2e/shared/queries/`
  - add or reuse actor transitions in `api/tests/e2e/shared/steps/`
  - keep the spec orchestration-only
- New hybrid merchant test:
  - bootstrap merchant state with `merchantPortalContext.js`
  - keep merchant operations in page objects
  - keep patient/admin/rider API actions in hybrid action modules
  - create orders with delivery-specific builders such as `buildDeliverXHybridOrderInput(...)`, `buildPabiliHybridOrderInput(...)`, or `buildFindMyMedsHybridOrderInput(...)`
