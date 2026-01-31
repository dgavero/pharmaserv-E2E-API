# Agents – API Testing Guidelines (v2)

These are the **source of truth** for writing API tests in this repo. Keep tests short, readable, and consistent.

---

## 1) Project layout & runner

- **Directories**
  - API tests live in: `/root/api/tests`
  - E2E tests live in: `/root/e2e/tests`
- **Runner & fixtures**
  - Always import the custom API test harness:
    ```js
    import { test, expect } from '../../globalConfig.api.js';
    ```
  - This provides a fresh `api` client per test, **plus auth fixtures**:
    - `noAuth` → empty headers (simulate _missing bearer_)
    - `invalidAuth` → syntactically valid but invalid JWT (predictable **401**)
- **Base URL**
  - The `api` fixture reads `API_BASE_URL` from env and normalizes `localhost` → `127.0.0.1`.

---

## 2) Canonical helpers (from `api/helpers/testUtilsAPI.js`)

- `safeGraphQL(api, { query, variables, headers })`  
  Wraps a GraphQL call and normalizes the result:
  - `ok` (boolean), `httpOk` (boolean), `httpStatus` (number)
  - `body` (parsed JSON) on success
  - Structured error fields on resolver errors: `errorCode`, `errorClass`, `errorMessage`
- `bearer(token)` → `{ Authorization: 'Bearer <token>' }`
- `loginAndGetTokens(api, { username, password })`
- `adminLoginAndGetTokens(api, { username, password })`
- `getGQLError(resOrBody)` → `{ message, code, classification, path }` from `errors[0]`
- Random data (from `helpers/globalTestUtils.js`): `randomAlphanumeric(len)`, `randomNum(len)`, `randomLetters(len)`, `randomEmail(prefix, domain)`, `randomUsername(prefix)`

> ❌ Do **not** use legacy `uniqueSuffix()`; use the random helpers instead.

---

## 3) Naming & readability

- Use **descriptive consts** that say _what_ they hold:
  - ✅ `loginRes`, `meRes`, `registerRider`, `dupeRegRider`, `pagedPatientsRes`
  - ❌ `res`, `result`, `x`
- Keep GQL **document strings at test level** and **input builders outside** the test when reused.

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
  const res = await safeGraphQL(api, args);
  expect(res.ok).toBe(false);

  // Transport-level rejection (gateway): no GraphQL errors[]
  if (!res.httpOk) {
    expect(res.httpStatus).toBe(401); // or other expected transport code
  } else {
    // Resolver-level error (HTTP 200 + errors[])
    const { message, code, classification, path } = getGQLError(res);
    expect(message.toLowerCase()).toContain('unauthorized access'); // or 'not found', etc.
    expect.soft(code).toBe('401'); // or '404', '500' per API
    expect.soft(classification).toBe('UNAUTHORIZED'); // or 'NOT_FOUND', etc.
  }
  ```

- **Auth fixtures (use by default for negatives):**

  ```js
  // Missing bearer
  const resNoBearer = await safeGraphQL(api, { query: Q, variables: V, headers: noAuth });

  // Invalid bearer (syntactically valid → stable 401)
  const resBadBearer = await safeGraphQL(api, { query: Q, variables: V, headers: invalidAuth });
  ```

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
- Credentials (examples; set in `.env` or CI secrets):
  - `PATIENT_USER_USERNAME`, `PATIENT_USER_PASSWORD` (patient)
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD` (admin)
- For GraphQL pathing, your client (`graphqlClient.js`) uses the configured base; do not hardcode hostnames in tests.

---

## 10) Tiny snippets you can copy

- **Unauthorized (no bearer)**

  ```js
  const res = await safeGraphQL(api, { query: Q, variables: V, headers: noAuth });
  expect(res.ok).toBe(false);
  if (!res.httpOk) expect(res.httpStatus).toBe(401);
  else {
    const { code, classification, message } = getGQLError(res);
    expect(message.toLowerCase()).toContain('unauthorized');
    expect.soft(code).toBe('401');
    expect.soft(classification).toBe('UNAUTHORIZED');
  }
  ```

- **Invalid token (transport 401)**

  ```js
  const res = await safeGraphQL(api, { query: Q, variables: V, headers: invalidAuth });
  expect(res.ok).toBe(false);
  expect(res.httpOk).toBe(false);
  expect(res.httpStatus).toBe(401);
  ```

- **Happy path skeleton**
  ```js
  const { accessToken, raw: loginRes } = await loginAndGetTokens(api, creds);
  expect(loginRes.ok, loginRes.error || 'Login failed').toBe(true);
  const gql = await safeGraphQL(api, { query: Q, variables: V, headers: bearer(accessToken) });
  expect(gql.ok, gql.error || 'Query failed').toBe(true);
  const node = gql.body?.data?.foo?.bar;
  expect(node).toBeTruthy();
  ```

---

**That’s it. Keep it neat, keep it fast.**
