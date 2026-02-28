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
- Credentials (examples; set in `.env` or CI secrets):
  - `PATIENT_USER_USERNAME`, `PATIENT_USER_PASSWORD` (patient)
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD` (admin)
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

### Approved structure (recommended)

1. API setup:
   - Login as merchant via API and fetch merchant `myBranch.id`.
   - Create patient order via API and force `order.branchId = merchantBranchId`.
2. Merchant UI:
   - Login via UI.
   - Go to `Orders > New`, search by booking reference (tracking code), open exact target order.
   - Perform merchant UI actions only (for DeliverX: `Accept -> Upload QR -> Update all item prices -> Request Payment`).
3. API continuation:
   - Patient accept quote + pay.
   - Admin confirm payment + assign rider.
   - Pharmacy prepare + set for pickup (API if merchant UI does not expose those actions).
   - Rider complete delivery + patient rate rider.
4. Merchant final verification (UI):
   - Verify order appears in `Completed`.
   - If not found, refresh once and re-check.
   - Fail test if still not completed.

### Selector and navigation rules

**Do**

- Derive selectors from actual UI DOM (run/inspect first), then codify in `e2e/selectors/*.selectors.json`.
- Open orders by **exact booking reference** (`trackingCode`) and fail if not found.
- Keep selectors generic/reusable when valid across delivery types.

**Don’t**

- Don’t guess selectors from assumptions.
- Don’t use fallback behavior that opens the first order card if target booking ref is missing.
- Don’t bypass the user path with direct route jumps if card navigation already opens the same details page.

### Wait and stability rules

**Do**

- Use safe helpers that return boolean (`safeClick`, `safeInput`, `safeWaitForPageLoad`), then `markFailed(...)` on false.
- Use `safeWaitForPageLoad` as source-of-truth for page readiness:
  - wait for load state,
  - wait for loaders/skeletons to clear,
  - optional URL/selector readiness checks.
- Use timeout constants from `e2e/Timeouts.js` (`short`, `standard`, `long`, `extraLong`) and override explicitly only when required.

**Don’t**

- Don’t hardcode ad-hoc waits/timeouts in tests (`waitForTimeout(...)`) for readiness.
- Don’t add throw-based runtime control flow in safe utility helpers; keep them boolean-return style.

### Query/document placement

**Do**

- Place reusable GraphQL docs in sibling query files (example: `merchantPortal.queries.js`).
- Import queries into spec/page-step code; avoid inline long GraphQL strings in test files.

### Data consistency safeguards

**Do**

- Always bind order creation to merchant’s actual branch (`myBranch.id`) to ensure order visibility in merchant queue.
- When pricing in UI, update **all visible editable items**, not only a fixed count from test data builders.
- Poll for quote readiness before patient accepts quote (eventual consistency between UI action and API state).
