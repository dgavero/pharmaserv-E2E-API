# AGENTS.MD — API Test Guidelines (GraphQL + Playwright)

> **Audience:** AI assistants & humans contributing tests here.  
> **Goal:** Produce clean, consistent tests that match this repo’s patterns and naming.  
> **Source of truth example:** `tests/api/register.spec.js`. (Use it as a reference.)

---

## Core Principles

- **Clarity over cleverness.** Prefer readable names and minimal magic.
- **Strict success signals.** Use `toBe(true/false)` for boolean gates.
- **Soft detail checks.** Use `expect.soft` for payload fields so you get multiple diffs in one run.
- **Prefer structured GraphQL errors.** Assert on `errorCode`/`errorClass`, then fall back to a fuzzy message.
- **Surgical changes.** When proposing edits, show only the lines that change with `-` / `+`.

---

## Naming Conventions

- **Result variables:** Use descriptive names that say _what the call does_, not just `res`.
  - ✅ `registerUser = await safeGraphQL(...)`
  - ✅ `loginUser = await safeGraphQL(...)`
  - ✅ `fetchProfile = await safeGraphQL(...)`
  - ❌ `res`, `result`, `r` (too generic)
- **Payload aliases:** Derive objects from the result with equally clear names:
  - `const registered = registerUser.body?.data?.patient?.register;`
- **Helpers:** Keep small, purpose-led helpers in the spec (or a tiny shared helper file).

> This expands on the current example in `register.spec.js`, which used `registerRes`; prefer `registerUser` (or similar verb-noun form) for even clearer intent.

---

## Helper: `safeGraphQL`

**Import:** `import { safeGraphQL } from '../../helpers/testUtilsAPI.js';`

`safeGraphQL(api, { query, variables })` returns:

```ts
{
  ok: boolean,               // only true if HTTP OK and no GraphQL errors
  body: any | null,          // parsed JSON
  error: string | null,      // compact message for failures
  errorCode: string|null,    // errors[0].extensions.code (e.g., "409")
  errorClass: string|null,   // errors[0].extensions.classification (e.g., "CONFLICT")
  errorMessage: string|null  // errors[0].message
}
```

### How to read it

- **Success:** `ok === true`; error fields are `null`; data under `body.data.*`.
- **GraphQL error:** `ok === false`; structured fields filled; HTTP is 200.
- **Transport error:** `ok === false`; structured fields `null`; `error` contains `"HTTP <status> <snippet>"`.

> We omit `operationName` unless a document contains multiple operations.

---

## Assertion Style

### Hard checks (strict gates)

- Use strict booleans and meaningful messages:

```js
expect(registerUser.ok, registerUser.error || 'GraphQL call failed').toBe(true);
expect(duplicateAttempt.ok, 'API allowed duplicate registration').toBe(false);
```

### Soft checks (payload details)

```js
const registered = registerUser.body?.data?.patient?.register;
expect(registered, 'Missing data.patient.register').toBeTruthy();

// types
expect.soft(typeof registered.id).toBe('string');
expect.soft(typeof registered.uuid).toBe('string');

// format
const UUID36 = /^[0-9a-fA-F-]{36}$/;
expect.soft(registered.uuid).toMatch(UUID36);

// echoes
expect.soft(registered.firstName).toBe(patient.firstName);
expect.soft(registered.lastName).toBe(patient.lastName);
expect.soft(registered.username).toBe(patient.username);
```

### Negative tests: prefer structure, fallback to message

```js
const code = String(res.errorCode ?? '').trim();
const klass = String(res.errorClass ?? '').trim();
const msg = res.errorMessage ?? res.error ?? JSON.stringify(res.body?.errors ?? [], null, 2);

if (code || klass) {
  expect.soft(code).toBe('409');
  expect.soft(klass).toBe('CONFLICT');
} else {
  expect.soft(msg).toMatch(/already\s+registered/i);
}
```

---

## `test.step` (optional, for report readability)

Use steps to group phases in the Playwright HTML report. This **does not** change Discord output.

Recommended steps:

- `'GraphQL should succeed'` — wrap the hard success check
- `'Validate payload'` — wrap field-level soft assertions
- `'Assert conflict details'` — for negative tests

Example:

```js
await test.step('GraphQL should succeed', async () => {
  expect(registerUser.ok, registerUser.error || 'GraphQL call failed').toBe(true);
});

await test.step('Validate payload', async () => {
  const registered = registerUser.body?.data?.patient?.register;
  expect(registered, 'Missing data.patient.register').toBeTruthy();
  // ...soft checks...
});
```

---

## Templates

### Happy Path (Register)

```js
const REGISTER = \`
  mutation ($patient: Register!) {
    patient { register(patient: $patient) { id uuid firstName lastName username } }
  }
\`;

test('should register a new patient @api @smoke', async ({ api }) => {
  const patient = makeNewPatient(); // timestamp + random suffix

  const registerUser = await safeGraphQL(api, { query: REGISTER, variables: { patient } });

  await test.step('GraphQL should succeed', async () => {
    expect(registerUser.ok, registerUser.error || 'GraphQL call failed').toBe(true);
  });

  await test.step('Validate payload', async () => {
    const registered = registerUser.body?.data?.patient?.register;
    expect(registered, 'Missing data.patient.register').toBeTruthy();

    expect.soft(typeof registered.id).toBe('string');
    expect.soft(typeof registered.uuid).toBe('string');
    const UUID36 = /^[0-9a-fA-F-]{36}$/;
    expect.soft(registered.uuid).toMatch(UUID36);

    expect.soft(registered.firstName).toBe(patient.firstName);
    expect.soft(registered.lastName).toBe(patient.lastName);
    expect.soft(registered.username).toBe(patient.username);
  });
});
```

### Negative (Duplicate)

```js
const DUPLICATE_HINT = /already\s+registered/i;

test('should reject duplicate registration @api @smoke', async ({ api }) => {
  const fixed = buildFixedPatient(); // deterministic

  // Seed best-effort (ok if it already exists)
  await safeGraphQL(api, { query: REGISTER, variables: { patient: fixed } });

  const secondAttempt = await safeGraphQL(api, { query: REGISTER, variables: { patient: fixed } });

  await test.step('Second registration should fail', async () => {
    expect(secondAttempt.ok, 'API allowed duplicate registration').toBe(false);
  });

  await test.step('Assert conflict details', async () => {
    const code = String(secondAttempt.errorCode ?? '').trim();
    const klass = String(secondAttempt.errorClass ?? '').trim();
    const msg =
      secondAttempt.errorMessage ??
      secondAttempt.error ??
      JSON.stringify(secondAttempt.body?.errors ?? [], null, 2);

    if (code || klass) {
      expect.soft(code).toBe('409');
      expect.soft(klass).toBe('CONFLICT');
    } else {
      expect.soft(msg).toMatch(DUPLICATE_HINT);
    }
  });
});
```

---

## File/Folder Naming

- Tests live under `tests/api/*.spec.js`
- One operation per document; omit `operationName`.
- Consider a tiny generator helper for unique data (timestamp + random).

---

## Surgical Diff Format

When proposing changes, show only the changed lines:

```diff
- expect(registerUser.ok, registerUser.error || 'GraphQL call failed').toBeTruthy();
+ expect(registerUser.ok, registerUser.error || 'GraphQL call failed').toBe(true);
```

---

## Quick Checklist (new test)

- [ ] Mutation/query string (single operation).
- [ ] Build data (`makeNewPatient()` or `buildFixedPatient()`).
- [ ] Call `safeGraphQL` → **hard** assert success/failure.
- [ ] Validate payload with **soft** assertions.
- [ ] For negatives, prefer `errorCode`/`errorClass`, fallback to message regex.
- [ ] Use descriptive result names (`registerUser`, `loginUser`, …).

---

## Troubleshooting

- **Prettier/formatting**: run `npm i`; ensure `.prettierrc` exists; set VS Code default formatter to Prettier.
- **Unexpected payload shape**: log `JSON.stringify(res.body, null, 2)` and adjust `data.*` path accordingly.
- **Forcing a fail for CI preview**:

```js
await test.step('Force failure (temporary)', async () => {
  if ((process.env.FORCE_FAIL ?? '') === '1') {
    expect(false, 'Forced failure for reporting preview').toBe(true);
  }
});
```

---

Happy testing! Keep PRs small, with well-labeled commits and surgical diffs.
