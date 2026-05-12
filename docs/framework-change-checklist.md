# Framework Change Checklist

Use this checklist when changing approval-required framework areas rather than individual tests.

## Scope

This file is for changes to:

- `playwright.config.js`
- `globalSetup.js`
- `api/globalConfig.api.js`
- `e2e/globalConfig.ui.js`
- CI workflows under `.github/workflows/`
- Docker runners under `scripts/ci/`
- secrets loading under `scripts/secrets/`
- reporting under `helpers/discord/`, `api/helpers/apiReporting.js`, or `e2e/helpers/reporting/`

For general editing process, still follow:

- [AGENTS.md](/Users/dgavero/pw/pharmaserv/pharmaserv-E2E-API/AGENTS.md)
- [docs/change-workflow.md](/Users/dgavero/pw/pharmaserv/pharmaserv-E2E-API/docs/change-workflow.md)
- [docs/risk-checklist.md](/Users/dgavero/pw/pharmaserv/pharmaserv-E2E-API/docs/risk-checklist.md)

## Before Editing

1. Confirm the user explicitly asked for a framework/config/workflow/reporting/secrets change.
2. State the blast radius:
   runner config, shared harnesses, report routing, Docker path, CI path, or secrets path.
3. Identify whether the change affects:
   local runs, Docker runs, CI runs, or all three.
4. Identify whether the change affects:
   `api`, `e2e`, or both projects.
5. Confirm whether the change is behavior-only, docs-only, or docs plus behavior.

## Validation Matrix

After changing a framework area, validate the narrowest path that proves the behavior without skipping any affected execution layer.

### Runner Config Changes

Examples:

- `playwright.config.js`
- project selection logic
- grep/tag logic
- env loading
- reporter configuration
- headless behavior

Validate:

1. One direct API run:
   `TEST_ENV=DEV THREADS=1 PROJECT=api TAGS=<known-tag> npx playwright test`
2. One direct E2E run:
   `TEST_ENV=DEV THREADS=1 PROJECT=e2e TAGS=<known-tag> npx playwright test`
3. Any changed selector behavior:
   confirm the resolved project/tag/env path matches expectation.
4. If env loading changed:
   verify `.env`, `.env.<env>`, `.env.local`, and shell precedence conceptually or with a narrow probe.
5. If reporter setup changed:
   verify local artifact output still appears in `.playwright-report` and `test-results`.

### Shared Harness Changes

Examples:

- `api/globalConfig.api.js`
- `e2e/globalConfig.ui.js`

Validate:

1. One narrow API test that consumes `api`.
2. One narrow hybrid or UI test that consumes the UI harness.
3. Any changed failure handling:
   confirm the test still fails with a clear signal.
4. Any changed base URL behavior:
   confirm both UI and API contexts resolve expected URLs for the chosen `TEST_ENV`.

### Secrets Flow Changes

Examples:

- `scripts/secrets/load-secrets.js`
- `scripts/secrets/validate-env-file.*`
- `.env.example`
- `secrets/README.md`

Validate:

1. Local shell export path:
   confirm the documented command still produces usable env output.
2. If CI loading changed:
   confirm `.github/workflows/_run-docker-tests.yml` still matches the script interface.
3. Validate required-key checks using the narrowest realistic env file.
4. Confirm no newly required credential key is undocumented.

### Reporting Changes

Examples:

- `helpers/discord/`
- `api/helpers/apiReporting.js`
- `e2e/helpers/reporting/`
- `globalSetup.js`

Validate:

1. A passing run still completes without reporter errors.
2. A failing run still completes without masking the test failure.
3. Channel routing still matches:
   `REPORT_PUBLISH=0` -> `LOCAL_RUNS_CHANNELID`
   `REPORT_PUBLISH=1` -> env channel with fallback.
4. If rerun-helper behavior changed:
   verify PHARMA-tagged failure titles still build usable rerun output.

### CI / Docker Workflow Changes

Examples:

- `.github/workflows/tests.yml`
- `.github/workflows/_run-docker-tests.yml`
- `scripts/ci/run-tests-in-docker.*`
- `scripts/ci/docker-run.*`
- `scripts/ci/run-all.*`

Validate:

1. Local Docker dry run if possible:
   confirm resolved mode, env, tags, and project are correct.
2. Local orchestrator dry run if possible:
   confirm command preview is correct.
3. Artifact directories still exist after execution:
   `.playwright-report`, `test-results`, `screenshots`, and `.blob-report` where applicable.
4. If workflow inputs changed:
   confirm `tests.yml` passes the same names expected by `_run-docker-tests.yml`.
5. If branch-based report routing changed:
   confirm `main` vs non-`main` behavior is still explicit.

## Output Checks Before Closing

Confirm all of the following:

- The docs still match the code path you changed.
- Approval-required areas changed only as needed.
- No unrelated test refactor was bundled into the framework diff.
- The change does not silently break one execution path while fixing another.
- Any path you did not validate is named explicitly in the closeout.

## Common Failure Modes

- Updating `playwright.config.js` but forgetting Docker or CI wrappers that set env vars differently.
- Changing env expectations without updating `.env.example` or `secrets/README.md`.
- Changing report routing without checking `REPORT_PUBLISH` branch logic.
- Updating a reusable workflow input name in one workflow file but not the caller.
- Fixing local direct runs while leaving Docker-only defaults inconsistent.
