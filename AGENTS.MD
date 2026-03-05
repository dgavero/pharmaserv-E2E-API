# Agents – API Testing Guidelines (v3)

---START OF QUICK GUIDE---

Use this when creating or updating API tests.

Required imports (pick the login helper for the role under test):

```js
import { test, expect } from '../../globalConfig.api.js';
import { safeGraphQL, bearer, getGQLError, loginAndGetTokens } from '../../helpers/testUtilsAPI.js';
// or adminLoginAndGetTokens / riderLoginAndGetTokens / pharmacistLoginAndGetTokens
```

Query file convention:

- Define GraphQL queries/mutations in a sibling `*.queries.js` or `*.orderingQueries.js` file.
- Import the query into the spec. Do not inline long GQL strings in the test.

Happy path flow:

1. Login for the required role.
2. Call `safeGraphQL` with `bearer(accessToken)` and a descriptive result name (e.g., `getOrderDetailRes`).
3. `expect(getOrderDetailRes.ok).toBe(true)` then assert the node.
4. Cleanup if the test creates data.

Negative auth flow:

1. Call `safeGraphQL` using `noAuth` or `invalidAuth` with a descriptive result name (e.g., `getOrderDetailNoAuthRes`).
2. `expect(getOrderDetailNoAuthRes.ok).toBe(false)`
3. If `!getOrderDetailNoAuthRes.httpOk`, assert transport status (usually 401).
4. Else use `getGQLError(getOrderDetailNoAuthRes)` for `message`, `code`, `classification`.
5. Keep positives and negatives in the same `test.describe()` block, separated by individual `test()` cases (preferred). Example: `api/tests/admin/riderManagement/rider.getDocumentToken.spec.js`.

Naming rules:

- Use descriptive names: `loginRes`, `submitOrderRes`, `noBearerRes`, `invalidAuthRes`.
- Use `Res` only as a suffix (e.g., `getOrderDetailRes`), never `res` alone.
- Avoid generic `res`, `result`, `x`.

---END QUICK GUIDE---

These are the **source of truth** for writing API tests in this repo. Keep tests short, readable, and consistent.

---

## 1) Project layout & runner

- **Directories**
  - API tests live in: `api/tests`
  - E2E tests live in: `e2e/tests`
- **Runner & fixtures**
  - Always import the custom API test harness:
    ```js
    import { test, expect } from '../../globalConfig.api.js';
    ```
  - This provides a fresh `api` client per test, **plus auth fixtures**:
    - `noAuth` → empty headers (simulate missing bearer)
    - `invalidAuth` → syntactically valid but invalid JWT (predictable **401**)
- **Base URL**
  - The `api` fixture reads `API_BASE_URL` from env and normalizes `localhost` → `127.0.0.1`.
  - This avoids the IPv6 `::1` resolution issue on some systems.

---

## 2) Canonical helpers (from `api/helpers/testUtilsAPI.js`)

- `safeGraphQL(api, { query, variables, headers })`
  - Normalizes results:
    - `ok`, `httpOk`, `httpStatus`
    - `body` on success
    - `errorCode`, `errorClass`, `errorMessage`, `errorPath` on resolver errors
- `bearer(token)` → `{ Authorization: 'Bearer <token>' }`
- `loginAndGetTokens(api, { username, password })`
- `adminLoginAndGetTokens(api, { username, password })`
- `riderLoginAndGetTokens(api, { username, password })`
- `pharmacistLoginAndGetTokens(api, { username, password })`
- `getGQLError(resOrBody)` → `{ message, code, classification, path }` from `errors[0]`
- Random data (from `helpers/globalTestUtils.js`):
  - `randomAlphanumeric(len)`, `randomNum(len)`, `randomLetters(len)`, `randomEmail(prefix, domain)`, `randomUsername(prefix)`

> ❌ Do **not** use legacy `uniqueSuffix()`; use the random helpers instead.

---

## 3) Naming & readability

- Use **descriptive consts** that say _what_ they hold:
  - ✅ `loginRes`, `meRes`, `registerRider`, `dupeRegRider`, `pagedPatientsRes`
  - ❌ `res`, `result`, `x`
- Use `Res` only as a suffix (e.g., `getOrderDetailRes`), never `res` alone.
- Keep GQL **document strings in a dedicated queries file** and **input builders outside** the test when reused.
  - Example: `api/tests/patient/ordering/patient.orderingQueries.js`

---

## 4) Positive pattern (happy path)

1. **Login** (if required) and build headers:
   ```js
   const { accessToken, raw: loginRes } = await loginAndGetTokens(api, creds);
   expect(loginRes.ok, loginRes.error || 'Login failed').toBe(true);
   ```
2. **Call** the API with `safeGraphQL`:
   ```js
   const meRes = await safeGraphQL(api, { query: ME_QUERY, headers: bearer(accessToken) });
   expect(meRes.ok, meRes.error || 'Query failed').toBe(true);
   ```
3. **Assert** using explicit data access (no auto-walk):
   ```js
   const node = meRes.body?.data?.patient?.me;
   expect(node, 'Missing data.patient.me').toBeTruthy();
   expect.soft(typeof node.id).toBe('string');
   ```

> Keep assertions minimal and meaningful; favor **soft** type checks after a hard success gate.

---

## 5) Negative pattern (unauthorized, not found, validation)

- **Always** call via `safeGraphQL`. Then branch:

  ```js
  const getOrderDetailNoAuthRes = await safeGraphQL(api, args);
  expect(getOrderDetailNoAuthRes.ok).toBe(false);

  // Transport-level rejection (gateway): no GraphQL errors[]
  if (!getOrderDetailNoAuthRes.httpOk) {
    expect(getOrderDetailNoAuthRes.httpStatus).toBe(401); // or other expected transport code
  } else {
    // Resolver-level error (HTTP 200 + errors[])
    const { message, code, classification, path } = getGQLError(getOrderDetailNoAuthRes);
    expect(message.toLowerCase()).toContain('unauthorized access'); // or 'not found', etc.
    expect.soft(code).toBe('401'); // or '404', '500' per API
    expect.soft(classification).toBe('UNAUTHORIZED'); // or 'NOT_FOUND', etc.
  }
  ```

- **Auth fixtures (use by default for negatives):**

  ```js
  // Missing bearer
  const getOrderDetailNoAuthRes = await safeGraphQL(api, { query: Q, variables: V, headers: noAuth });

  // Invalid bearer (syntactically valid → stable 401)
  const getOrderDetailInvalidAuthRes = await safeGraphQL(api, { query: Q, variables: V, headers: invalidAuth });
  ```

Keep positives and negatives in the same `test.describe()` block, separated by individual `test()` cases (preferred). Example: `api/tests/admin/riderManagement/rider.getDocumentToken.spec.js`.

> **Rule of thumb:** unauthorized may appear as **transport 401** _or_ GraphQL **200 + errors[]**. Handle both as above.

---

## 6) Reuse & builders

- Put random input builders **outside** the test when used by multiple cases:
  ```js
  function buildRider() {
    const tag = randomAlphanumeric(8);
    return {
      firstName: 'QA',
      lastName: 'Rider',
      email: `qa+${tag}@example.com`,
      username: `qa_${tag}`,
      password: 'Password123',
    };
  }
  ```
- Reuse the same builder for positive and negative cases (e.g., no bearer).

---

## 7) Logging & report attachments (optional)

Make debugging easy without polluting output:

```js
await test.info().attach('payload', { body: JSON.stringify(input, null, 2), contentType: 'application/json' });
await test.info().attach('node', { body: JSON.stringify(node, null, 2), contentType: 'application/json' });
```

---

## 8) Do / Don’t

**Do**

- Use `safeGraphQL`, `getGQLError`, `bearer`, and the auth fixtures.
- Use **descriptive** variable names.
- Keep tests short; prefer a few strong assertions over exhaustiveness.

**Don’t**

- Don’t use generic `res` names.
- Don’t rely on Playwright’s default config for API tests—use our custom `globalConfig.api.js`.
- Don’t expect GraphQL `errors[]` for every negative; handle transport 401 too.

---

## 9) Environment & config quick ref

- `API_BASE_URL` – consumed by `globalConfig.api.js` for the `api` fixture.
- `GRAPHQL_PATH` – optional override for GraphQL path (defaults to `/api/v1/pharmaserv/graphql` in `api/helpers/graphqlClient.js`).
- Credentials (examples; set in local env profiles and encrypted bundles):
  - `PATIENT_USER_USERNAME`, `PATIENT_USER_PASSWORD` (patient)
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD` (admin)
- CI runtime secret loading:
  - encrypted files: `secrets/secrets.dev.enc.json`, `secrets/secrets.qa.enc.json`, `secrets/secrets.prod.enc.json`
  - bootstrap secret only: `SOPS_AGE_KEY` (age private key content)
- For GraphQL pathing, your client (`graphqlClient.js`) uses the configured base; do not hardcode hostnames in tests.

---

## 10) Test structure reference (based on `patient.submitFindMyMeds.spec.js`)

Use this flow when creating or updating tests:

1. **Define the GraphQL query/mutation in a sibling queries file** (reusable).
2. **Login** with the appropriate role and build headers.
3. **Call** via `safeGraphQL`.
4. **Main assertion**: verify `ok`, then assert the node.
5. **Cleanup** if the test creates data (e.g., cancel/decline order).

Minimal skeleton:

```js
import { test, expect } from '../../../globalConfig.api.js';
import { SOME_QUERY } from './patient.orderingQueries.js';
import { safeGraphQL, bearer, loginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

test('...', async ({ api }) => {
  const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
    username: process.env.PATIENT_USER_USERNAME,
    password: process.env.PATIENT_USER_PASSWORD,
  });
  expect(loginRes.ok, loginRes.error || 'Login failed').toBe(true);

  const gql = await safeGraphQL(api, {
    query: SOME_QUERY,
    variables: {
      /* input */
    },
    headers: bearer(accessToken),
  });
  expect(gql.ok, gql.error || 'Request failed').toBe(true);

  const node = gql.body?.data?.patient?.order?.book;
  expect(node).toBeTruthy();
  expect.soft(typeof node.id).toBe('string');
});
```

---

## 11) Tiny snippets you can copy

- **Unauthorized (no bearer)**

  ```js
  const noBearerRes = await safeGraphQL(api, { query: Q, variables: V, headers: noAuth });
  expect(noBearerRes.ok).toBe(false);
  if (!noBearerRes.httpOk) expect(noBearerRes.httpStatus).toBe(401);
  else {
    const { code, classification, message } = getGQLError(noBearerRes);
    expect(message.toLowerCase()).toContain('unauthorized');
    expect.soft(code).toBe('401');
    expect.soft(classification).toBe('UNAUTHORIZED');
  }
  ```

- **Invalid token (transport 401)**

  ```js
  const invalidAuthRes = await safeGraphQL(api, { query: Q, variables: V, headers: invalidAuth });
  expect(invalidAuthRes.ok).toBe(false);
  expect(invalidAuthRes.httpOk).toBe(false);
  expect(invalidAuthRes.httpStatus).toBe(401);
  ```

- **Happy path skeleton**
  ```js
  const { accessToken, raw: loginRes } = await loginAndGetTokens(api, creds);
  expect(loginRes.ok, loginRes.error || 'Login failed').toBe(true);
  const getOrderDetailRes = await safeGraphQL(api, { query: Q, variables: V, headers: bearer(accessToken) });
  expect(getOrderDetailRes.ok, getOrderDetailRes.error || 'Query failed').toBe(true);
  ```

---

**That’s it. Keep it neat, keep it fast.**

---

## 12) Documentation Drift Check (Scoped)

Run this workflow only when the user explicitly asks for doc updates or repository sync.

Before editing any file:

1. Identify changed files using current branch diff vs `main`.
2. Review only documentation files in scope unless user expands it:
   - `README.md`
   - `USAGE.md`
   - `PROJECTVISIONS.md`
   - `CHANGELOG.md`
   - `AGENTS.MD` (only if standards/workflow changed)
3. Check for drift in:
   - runtime/config behavior (env vars, defaults, supported values, load order, URL resolution)
   - CI/run behavior (workflow inputs, modes, batches, rerun examples)
   - testing standards (only when helpers/fixtures/patterns changed)
4. Share a brief summary and get user confirmation before editing.

Preferred command pattern (strict and scoped):

```bash
git diff --name-only main...HEAD
git diff main...HEAD -- playwright.config.js api/globalConfig.api.js .env.example .github/workflows README.md USAGE.md PROJECTVISIONS.md CHANGELOG.md AGENTS.MD
rg -n "TEST_ENV|API_BASE_URL|BASE_URL_|GRAPHQL_PATH|REPORT_PUBLISH|run_mode|workflow_dispatch|safe|stress|tags"
git diff main...HEAD -- README.md USAGE.md PROJECTVISIONS.md CHANGELOG.md AGENTS.MD
```

---

## 13) Hybrid UI + API Workflow Pattern (Merchant Portal)

Use this section when building cross-role E2E workflows where **merchant actions are UI** and other actors remain **API-driven**.

### Goal

- Mirror API workflow behavior (e.g., PHARMA-334), but execute merchant/pharmacy operational steps in UI where available.
- Keep the test deterministic and aligned with real user paths in the merchant portal.

### Required workflow

1. API setup:
   - Login merchant via API and resolve correct branch ID for the account type.
   - Create patient order via API with `order.branchId = merchantBranchId`.
2. Merchant UI:
   - Login via UI, open `Orders > New`, search exact booking reference, open exact order card.
   - Perform merchant actions in UI (accept, QR, pricing, request payment/rider as applicable).
3. API continuation:
   - Continue patient/admin/pharmacist/rider actions through shared API steps.
4. Merchant terminal verification (mandatory for full-flow tests):
   - Use page-object centralized verification only.
   - `COMPLETED`: verify in details and `Orders > Completed`.
   - `CANCELLED`: verify in details and `Orders > Cancelled`.
   - Refresh once if not visible, then fail.

### Merchant UI-only rule (hybrid)

- Merchant operational actions must be UI-only in hybrid tests; do not move merchant actions back to API for convenience.
- For attachment-only DeliverX flows, keep medicine-item creation in merchant UI (`Add Items` modal), then continue with UI quote send.
- API should remain for non-merchant actors (patient/admin/rider) unless a merchant UI action truly does not exist.

### Required file structure

- Keep hybrid API orchestration in role-scoped modules under `e2e/tests/merchantPortal/actions/`:
  - `patientActions.js`
  - `adminActions.js`
  - `riderActions.js`
- Keep reusable hybrid input builders in `generic.orderData.js`.
- Keep reusable GraphQL docs in `merchantPortal.queries.js` (no long inline query strings in specs).
- Keep specs orchestration-only: UI page-object calls + role action calls, no long inline API chains.

### Required spec conventions

- Add a short flow summary comment beside each hybrid test’s tag block (`E2E-5+`).
- Keep existing per-action comments; summary is additive.
- Keep summary synchronized with actual test flow after refactors.

### Required Orders-page conventions

- Keep search/open/status logic in `merchantOrders.page.js`; avoid duplicating logic in specs.
- Open by exact booking reference and fail if not found (no first-order fallback).
- Prefer stable direct navigation (`/orders/new`) when dashboard popup/CTA behavior is flaky in automation.
- Use these methods for flow clarity:
  - `openNewOrderByBookingRef(bookingRef)`
  - `openOngoingOrderByBookingRef(bookingRef)`
  - `hasCompletedOrderByBookingRef(bookingRef)`
  - `hasCancelledOrderByBookingRef(bookingRef)`
  - `verifyOrderCompletedInDetailsAndCompletedTab(bookingRef)`
  - `verifyOrderCancelledInDetailsAndCancelledTab(bookingRef)`
- Keep selector naming consistent:
  - template: `Orders.OrderCardBookingReferenceIDTemplate`
  - resolved value: `orderCardBookingReferenceID`

### Required stability rules

- Use safe helpers (`safeClick`, `safeClearText`, `safeInput`, `safePressEnter`, `safeWaitForPageLoad`) and `markFailed(...)` on false.
- Use `safeWaitForPageLoad` as readiness source-of-truth.
- Prefer built-in safe wait helpers for standard readiness checks (visible/attached/hidden) before actions.
- Use probe-based bounded retries (`isVisible`, `inputValue`, `count` with capped attempts) only for compound/stateful checks where a single wait is not enough (example: booking-ref search retention + exact order card visibility + no-results state).
- Default to helper built-in timeout (`Timeouts.standard`) for safe helper calls.
- Only pass explicit timeout overrides when a step is known to be slower than standard and the reason is clear.
- Use timeout constants from `e2e/Timeouts.js` only when overriding; do not hardcode ad-hoc waits.
- Keep utility behavior boolean-return based; avoid throw-driven control flow in safe helpers.
- In Add Item modal flows, clear/replace numeric defaults explicitly (select-all then type) to avoid leading `0` appends.

### Non-negotiable safeguards

- Derive selectors from actual DOM; do not assume.
- If UI flow breaks unexpectedly (example: redirected to `/login`), fail and report; do not mask with workaround flow changes.
- Do not diverge from approved workflow/API reference just to force passing tests.
- Always bind order creation to the active merchant branch.
- When pricing in UI, update all visible editable items.
- Poll for quote readiness before patient accept-quote steps.
- For add-item search flows that require deterministic selection, encode the agreed behavior in page-object methods (example: select second result for the current Add Item modal behavior).
