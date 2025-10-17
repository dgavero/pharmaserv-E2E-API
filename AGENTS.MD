# AGENTS.md — API Test Authoring Guide

This guide describes how we write **GraphQL API tests** in this repo: helpers to use, naming, tagging, structure, and assertion style.

---

## 1) Golden conventions (TL;DR)

- **Capitalize test titles** so they look clean in Discord & HTML reports.  
  Example: `test('Should Login And Return Tokens @api @patient @positive', …)`
- **Default tags** for API tests:
  - `@api` (always)
  - Domain tag (e.g., `@patient`)
  - Polarity: **`@positive`** or **`@negative`**
- **Group related flows in one file** with a `test.describe(...)` suite.  
  Example: `login.spec.js` contains both **success** and **failure** cases.
- Prefer **hard** checks for the primary contract, and **soft** checks for details:
  - Hard = must pass (e.g., request succeeded / failed as intended)
  - Soft = nice-to-have details (field values, regex shapes)
- For GraphQL, use **safeGraphQL** wrapper. It normalizes:
  - Transport failures (HTTP 4xx/5xx): `ok=false`, `httpStatus` set, no GraphQL errors
  - GraphQL resolver errors (HTTP 200 + `errors[]`): `ok=false`, `errorCode/errorClass`
  - Success (HTTP 200, no errors): `ok=true`
- When asserting auth failures:
  - If **transport** block (e.g., gateway returns **401**): assert `httpStatus === 401`
  - If **GraphQL** signals (200 + `errors[]`): assert `errorCode`/`errorClass` (e.g., `401` / `UNAUTHORIZED`)
- Use **`test.step()`** to name logical phases (Login → Query → Validate). It improves report readability with no extra noise in Discord.

---

## 2) Helpers you should know

### `safeGraphQL(api, args)`

- Returns a single object with consistent fields:

  ```ts
  {
    ok: boolean,
    body: any,                  // parsed JSON (or null)
    error: string | null,       // compact human message
    httpStatus: number,         // NEW: transport code (200 on success)
    httpOk: boolean,            // NEW: transport ok flag
    errorCode: string | null,   // GraphQL errors[0].extensions.code (e.g., "409", "401")
    errorClass: string | null,  // GraphQL errors[0].extensions.classification (e.g., "CONFLICT", "UNAUTHORIZED")
    errorMessage: string | null // GraphQL errors[0].message
  }
  ```

- Typical **happy-path** hard check:

  ```js
  expect(res.ok, res.error || 'GraphQL call failed').toBe(true);
  ```

- Typical **negative** hard check (auth failure):
  ```js
  expect(res.ok).toBe(false);
  // transport 401
  expect(res.httpStatus).toBe(401);
  ```

### `loginAndGetTokens(api, { username, password })`

- Logs in via GraphQL and returns:
  ```ts
  { accessToken: string|null, refreshToken: string|null, raw: SafeGraphQLResult }
  ```
- Use what you need:
  ```js
  const { accessToken } = await loginAndGetTokens(api, { username, password });
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
  expect(login.ok, login.error || 'Login failed').toBe(true);
});
await test.step('Query `me`', async () => {
  expect(me.ok, me.error || 'Me query failed').toBe(true);
});
await test.step('Validate payload', async () => {
  expect.soft(typeof meNode.id).toBe('string');
});
```

### C) Assertions

- **Hard** (primary contract)
  - Success path: `expect(res.ok).toBe(true)`
  - Negative path: `expect(res.ok).toBe(false)` and, if transport-level, `expect(res.httpStatus).toBe(401)`
- **Soft** (details)
  - Field types / shapes: `expect.soft(typeof token).toBe('string')`
  - Regex shapes: `expect.soft(uuid).toMatch(UUID36)`
  - Value equality: `expect.soft(reg.firstName).toBe(patient.firstName)`

---

## 4) Canonical examples

### Login (happy path)

```js
test('Should Login And Return Tokens @api @patient @positive', async ({ api }) => {
  const creds = { username: process.env.LOGIN_USERNAME, password: process.env.LOGIN_PASSWORD };
  const res = await safeGraphQL(api, { query: LOGIN_MUTATION, variables: creds });

  await test.step('GraphQL should succeed', async () => {
    expect(res.ok, res.error || 'GraphQL call failed').toBe(true);
  });

  await test.step('Validate tokens (strings)', async () => {
    const node = res.body?.data?.patient?.auth?.login;
    expect(node, 'Missing data.patient.auth.login').toBeTruthy();
    expect.soft(typeof node.accessToken).toBe('string');
    expect.soft(typeof node.refreshToken).toBe('string');
  });
});
```

### Login (invalid credentials)

```js
test('Should Reject Invalid Credentials @api @patient @negative', async ({ api }) => {
  const creds = { username: 'bad.user', password: 'nope' };
  const res = await safeGraphQL(api, { query: LOGIN_MUTATION, variables: creds });

  await test.step('Login should fail', async () => {
    expect(res.ok).toBe(false);
  });

  await test.step('Assert error details', async () => {
    const code = String(res.errorCode ?? '').trim();
    const classification = String(res.errorClass ?? '').trim();
    if (code || classification) {
      expect.soft(code).toBe('401');
      expect.soft(classification.toUpperCase()).toBe('UNAUTHORIZED');
    }
    // No message fallback needed if we already asserted httpStatus elsewhere.
  });
});
```

### Authenticated `me`

```js
test('patient.me returns the current user @api @patient @positive', async ({ api }) => {
  const { accessToken } = await loginAndGetTokens(api, {
    username: process.env.LOGIN_USERNAME,
    password: process.env.LOGIN_PASSWORD,
  });

  const me = await safeGraphQL(api, {
    query: ME_QUERY,
    headers: bearer(accessToken),
  });

  expect(me.ok, me.error || 'Me query failed').toBe(true);
  const node = me.body?.data?.patient?.me;
  expect(node, 'Missing data.patient.me').toBeTruthy();
  expect.soft(typeof node.username).toBe('string');
});
```

---

## 5) Naming & readability

- Variables should be **descriptive** of what they hold or do:
  - ✅ `const registerRes = await safeGraphQL(...)`
  - ✅ `const tokens = await loginAndGetTokens(...)`
  - ❌ `const res1`, `const x`, `const getTokens` (sounds like a function)
- Keep helpers tiny and **single-purpose** (e.g., `loginAndGetTokens`, `bearer`).

---

## 6) Tags & filtering

- Default tags we use:
  - `@api` (always in API tests)
  - domain tags like `@patient`
  - polarity: `@positive` or `@negative`
- You can filter with `TAGS` env:
  ```bash
  TAGS='@api|@patient' npx playwright test
  TAGS='@negative' npx playwright test
  ```

---

## 7) Where to put things

- **`helpers/testUtilsAPI.js`**: `safeGraphQL`, `loginAndGetTokens`, `bearer`
- **`helpers/graphqlClient.js`**: low-level transport; accepts optional `headers`
- **`tests/api/*.spec.js`**: your test suites (`describe`) for each feature (e.g., `login`, `register`, `me`).

---

## 8) FAQ

- **Why `toBe(true)` for `ok`?**  
  Clear contract: if a request didn’t both (a) transport OK **and** (b) return no GraphQL errors, the test fails.

- **When do I prefer `toBeTruthy()`?**  
  For “is there _something_ here?” checks (e.g., node exists), not for boolean contracts.

- **Do I assert message strings?**  
  Only as a **fallback** when there’s no structured error; avoid brittle wording checks.

---

Happy testing! Keep titles **Capitalized**, tag with **@api** + domain + **@positive/@negative**, and group related flows together.
