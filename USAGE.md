# 📘 Usage Guide — E2E Playwright + Discord Reporter

> **Version**: v3.0.1  
> **Purpose**: Automated Playwright tests + Discord integration for real-time reporting with screenshots on failure.

---

## 1️⃣ Running Tests

### Run Specific Environment

```bash
TEST_ENV=PROD npx playwright test
```

### Run Specific Tags

```bash
TAGS='samples' npx playwright test
```

### Run by Project (via env)

```bash
# Only API
PROJECT=api npx playwright test
# Only E2E
PROJECT=e2e npx playwright test
# Multiple
PROJECT=e2e,api npx playwright test
```

### Run with Configs

```bash
TEST_ENV=ORANGE THREADS=4 TAGS='all' PROJECT=e2e,api  npx playwright test
```

### Filter by Tags

Tag tests with `@tags` in `describe` or `test` titles:

```js
test.describe('positive @samples @regression', () => {
  test('positive test case 1 @pos1', async ({ page }) => { ... });
});
```

Examples:

```bash
TAGS='samples' npx playwright test        # run all @samples tests
TAGS='pos1|neg2' npx playwright test    # run specific tags
TAGS='(?!.*@secret)' npx playwright test  # run everything except @secret
```

---

## 2️⃣ Environment Setup

### `.env`

```env
Copy the provided `.env.example` file to `.env` in the project root and update it with your own values.
```

---

## 3️⃣ Discord Reporting Flow

### What Happens During a Run

1. **Suite Start**
   - Posts header message (project-aware title & icon, e.g., `🧭 End2End Test Suite` or `🔌 API Test Suite`): `ENV | tags`.
   - Creates a dedicated thread for test logs.
   - Shows `0% [0/N]` progress bar + empty summary.

2. **While Running**
   - Each test updates the live header with:
     - Progress bar (`▰▱▱▱▱`)
     - Percentage done
     - Running summary:
       ```
       📊 Test Summary
       ✅ Passed: 2
       ❌ Failed: 1
       ⚪ Skipped: 0
       ```

3. **Per-Test**
   - `markPassed()` → ✅ optional (only if DISCORD_LOG_PASSED=1).
   - `markFailed(reason)` → ❌ always posted, with screenshot attached.
   - **API**:
     - On any failed assertion (hard or soft), a ❌ is posted **immediately** with a **clean Error/Expected/Received snippet**
   - Whole-test timeouts are logged as: **“Test timed-out after {N}s.”**

4. **Final Summary**
   - Header replaced with final counts.
   - Adds a direct link:
     - If published → 🔗 Playwright HTML report on GitHub Pages

---

## 4️⃣ Helper Functions

### `markPassed(reason?)`

Logs ✅ to Discord (if enabled).

```js
markPassed();
markPassed('All checks passed successfully');
```

### `markFailed(reason)`

Logs ❌ to Discord with a screenshot and stops test immediately.

```js
if (!(await safeWaitForElementVisible(page, '#loginBtn'))) {
  markFailed('Login button not found');
}
```

---

## 5️⃣ Safe Helpers

### UI Helpers `e2e/helpers/testUtilsUI.js`

All return `true/false` instead of throwing.  
If `false`, call `markFailed()` with your human context.

- `safeClick(page, selector, { timeout })`
- `safeInput(page, selector, text, { timeout, delay })`
- `safeHover(page, selector, { timeout })`
- `safeWaitForElementVisible(page, selector, { timeout })`
- `safeNavigateToUrl(page, url, { timeout })`
- `safeWaitForPageLoad(page, url, { timeout })`
- `safeScreenshot(page)` (internal, used on failures)

Timeouts default to `Timeouts.standard` (15s).  
Override with `Timeouts.short`, `long`, `extraLong`.

### API Helpers (`api/helpers/testUtilsAPI.js`)

Use Playwright’s native assertions (`expect` / `expect.soft`) for API tests.
For GraphQL, use the provided **`safeGraphQL`** wrapper in `api/helpers/testUtilsAPI.js`
to normalize transport (HTTP) vs GraphQL resolver errors without throwing.

---

## 6️⃣ More

> For version history, see **[CHANGELOG.md](./CHANGELOG.md)**.
