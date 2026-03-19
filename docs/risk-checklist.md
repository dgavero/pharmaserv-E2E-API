# Risk Checklist

Use this checklist before and after implementing risky changes.

## Before Implementation

### Selectors

- Does the change touch `e2e/selectors/merchant.selectors.json`?
- Is the selector already defined elsewhere?
- Is the selector text-sensitive or XPath-heavy?
- Can the existing page object absorb the change without spreading selector logic into specs?
- Did I inspect the rendered DOM instead of assuming the selector?
- Did I choose the most stable signal currently available in the UI?

### Waits and Retries

- Am I about to add `page.waitForTimeout(...)` or `delay(...)`?
- Is there already a stable UI readiness signal?
- Can `safeWaitForElementVisible`, `safeWaitForElementHidden`, or `safeWaitForPageLoad` handle this instead?
- If I need polling, is it bounded and tied to a real state change?
- If there is retry/backoff logic, is it part of explicit bounded retry behavior rather than a fixed workflow sleep?

### Shared Helpers

- Does this change modify:
  - `api/helpers/graphqlUtils.js`
  - `api/helpers/auth.js`
  - `api/helpers/apiReporting.js`
  - `api/helpers/graphqlClient.js`
  - `e2e/helpers/uiActions.js`
  - `e2e/helpers/testFailure.js`
  - `e2e/helpers/reporting/`
  - `e2e/helpers/selectors.js`
  - `api/tests/e2e/shared/steps/`
  - `api/tests/e2e/shared/queries/`
  - `e2e/tests/merchantPortal/actions/`
- If yes, was that explicitly requested?
- What tests or layers could this impact indirectly?

### Environment Variables

- Am I introducing a new env var?
- Am I changing the meaning of an existing env var?
- Does the change rely on `TEST_ENV`, branch IDs, reusable order IDs, or role credentials?
- Does the new logic work for `DEV`, `QA`, and `PROD`, or is it intentionally scoped?
- Am I reintroducing direct env-ID reads in specs where account/profile helpers already expose the same data?

### Fixed IDs and Reusable Records

- Does the change rely on:
  - static medicine IDs
  - branch IDs
  - rider IDs
  - reusable order IDs
  - hardcoded account assumptions
- Can a builder or existing env-driven mapping be reused instead?

### Credentials and Secrets

- Does the change assume credentials that are not documented in `.env.example`?
- Does the change affect secret loading or CI decryption?
- Does it alter what the workflow expects from `secrets/`?

### Merchant Branch Logic

- Does the flow create orders with the correct merchant branch ID?
- Is the branch ID coming from the active merchant account/context instead of a hidden env fallback?
- Is regular vs PSE merchant behavior preserved?
- Am I changing approved merchant branch assignment behavior?
- Am I accidentally switching from branch lookup to a hardcoded branch ID?

### Schedule-Sensitive Tests

- Does the change touch scheduled delivery or rider availability windows?
- Is there existing Manila-time logic in the flow that must stay consistent?
- Could the change make the test pass/fail only at certain times?
- Am I preserving existing skip or out-of-schedule handling?

### Cross-Role Workflows

- Does the change alter the order of patient/admin/pharmacist/rider transitions?
- Does it move merchant actions out of UI?
- Does it bypass final merchant verification in details plus completed/cancelled tabs?
- Does it remove or weaken exact booking-reference search behavior?

### CI and Reporting

- Does the change touch:
  - `playwright.config.js`
  - `globalSetup.js`
  - `helpers/discord/`
  - `scripts/run-all.sh`
  - `.github/workflows/tests.yml`
  - `scripts/secrets/`
- If yes, is the blast radius understood and approved?

## After Implementation

### Placement

- Is the code in the correct layer?
- Did I add logic to a spec that should live in a helper, action module, or page object instead?

### Scope

- Did I change only what was required?
- Did I accidentally refactor unrelated code?

### Selectors

- Did I avoid duplicating selector logic?
- If a selector changed, did I check all page object call sites conceptually?
- If I changed or added a selector, did I confirm it against the rendered DOM or the narrowest runnable UI flow?

### Waits

- Did I avoid introducing new hard waits?
- If I had to add a wait, is the reason obvious in code?

### Assertions

- Are assertions specific enough to catch the intended behavior?
- Did I preserve the `ok` first, node second pattern for API work?

### Environment Safety

- Did I preserve current env resolution behavior?
- Did I avoid silent coupling to one environment unless the file already behaves that way?

### Workflow Safety

- For hybrid tests, is merchant behavior still UI-driven?
- Are patient/admin/rider transitions still aligned with the existing flow?
- Is final status verification still done in the page object?
- Is exact booking-reference search/open logic still preserved?
- Is merchant branch binding still preserved?

### Shared Infrastructure

- Did I avoid unintended changes to config, harnesses, reporting, or secret loading?

## Fragile Areas to Double-Check

- `playwright.config.js`
- `api/globalConfig.api.js`
- `e2e/globalConfig.ui.js`
- `api/helpers/graphqlUtils.js`
- `api/helpers/auth.js`
- `api/helpers/apiReporting.js`
- `e2e/helpers/uiActions.js`
- `e2e/helpers/testFailure.js`
- `e2e/helpers/reporting/`
- `e2e/selectors/merchant.selectors.json`
- `e2e/pages/merchantPortal/`
- `e2e/tests/merchantPortal/actions/`
- `api/tests/e2e/shared/steps/`
- `api/tests/e2e/shared/queries/`
- `scripts/run-all.sh`
- `.github/workflows/tests.yml`
- `helpers/discord/`
- `scripts/secrets/`
