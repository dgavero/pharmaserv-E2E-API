# 🌟 PROJECTVISIONS.md

This document captures the **goals, philosophy, and alignment rules** for the Playwright + Reporting Mini Project.  
It serves as a **living contract for how to write tests, structure helpers, and evolve the framework**.

---

## 🎯 Project Goal

- Build a **robust E2E automation framework** with Playwright.
- Provide **real-time reporting** with per-test logging, progress bars, and final summaries.
- Current implementation uses **Discord** as the reporting channel, but the design is flexible so it can expand to other platforms (Slack, Teams, Google Chat, etc.) in the future.
- Make failures **clear, reproducible, and visual** (screenshots included).
- Keep tests **readable, reusable, and environment-agnostic**.

---

## 🧑‍💻 Testing Philosophy

### ✅ Safe Helpers

- All safe helpers return **boolean** (`true` on success, `false` on failure).
- Helpers never throw — they only stash error messages internally.
- Tests/Page Objects decide whether to log failure with `markFailed`.

### ✅ Error Handling

- `markFailed(reason)` is the **only place a test should fail**.
  - Logs ❌ with human-readable reason.
  - Attaches a screenshot inline.
  - Throws error to stop test immediately.
- `markPassed(message)` logs ✅ with optional message (only if enabled in `.env`).

### ✅ Timeout Handling

- Action-level timeouts (via safe helpers) → return `false`; tests decide whether to call `markFailed`.
- Test-level timeouts (per-test budget, default 60s) → logged automatically as  
  `"Test timed-out after {N}s."` with a screenshot if possible.

### ✅ Page Object Model (POM)

- Page Object methods may call `markFailed` if they represent **reusable flows** (login, logout).
- Test files should only call `markFailed` for **test-specific checks**.

### ✅ Timeouts

- Never hardcode numbers in tests.
- Always use `Timeouts.short`, `Timeouts.standard`, `Timeouts.long`, `Timeouts.extraLong`.

### ✅ Screenshots

- Automatically attached on every `markFailed`.
- If screenshot capture fails → log fallback `"Unable to capture screenshot for this failure."`

---

## 📦 Current Status

### What’s Implemented

- Safe helpers (`safeClick`, `safeInput`, `safeHover`, `safeNavigateToUrl`, `safeWaitForElementVisible`, `safeWaitForPageLoad`).
- Screenshot-on-failure flow wired to `markFailed`.
- Test-level timeout raised to **60s** (from default 30s).
- Automatic cleanup of `screenshots/`, `.playwright-report/`, and `test-results/` before each run.
- Page Object methods (OrangeLoginPage: `open`, `login`, `isOnDashboard`, `hasError`).
- Reporting integration (currently Discord):
  - Suite header with env + tags.
  - Live progress bar updates.
  - Test summary (✅/❌/⚪).
  - Per-test logs inside a thread.
- Prettier + VSCode formatting rules aligned.
- HTML report:
  - Auto-generated each run
  - Auto-published to GitHub Pages
  - Direct link added to final Discord summary
- **Env-driven runs**: `PROJECT=api|e2e,api` to select projects; case-insensitive, tokenized `TAGS`.

---

## 📝 To-Do List

1. **Reporting Enhancements**
   - Optional: abstract reporter so it can also support Slack/Teams in future.
   - Add a propagation note in Discord summary (⚠️ “report may take ~1min to go live”).

2. **Flakiness Handling**
   - Configure retries for flaky tests.
   - Smarter wait strategies.

3. **CI/CD Integration**
   - Run tests automatically in pipelines (GitHub Actions / Jenkins).
   - Upload Playwright HTML report as artifact.
   - Post report link in final summary (same as local).

4. **Documentation**
   - Keep `.env.example` up to date.
   - Expand README with flow diagram + screenshots of Discord reports.

5. **Future Extensions**
   - Multi-channel support (Slack, Teams, Google Chat).
   - Parallelism tuning per suite.
   - Central selector registry (shared locators).

---

## 📖 Golden Rules for Writing Tests

- Always use **safe helpers** instead of raw Playwright actions.
- Never throw directly inside tests — always go through `markFailed`.
- Keep POMs reusable; don’t hardcode test-specific asserts in them.
- Use `.env` + `Timeouts.js` for environment & timing consistency.
- Strive for **clear, human-readable failure messages**.

---

## 📌 Vision Statement

The framework is designed to be:

- **Readable** (tests read like a story).
- **Actionable** (failures are obvious and reproducible).
- **Shareable** (any channel can follow progress in real time).
- **Future-proof** (reporting integrations can grow beyond Discord).


---

## Final TODO Checklist

### 1) Reporting & Discord Improvements
- [ ] Multi-channel or alternative notification support (Slack / Teams etc).
- [ ] Optional batching for large failure bursts (group multiple failures in one message).
- [ ] Include execution duration & timestamp per test in failure snippets.
- [ ] Add “report propagation delay” note in final summary (clarify async posts).
- [ ] Investigate `REPORT_PUBLISH=0` behavior — ensure reports are **not posted to Discord** when disabled.

### 2) CI/CD Integration
- [ ] GitHub Actions workflow:
  - Run E2E + API (matrix or env-driven).
- [ ] Secrets handling for `DISCORD_BOT_TOKEN` and envs.
- [ ] Add one-click “Retry Failed Tests” feature in CI (e.g., Jenkins/GitHub Actions):
  - Collect failed test IDs from last run.
  - Trigger a rerun for only those tests (using tags or IDs).

### 3) Documentation Enhancements
- [ ] Add a flow diagram (start → per-test updates → summary).
- [ ] Include a real Discord thread screenshot (API and E2E examples).
- [ ] Consider splitting docs: Quickstart vs. Dev Guide.
