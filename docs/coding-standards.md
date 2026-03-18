# Coding Standards

## Purpose

These rules document the current dominant conventions in this repository. They are repo-specific. Follow the local pattern in the touched area if the code is older, but prefer the patterns below when adding new code.

Use this file for code-shape rules. Use `docs/change-workflow.md` for process.

## Naming

### Dominant API Naming Pattern

- Use descriptive result variables with `Res` suffix.
- Good:
  - `loginRes`
  - `getOrderRes`
  - `noBearerRes`
  - `invalidAuthRes`
- Avoid:
  - `res`
  - `result`
  - `x`

### General Naming

- Name builders after what they create: `buildHybridOrderInput`
- Name page object methods after business behavior: `openNewOrderByBookingRef`
- Name action wrappers after actor + behavior: `confirmPaymentAsAdminAction`

## File Placement

### API Feature Tests

- Specs go under `api/tests/<role>/<feature>/`
- GraphQL docs go in sibling query files such as:
  - `*.queries.js`
  - `*.orderingQueries.js`

### API Workflow Reuse

- Shared API workflow queries go under `api/tests/e2e/shared/queries/`
- Shared workflow step modules go under `api/tests/e2e/shared/steps/`

### UI / Hybrid Merchant

- Selectors in `e2e/selectors/merchant.selectors.json`
- Page objects in `e2e/pages/merchantPortal/`
- Role orchestration helpers in `e2e/tests/merchantPortal/actions/`
- Shared hybrid order builders in `e2e/tests/merchantPortal/generic.orderData.js`

## Spec Structure

### Preferred API Spec Structure

1. Import custom harness from `api/globalConfig.api.js`
2. Import GraphQL doc from sibling query file
3. Login for the role under test if needed
4. Call `safeGraphQL(...)`
5. Assert `ok` first
6. Assert the explicit node
7. Cleanup if data was created

Example shape:

```js
const creds = getPatientCredentials('default');
const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, creds);
expect(loginRes.ok, loginRes.error || 'Login failed').toBe(true);

const getOrderRes = await safeGraphQL(api, {
  query: GET_ORDER_QUERY,
  variables: { orderId },
  headers: bearer(accessToken),
});
expect(getOrderRes.ok, getOrderRes.error || 'Get order failed').toBe(true);

const node = getOrderRes.body?.data?.patient?.order?.detail;
expect(node, 'Missing data.patient.order.detail').toBeTruthy();
```

### Preferred Negative Auth Structure

- Always call through `safeGraphQL`
- Handle both:
  - transport-level rejection (`httpOk === false`)
  - resolver-level GraphQL error (`httpOk === true`, `errors[]`)

### Preferred Hybrid Spec Structure

- Keep specs orchestration-only
- Put merchant operations in page objects
- Put patient/admin/rider API transitions in action modules
- Keep final merchant status verification in `merchantOrders.page.js`

## Query File Usage

Preferred pattern:

- keep long GraphQL operations in sibling query files
- import them into specs or action modules

Current mixed reality:

- newer and cleaner areas follow this well
- some older specs still inline GraphQL strings

Rule:

- do not add new long inline GraphQL strings to specs
- if an older spec already inlines a short query and the requested change is tiny, preserve the local style rather than broadening the diff
- if a sibling query file already exists, add the new operation there

## Page Objects and Actions

### Page Object Rules

- Page objects own merchant UI selectors and action sequences.
- Specs should not duplicate merchant search/open/status logic that already exists in:
  - `merchantOrders.page.js`
  - `merchantOrderDetails.page.js`
  - `merchantPortalLogin.page.js`

### Action Module Rules

- Action modules own non-merchant role orchestration for hybrid tests.
- Keep them role-scoped:
  - `patientActions.js`
  - `adminActions.js`
  - `riderActions.js`

### What Not To Do

- Do not move merchant operational actions into API helpers for convenience.
- Do not put long cross-role chains directly into specs when an action module already exists.
- Do not duplicate booking-reference search/open/status logic outside `merchantOrders.page.js`.

## Selector Rules

- Merchant selectors belong in `e2e/selectors/merchant.selectors.json`.
- Access them through `loadSelectors()` and `getSelector()`.
- Use dynamic selector templates where needed instead of spec-local string duplication.
- Prefer extending the shared selector map over hardcoding a selector in multiple page objects.
- Do not guess selectors from assumptions or naming patterns. Inspect the actual DOM first.
- If a task adds or changes selectors, run the narrowest relevant UI path when feasible and confirm the selector against the rendered page.
- Preferred selector stability order:
  - existing stable test id or data attribute
  - stable role/name combination
  - stable structural selector
  - text-sensitive XPath only when no stronger signal exists in the current DOM

Current selector reality:

- many selectors are XPath-heavy and text-sensitive
- do not rewrite them opportunistically unless the user asked or they block the requested change
- when adding a selector, place it in the shared JSON if it is used by a page object or more than one test path

## Helper Reuse Rules

Prefer existing helpers before creating new ones.

API:

- `safeGraphQL`
- `bearer`
- `getGQLError`
- role login helpers
- shared workflow helpers under `api/tests/e2e/shared/steps/` when working in API workflows

UI:

- `safeClick`
- `safeInput`
- `safeClearText`
- `safeUploadFile`
- `safeWaitForElementVisible`
- `safeWaitForElementHidden`
- `safeWaitForPageLoad`
- `markFailed`

Randomized test data:

- `randomAlphanumeric`
- `randomNum`
- `randomLetters`
- `randomEmail`
- `randomUsername`

Credential resolution:

- keep role-specific login queries in `api/helpers/auth.js`
- resolve named env-backed accounts through:
  - `api/helpers/roleCredentials.js`
  - `e2e/helpers/merchantCredentials.js`
- prefer explicit account keys such as:
  - `getPatientCredentials('default')`
  - `getAdminCredentials('default')`
  - `getRiderCredentials('default')`
  - `getPharmacistCredentials('reg01')`
  - `getMerchantPortalCredentials('pse')`
- do not read role username/password env vars directly inside shared workflow steps

## Assertion Rules

### API

- Assert success/failure gate first.
- Then assert the exact response node.
- Use `expect.soft(...)` for secondary field/type checks after the main gate.
- Prefer explicit response paths over vague truthiness where the path matters.
- Keep negative auth assertions precise enough to distinguish:
  - transport 401/403/404 style failures
  - GraphQL resolver errors with `errors[]`

### UI / Hybrid

- Use `markFailed(...)` with a precise reason when a safe helper returns false.
- Keep failure messages business-readable.
- Use page-object verification methods for final merchant order state where those methods exist.

## Timeout and Wait Rules

- Use timeout constants from `e2e/Timeouts.js`.
- Prefer helper-based waits over raw `page.waitForTimeout(...)`.
- Use bounded retries only for stateful UI checks that cannot be solved by one visibility/hidden wait.
- If you must add a poll loop, keep it short, bounded, and tied to a specific state signal such as retained search text, card visibility, or loading-state disappearance.

Preferred pattern:

```js
if (!(await safeWaitForElementVisible(page, selector, { timeout: Timeouts.short }))) {
  markFailed('Expected selector to be visible');
}
```

## No-Hard-Wait Guidance

Avoid introducing:

- `page.waitForTimeout(...)`
- `delay(...)` as a first choice
- raw `setTimeout` sleeps in test logic

Current mixed reality:

- older or fragile flows still contain some hard waits and short polling loops
- do not copy those into new code unless there is no stable signal and the reason is documented in the surrounding code

## Hybrid Merchant Rules

For files under `e2e/tests/merchantPortal/` and `e2e/pages/merchantPortal/`:

- Merchant operational actions are UI-only.
- Patient, admin, and rider transitions may remain API-driven through action modules or shared API workflow steps.
- Bind created orders to the active merchant branch used by the current merchant account.
- Use exact booking reference search. No first-card fallback.
- Completed and cancelled checks belong in page-object verification methods, not in spec-local locator assertions.

## Current Dominant Patterns vs Older Styles

Preferred modern repo pattern:

- sibling query files
- `safeGraphQL`
- descriptive `*Res` names
- explicit node assertions
- page objects + actions for merchant workflows
- safe UI helpers + `markFailed`

Older style still present in parts of the repo:

- inline GraphQL in specs
- broader auth-message matching
- more direct spec-local logic
- occasional raw waits and env-coupled fixed IDs

When editing:

- preserve working local structure
- prefer not to spread older patterns into new code
