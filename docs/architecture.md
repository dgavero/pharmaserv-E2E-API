# Repository Architecture

## Overview

This repository is a Playwright automation project with two main execution layers:

- API tests in `api/`
- UI and hybrid merchant tests in `e2e/`

One Playwright config drives both.

Core runner:

- `playwright.config.js`

Core harnesses:

- `api/globalConfig.api.js`
- `e2e/globalConfig.ui.js`

## Framework and Language

- Framework: Playwright (`@playwright/test`)
- Language: JavaScript
- Module style in runtime code: `import` / `export`
- `package.json` declares `"type": "commonjs"`, but the active test/config code uses ES module syntax. Do not try to "fix" module style as part of unrelated work.

## Folder Layout

Top level:

- `api/` API fixtures, helpers, and tests
- `e2e/` UI fixtures, helpers, selectors, page objects, and merchant specs
- `helpers/` shared cross-project utilities such as Discord reporting and random data
- `scripts/` run orchestration, report publishing, secrets tooling
- `secrets/` encrypted env bundles for CI/runtime loading

API layout:

- `api/globalConfig.api.js` shared API fixture and auth fixtures
- `api/helpers/graphqlClient.js` GraphQL POST helper
- `api/helpers/graphqlUtils.js` normalized GraphQL request helpers
- `api/helpers/auth.js` shared auth and token helpers
- `api/helpers/apiReporting.js` shared API failure reporting helpers
- `api/tests/<role>/<feature>/...` role-based feature tests
- `api/tests/e2e/...` API-only workflow tests
- `api/tests/e2e/shared/queries/` shared workflow GraphQL docs
- `api/tests/e2e/shared/steps/` shared API workflow actions

UI/hybrid layout:

- `e2e/globalConfig.ui.js` UI fixture plus per-test API context
- `e2e/helpers/uiActions.js` safe UI action and wait helpers
- `e2e/helpers/testFailure.js` UI failure state and screenshot helpers
- `e2e/helpers/reporting/discordReporterClient.js` Discord queueing and flush client
- `e2e/helpers/selectors.js` selector loader/resolver
- `e2e/selectors/merchant.selectors.json` merchant selector source
- `e2e/pages/merchantPortal/` merchant page objects
- `e2e/tests/merchantPortal/` merchant UI and hybrid specs
- `e2e/tests/merchantPortal/actions/` API orchestration for patient/admin/rider in hybrid flows

## Execution Model

Playwright projects are declared in `playwright.config.js`:

- `api` runs `./api/tests`
- `e2e` runs `./e2e/tests`

The config also handles:

- env file loading
- `TEST_ENV` normalization
- dynamic base URL selection
- `PROJECT` filtering
- `TAGS` grep filtering
- worker count via `THREADS`
- headless selection
- reporter setup

Global setup in `globalSetup.js`:

- cleans screenshots/report artifacts
- initializes Discord run reporting

Safe full-run orchestration outside raw Playwright:

- `scripts/run-all.sh` runs:
  - API standalone batch
  - API workflow batch
  - UI/hybrid batch

CI execution is controlled by `.github/workflows/tests.yml` and switches among:

- `basic`
- `safe`
- `stress`

## API Layer

API tests are GraphQL-heavy and rely on a shared normalized wrapper:

- `safeGraphQL(api, { query, variables, headers })`

This wrapper standardizes:

- `ok`
- `httpOk`
- `httpStatus`
- `body`
- `errorCode`
- `errorClass`
- `errorMessage`
- `errorPath`

Auth and header helpers also live in `api/helpers/auth.js` and `api/helpers/graphqlUtils.js`:

- `bearer(token)`
- `loginAndGetTokens(...)`
- `adminLoginAndGetTokens(...)`
- `riderLoginAndGetTokens(...)`
- `pharmacistLoginAndGetTokens(...)`
- `getGQLError(...)`

Example placement:

- patient feature query docs: `api/tests/patient/ordering/patient.orderingQueries.js`
- admin feature spec: `api/tests/admin/riderManagement/rider.getDocumentToken.spec.js`
- API workflow shared step module: `api/tests/e2e/shared/steps/patient.steps.js`

## UI and Hybrid Merchant Layer

Merchant UI automation uses a page-object model plus "safe" helper wrappers.

Important files:

- `e2e/pages/merchantPortal/merchantPortalLogin.page.js`
- `e2e/pages/merchantPortal/merchantOrders.page.js`
- `e2e/pages/merchantPortal/merchantOrderDetails.page.js`

Specs under `e2e/tests/merchantPortal/` typically orchestrate:

- order setup through API
- merchant actions through UI
- downstream patient/admin/rider actions through API
- terminal merchant verification through UI

Hybrid merchant flow guardrails already encoded in the repo:

- merchant actions remain UI-only
- active merchant branch must be used for order creation
- final verification must confirm both detail page status and Orders tab placement
- some flows are Manila-time sensitive

Hybrid action modules:

- `e2e/tests/merchantPortal/actions/patientActions.js`
- `e2e/tests/merchantPortal/actions/adminActions.js`
- `e2e/tests/merchantPortal/actions/riderActions.js`

Shared hybrid input builders:

- `e2e/tests/merchantPortal/generic.orderData.js`

## Selectors

Selectors are centralized in JSON and resolved by path:

- source: `e2e/selectors/merchant.selectors.json`
- loader: `e2e/helpers/selectors.js`

Current strategy:

- strongly XPath-heavy
- often text-aware
- supports dynamic templates like booking reference selectors
- used by page objects, not meant for spec-level duplication

Example:

- JSON key: `Orders.OrderCardBookingReferenceIDTemplate`
- page object resolves the template with a booking reference

Do not duplicate merchant selectors directly in specs when a selector already belongs in the shared JSON map.

## Shared Helpers and Utilities

Shared random data:

- `helpers/globalTestUtils.js`

Shared Discord reporting:

- `helpers/discord/discordBot.js`
- `helpers/discord/discordReporter.js`
- `helpers/discord/discordSetup.js`

Shared timeout constants:

- `e2e/Timeouts.js`

Safe UI helper examples:

- `safeClick(...)`
- `safeInput(...)`
- `safeClearText(...)`
- `safeUploadFile(...)`
- `safeWaitForPageLoad(...)`
- `markFailed(...)`

## Environment and Config Resolution

The repo uses layered env loading:

1. `.env`
2. `.env.<test_env>`
3. `.env.local`
4. `.env.<test_env>.local`

Supported `TEST_ENV` values:

- `DEV`
- `QA`
- `PROD`

UI base URL resolution is handled in `playwright.config.js`.

API base URL resolution is handled in:

- `playwright.config.js`
- `api/globalConfig.api.js`

GraphQL path override:

- `GRAPHQL_PATH`
- default in `api/helpers/graphqlClient.js`

CI secret loading:

- workflow: `.github/workflows/tests.yml`
- tooling: `scripts/secrets/`
- encrypted bundles: `secrets/secrets.<env>.enc.json`

Common env-coupled inputs used across tests:

- role credentials
- branch IDs
- rider IDs
- reusable order IDs
- environment-specific medicine IDs

## Where New Code Should Go

Add new code to the layer that matches the test’s purpose.

API feature test:

- spec under `api/tests/<role>/<feature>/`
- GraphQL docs in sibling query file

API workflow step reuse:

- shared query docs in `api/tests/e2e/shared/queries/`
- shared role actions in `api/tests/e2e/shared/steps/`

Merchant page interaction:

- page object in `e2e/pages/merchantPortal/`

Merchant hybrid orchestration:

- role action in `e2e/tests/merchantPortal/actions/`
- spec orchestration in `e2e/tests/merchantPortal/*.spec.js`

Merchant selector:

- `e2e/selectors/merchant.selectors.json`

Shared API workflow reuse:

- query docs in `api/tests/e2e/shared/queries/`
- step modules in `api/tests/e2e/shared/steps/`

Do not place merchant UI logic into `api/tests/e2e/shared/steps/`.

## Fragile Shared Areas

These are architecture-critical and should not be changed casually:

- `playwright.config.js`
- `api/globalConfig.api.js`
- `e2e/globalConfig.ui.js`
- `api/helpers/graphqlUtils.js`
- `api/helpers/auth.js`
- `api/helpers/apiReporting.js`
- `e2e/helpers/uiActions.js`
- `e2e/helpers/testFailure.js`
- `e2e/helpers/reporting/discordReporterClient.js`
- `e2e/selectors/merchant.selectors.json`
- `e2e/pages/merchantPortal/`
- `e2e/tests/merchantPortal/actions/`
- `api/tests/e2e/shared/steps/`
- `api/tests/e2e/shared/queries/`
- `scripts/run-all.sh`
- `.github/workflows/tests.yml`
- `helpers/discord/`
- `scripts/secrets/`
