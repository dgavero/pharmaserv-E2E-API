# AI Agent Guide

## Mission

Maintain and extend this Playwright-based API + UI automation repository without breaking shared infrastructure, hybrid merchant workflows, environment-specific behavior, or execution safety.

Default bias:

- Make the smallest change that solves the request.
- Reuse existing helpers, fixtures, page objects, actions, and query files.
- Do not refactor unrelated code while implementing a focused change.

## AI Change Contract

Before editing code, every coding task must follow this contract:

1. Summarize the request in repo terms.
2. Identify the exact files or folders likely to be impacted.
3. Identify the main risks:
   - shared helper/config impact
   - env or fixed-ID coupling
   - hybrid workflow or selector risk
4. State whether approval is required based on the approval-required areas in this file.
5. Propose the smallest viable change plan.
6. Implement only that plan.
7. Self-review the result against `docs/risk-checklist.md` and `docs/change-workflow.md` before finishing.

If any step cannot be completed confidently, stop and resolve that gap before editing.

## Repository Facts

- Framework: Playwright
- Language: JavaScript
- Main projects:
  - `api/` for API tests
  - `e2e/` for UI and hybrid merchant tests
- Shared execution config: `playwright.config.js`
- Shared API harness: `api/globalConfig.api.js`
- Shared UI harness: `e2e/globalConfig.ui.js`

## Non-Negotiable Safeguards

- Minimize scope. Solve the requested problem only.
- Do not modify shared config, shared harnesses, shared helpers, workflow orchestration, or CI/reporting files unless the request explicitly targets them.
- Do not move merchant operational steps from UI back to API in hybrid tests.
- Do not bypass the merchant page objects for merchant order search, open, pricing, quote, or status verification if the behavior already exists there.
- Do not assume or invent selectors. If selector work is required, inspect the current DOM first and choose the most stable signal actually exposed by the UI.
- Do not introduce new env vars, credentials, fixed IDs, or branch assumptions unless the request requires them and the change is documented.
- Do not add `page.waitForTimeout(...)`, `delay(...)`, or raw sleep-based waits when an existing safe wait helper or bounded probe can be used.
- Do not widen the change into opportunistic cleanup or refactoring.
- Do not change safe/stress execution behavior, Discord reporting, or secrets loading without explicit approval.

## Approval Required Areas

Treat these files and areas as approval-required:

- `playwright.config.js`
- `globalSetup.js`
- `api/globalConfig.api.js`
- `e2e/globalConfig.ui.js`
- `api/helpers/graphqlUtils.js`
- `api/helpers/auth.js`
- `api/helpers/apiReporting.js`
- `api/helpers/graphqlClient.js`
- `e2e/helpers/uiActions.js`
- `e2e/helpers/testFailure.js`
- `e2e/helpers/reporting/`
- `e2e/helpers/selectors.js`
- `e2e/selectors/merchant.selectors.json`
- `e2e/pages/merchantPortal/`
- `e2e/tests/merchantPortal/actions/`
- `scripts/run-all.sh`
- `.github/workflows/tests.yml`
- `helpers/discord/`
- `scripts/secrets/`
- `.env.example`
- `.env.dev`
- `.env.qa`
- `.env.prod`
- `secrets/`
- `api/tests/e2e/shared/steps/`
- `api/tests/e2e/shared/queries/`
- `e2e/tests/merchantPortal/merchantPortal.queries.js`

If the request touches one of these areas, stop and treat the change as high-risk. Explain the impact before editing.

Exception:

- A direct user request to create, fix, or investigate a specific test counts as approval for the minimal changes required in that test path, even when that path includes merchant page objects, selector JSON, or hybrid action modules.
- This exception does not approve unrelated shared infrastructure changes such as runner config, shared harness behavior, reporting, CI, secrets loading, or broad helper refactors.

## Required Reading Order Before Edits

Always read in this order:

1. `AGENTS.md`
2. `docs/architecture.md`
3. `docs/test-layer-map.md`
4. `docs/coding-standards.md`
5. `docs/change-workflow.md`
6. `docs/risk-checklist.md`

Then read the local code closest to the requested change:

- target spec
- sibling query file
- nearest helper or action module
- relevant page object
- relevant selector JSON

## Mandatory Pre-Change Workflow

Use `docs/change-workflow.md`. Do not edit before completing that workflow.

## Implementation Rules

### General

- Preserve the current folder structure.
- Prefer additive changes over rewrites.
- Keep changes local to the affected layer.
- Reuse existing timeout constants and helpers.
- Keep docs and code aligned when the user asks for documentation changes.

### API Tests

- Import from `api/globalConfig.api.js`.
- Use `safeGraphQL`, `bearer`, `getGQLError`, and the role-specific login helper.
- New GraphQL operations belong in sibling `*.queries.js` or `*.orderingQueries.js` files. Do not add new long inline GraphQL strings to specs.
- Use descriptive variable names ending in `Res`.
- Keep positive and negative auth cases in the same `test.describe()` unless the local file structure already forces otherwise.
- Assert success or failure first, then inspect the explicit node.
- For unauthorized negatives, handle both transport-level failure and GraphQL `errors[]` when the resolver can return either.

### UI and Hybrid Merchant Tests

- Import from `e2e/globalConfig.ui.js`.
- Keep specs orchestration-only when page objects or action modules already exist.
- Put merchant operational behavior in page objects under `e2e/pages/merchantPortal/`.
- Put cross-role API orchestration in `e2e/tests/merchantPortal/actions/`.
- Use selector JSON via `loadSelectors()` and `getSelector()`.
- Use `safeClick`, `safeInput`, `safeWaitForPageLoad`, `safeWaitForElementVisible`, and `markFailed(...)`.
- When adding or changing selectors, inspect the rendered UI first and verify the selector against the current DOM before finalizing it.
- Keep merchant order creation bound to the active merchant branch used by the test account.
- Keep final merchant verification in page-object methods that check both order details and the correct Orders tab.
- Preserve current merchant flow ordering: patient setup -> merchant UI actions -> downstream API actors -> merchant terminal verification.

## Self-Review Requirements

Before finishing:

1. Confirm the change is in the correct test layer.
2. Confirm no approval-required file was edited accidentally.
3. Confirm no new hard wait was introduced without justification.
4. Confirm no selector was duplicated outside selector JSON/page objects.
5. Confirm env-variable usage follows existing naming and resolution.
6. Confirm branch binding, schedule-sensitive logic, and cross-role order were preserved where applicable.
7. Confirm assertions are explicit and meaningful.
8. Confirm the diff does not include unrelated cleanup.

## Scope Control

Agents must minimize scope.

- Do not rename files for style alone.
- Do not normalize old code unless it blocks the requested change.
- Do not migrate legacy specs to newer conventions opportunistically.
- Do not edit docs outside the requested topic unless they are directly made inaccurate by the change.

## Preferred Pattern vs Legacy Pattern

This repository has mixed conventions. Follow the dominant local pattern in the touched area, but prefer these when adding new code:

- sibling query files over inline GraphQL
- descriptive `*Res` names over generic `res`
- safe helper usage over raw Playwright actions in merchant flows
- page object and action reuse over spec-local workflow code
- bounded retries and explicit waits over fixed sleeps

## Hybrid Merchant Hard Rules

For `e2e/tests/merchantPortal/`:

- Merchant actions stay in UI unless the UI has no equivalent action.
- Specs must open orders by exact booking reference, not by first visible order.
- Final status checks must use the existing page-object verification methods, not spec-local assertions.
- Do not change PSE vs regular merchant branching behavior unless the request is specifically about merchant account routing.
- Do not remove existing flow summary comments beside the tag block; keep them aligned with the real flow.
