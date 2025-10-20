# AGENTS.md — API Test Authoring Guide (Updated)

This guide describes how we write **GraphQL API tests** in this repo: helpers to use, naming, tagging, structure, and assertion style.

---

## 1) Golden conventions (TL;DR)

- **Capitalize test titles** so they look clean in Discord & HTML reports.  
  Example: `test('Should Login And Return Tokens @api @patient @positive', …)`
- **Default tags** for API tests:
  - `@api` (always)
  - Domain tag (e.g., `@patient`, `@admin`, `@rider`)
  - Polarity: **`@positive`** or **`@negative`**
- **Group related flows in one file** with a `test.describe(...)` suite.  
  Example: `login.spec.js` contains both **success** and **failure** cases.
- Prefer **hard** checks for the primary contract, and **soft** checks for details:
  - Hard = must pass (e.g., request succeeded / failed as intended)
  - Soft = nice-to-have details (field values, regex shapes)
- For GraphQL, use our **`safeGraphQL`** wrapper and **`getGQLError`** extractor for negative cases.
- When asserting auth failures:
  - If **transport** block (e.g., gateway returns **401**): assert `httpStatus === 401`
  - If **GraphQL** signals (200 + `errors[]`): assert `code`/`classification` (e.g., `401` / `UNAUTHORIZED`)
- Use **`test.step()`** to name logical phases (Login → Query → Validate). It improves report readability with no extra noise in Discord.
- **Use definitive, descriptive const names.** See §5 _Naming & readability_ for examples.

---

## 2) Helpers you should know

### `safeGraphQL(api, args)`

- Returns a single object with consistent fields:

  ```ts
  {
    ok: boolean,
    body: any,                  // parsed JSON (or null)
    error: string | null,       // compact human message
    httpStatus: number,         // transport code (200 on success)
    httpOk: boolean,            // transport ok flag
    errorCode: string | null,   // GraphQL errors[0].extensions.code (e.g., "409", "401")
    errorClass: string | null,  // GraphQL errors[0].extensions.classification (e.g., "CONFLICT", "UNAUTHORIZED")
    errorMessage: string | null,// GraphQL errors[0].message
    errorPath: string | null    // e.g., "patient.auth.login"
  }
  ```

- **Hard success gate** (use a descriptive const, not `res`):

  ```js
  expect(loginRes.ok, loginRes.error || 'GraphQL call failed').toBe(true);
  ```

- **Hard negative gate** (auth failure via transport):
  ```js
  expect(meAttempt.ok).toBe(false);
  expect(meAttempt.httpStatus).toBe(401);
  ```

### `getGQLError(res)`

- Unified extractor for resolver errors (HTTP 200 + `errors[]`). Accepts the `safeGraphQL` envelope and returns:
  ```ts
  { message: string, code: string, classification: string, path: string }
  ```
- Use it in negatives to keep assertions tidy and consistent.

### `loginAndGetTokens(api, { username, password })` and `adminLoginAndGetTokens(...)`

- Logs in via GraphQL and returns:
  ```ts
  { accessToken: string|null, refreshToken: string|null, raw: SafeGraphQLResult }
  ```

### `bearer(token)`

- Convenience to build an Authorization header:
  ```js
  headers: bearer(accessToken); // → { Authorization: `Bearer ${token}` }
  ```

---

## 3) Test structure & style

### A) Group related tests

```js
test.describe('GraphQL: Patient Login', () => {
  test('Should Login And Return Tokens @api @patient @positive', async ({ api }) => {
    // happy path
  });

  test('Should Reject Invalid Credentials @api @patient @negative', async ({ api }) => {
    // negative: invalid password/username
  });
});
```

### B) Steps for readable reports

```js
await test.step('Login', async () => {
  expect(loginRes.ok, loginRes.error || 'Login failed').toBe(true);
});
await test.step('Query `me`', async () => {
  expect(meRes.ok, meRes.error || 'Me query failed').toBe(true);
});
await test.step('Validate payload', async () => {
  expect.soft(typeof meNode.id).toBe('string');
});
```

### C) Assertions

- **Hard** (primary contract)
  - Success path: `expect(loginRes.ok).toBe(true)`
  - Negative path: `expect(meAttempt.ok).toBe(false)` and, if transport-level, `expect(meAttempt.httpStatus).toBe(401)`
- **Soft** (details)
  - Field types / shapes: `expect.soft(typeof token).toBe('string')`
  - Regex shapes: `expect.soft(uuid).toMatch(UUID36)`
  - Value equality: `expect.soft(regNode.firstName).toBe(patient.firstName)`

---

## 4) Canonical examples (Updated)

### Patient Login (happy path)

```js
test('Should Login And Return Tokens @api @patient @positive', async ({ api }) => {
  const creds = { username: process.env.LOGIN_USERNAME, password: process.env.LOGIN_PASSWORD };
  const loginRes = await safeGraphQL(api, { query: LOGIN_MUTATION, variables: creds });

  await test.step('GraphQL should succeed', async () => {
    expect(loginRes.ok, loginRes.error || 'GraphQL call failed').toBe(true);
  });

  await test.step('Validate tokens (strings)', async () => {
    const tokens = loginRes.body?.data?.patient?.auth?.login;
    expect(tokens, 'Missing data.patient.auth.login').toBeTruthy();
    expect.soft(typeof tokens.accessToken).toBe('string');
    expect.soft(typeof tokens.refreshToken).toBe('string');
  });
});
```

### Patient Login (invalid credentials, uses `getGQLError`)

```js
test('Should Reject Invalid Credentials @api @patient @negative', async ({ api }) => {
  const creds = { username: 'bad.user', password: 'nope' };
  const loginAttempt = await safeGraphQL(api, { query: LOGIN_MUTATION, variables: creds });

  await test.step('Login should fail', async () => {
    expect(loginAttempt.ok).toBe(false);
  });

  await test.step('Assert error details', async () => {
    const { message, code, classification, path } = getGQLError(loginAttempt);
    expect(message.toLowerCase()).toMatch(/(invalid|incorrect|unauthori[sz]ed)/);
    expect.soft(code).toBe('401');
    expect.soft(classification).toBe('UNAUTHORIZED');
    expect.soft(path).toBe('patient.auth.login');
  });
});
```

### Authenticated `me` (patient)

```js
test('patient.me returns the current user @api @patient @positive', async ({ api }) => {
  const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
    username: process.env.LOGIN_USERNAME,
    password: process.env.LOGIN_PASSWORD,
  });

  const meRes = await safeGraphQL(api, { query: ME_QUERY, headers: bearer(accessToken) });

  expect(loginRes.ok, loginRes.error || 'Login failed').toBe(true);
  expect(meRes.ok, meRes.error || 'Me query failed').toBe(true);

  const meNode = meRes.body?.data?.patient?.me;
  expect(meNode, 'Missing data.patient.me').toBeTruthy();
  expect.soft(typeof meNode.username).toBe('string');
});
```

### Register Rider (duplicate negative, descriptive consts + `getGQLError`)

```js
test('Should Reject Duplicate Rider Registration @api @admin @negative', async ({ api }) => {
  const { accessToken } = await adminLoginAndGetTokens(api, {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  });

  const existingRider = {
    firstName: 'Dave',
    lastName: 'Rider',
    email: 'daverider1@yahoo.com',
    username: 'daverider1.rider',
    password: 'Password123',
  };

  const dupeRegRider = await safeGraphQL(api, {
    query: REGISTER_RIDER_MUTATION,
    variables: { rider: existingRider },
    headers: bearer(accessToken),
  });

  expect(dupeRegRider.ok).toBe(false);

  const { message, code, classification, path } = getGQLError(dupeRegRider);
  expect(message.toLowerCase()).toContain('already registered');
  expect.soft(code).toBe('409');
  expect.soft(classification).toBe('CONFLICT');
  expect.soft(path).toBe('administrator.rider.register');
});
```

---

## 5) Naming & readability

- Variables should be **descriptive** of what they hold or do:
  - ✅ `const loginRes = …`, `const meRes = …`, `const dupeRegRider = …`, `const registerRes = …`
  - ❌ `const res`, `const result`, `const x`
- Keep helpers tiny and **single-purpose** (e.g., `loginAndGetTokens`, `adminLoginAndGetTokens`, `bearer`, `getGQLError`).

---

## 6) Tags & filtering

- Default tags we use:
  - `@api` (always in API tests)
  - domain tags like `@patient`, `@admin`, `@rider`
  - polarity: `@positive` or `@negative`
- You can filter with `TAGS` env:
  ```bash
  TAGS='@api|@patient' npx playwright test
  TAGS='@negative' npx playwright test
  ```

---

## 7) Where to put things

- **`helpers/testUtilsAPI.js`**: `safeGraphQL`, `getGQLError`, `loginAndGetTokens`, `adminLoginAndGetTokens`, `bearer`
- **`helpers/graphqlClient.js`**: low-level transport; accepts optional `headers`
- **`api/tests/*.spec.js`**: your test suites (`describe`) for each feature (e.g., `login`, `register`, `me`).

---

## 8) FAQ

- **Why `toBe(true)` for `ok`?**  
  Clear contract: if a request didn’t both (a) transport OK **and** (b) return no GraphQL errors, the test fails.
- **When do I prefer `toBeTruthy()`?**  
  For “is there _something_ here?” checks (e.g., node exists), not for boolean contracts.
- **Do I assert message strings?**  
  Prefer structured fields via `getGQLError` (`code`/`classification`). Fall back to fuzzy message checks only when structure is absent or unstable.

---

## 9) Use the custom API test fixture (don’t rely on Playwright’s default `baseURL`)

**Why:** Our repo provides a dedicated API Playwright config/fixture that points requests at `API_BASE_URL`. If a spec imports `test` from `@playwright/test`, it may inherit a **web** project `baseURL` (e.g., GitHub Pages) and your GraphQL calls can fail at the gateway (e.g., 405).

**Rule:** For **all API tests**, import `test/expect` from our custom API config and use the **`api`** fixture — **never** `{ request }` from `@playwright/test`.

```diff
- import { test, expect } from '@playwright/test';
+ import { test, expect } from '../../globalConfig.api.js'; // adjust path as needed

- test('...', async ({ request: api }) => {
+ test('...', async ({ api }) => {
    // All safeGraphQL calls now use API_BASE_URL + GRAPHQL_PATH
});
```

**Standard header for API specs**

```js
// api/tests/<feature>.spec.js
import { test, expect } from '../../globalConfig.api.js';
import { safeGraphQL, bearer } from '../../helpers/testUtilsAPI.js';
```

**Project routing in this repo**

Our Playwright config splits projects by directory and TEST_ENV:

- **API tests:** `./api/tests/**`
- **E2E/UI tests:** `./e2e/tests/**`
- Select projects via env: `PROJECT=api` or `PROJECT=e2e,api`
- Base URL is chosen from `TEST_ENV` (`LOCAL`/`ORANGE`/`PROD`) and injected as `use.baseURL`.

This means the guidance above maps to **this repo** as:

- Keep API specs in `./api/tests/**` (picked up by the **api** project).
- Run one file under API:  
  `npx playwright test -p api api/tests/patient/login.spec.js`
