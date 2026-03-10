# Changelog

All notable changes to this project will be documented in this file.

# [3.0.7]

### Added

- Added repo-specific AI governance and change-control docs:
  - `docs/architecture.md`
  - `docs/change-workflow.md`
  - `docs/coding-standards.md`
  - `docs/prompt-templates.md`
  - `docs/risk-checklist.md`
  - `docs/test-layer-map.md`

### Changed

- Reworked `AGENTS.MD` into the primary AI agent instruction file for this repository:
  - added approval-required areas
  - added mandatory pre-change workflow and self-review rules
  - added hybrid merchant safeguards and selector-handling rules
- Updated shared order-creation coordinates across API and hybrid test data to:
  - `lat: 9.85`
  - `lng: 124.14`
- Added bounded retry to hybrid patient order creation in `e2e/tests/merchantPortal/actions/patientActions.js`:
  - up to 3 total attempts
  - 5-second retry delay (`Timeouts.short`)
- Tightened merchant selector handling in `e2e/selectors/merchant.selectors.json`:
  - scoped `AssignBranchConfirmButton` to the open assign-branch dialog
  - updated `AskRiderToQuoteCheckbox` to match the live checkbox + label DOM structure
- Updated hybrid FindMyMeds flow in `e2e/tests/merchantPortal/FindMyMedsFlow.spec.js`:
  - branch search now targets `Pharmacy API`
  - rider flow now uses `PHARMACIST_BRANCHID_REG01`
- Updated hybrid Pabili flows in `e2e/tests/merchantPortal/PabiliFlow.spec.js`:
  - removed redundant pharmacist API accept/confirm calls from `E2E-8` after merchant UI acceptance
  - removed redundant rider pre-start step from `E2E-9` so rider completion follows the shared completion helper path

# [3.0.6]

### Changed

- Migrated CI credential loading from per-key GitHub secrets mapping to encrypted env bundles:
  - `secrets/secrets.dev.enc.json`
  - `secrets/secrets.qa.enc.json`
  - `secrets/secrets.prod.enc.json`
- Added sops/age secret toolchain:
  - `scripts/secrets/build-encrypted-files.js`
  - `scripts/secrets/load-secrets.js`
  - `scripts/secrets/install-sops.sh`
  - `.sops.yaml` policy
- Updated workflow to require only one bootstrap secret: `SOPS_AGE_KEY`.
- Restored CI fullscreen browser settings in Playwright config:
  - viewport `1920x1080`
  - launch args `--start-maximized --window-size=1920,1080`

# [3.0.5]

### Changed

- Added layered environment profile loading in runtime config:
  - `.env` -> `.env.<test_env>` -> `.env.local` -> `.env.<test_env>.local`
  - shell/CI variables remain highest-precedence overrides
- Expanded `TEST_ENV` support and validation to `DEV`, `QA`, and `PROD`.
- Updated API base URL resolution to support env-specific keys:
  - `API_BASE_URL` explicit override
  - fallback to `API_BASE_URL_<TEST_ENV>` (`DEV/QA/PROD`)
- Updated `.env.example` to separate shared runtime config from env-specific credentials and document profile-based credential placement (`.env.dev`, `.env.qa`, `.env.prod`).

# [3.0.4]

### Changed

- Removed dedicated CI targeted rerun branch; workflow now uses mode + optional `tags` input only.
- Updated `workflow_dispatch` input key from `rerun_tags` to `tags`.
- Simplified CI back to a single execution job (`api-tests`) to restore incremental Discord reporting during CI runs.
- Removed CI finalize orchestrator flow and artifact-merge reporting path.
- Restored CI `safe`/`stress` run modes in `workflow_dispatch` and added `basic` mode as default.
- Updated default CI behavior:
  - `push` runs `safe + smoke` batches
  - `schedule` runs `safe + full` batches
- Added `workflow_dispatch` `test_env` selector with default `DEV`.
- Updated rerun helper command format to omit `PROJECT=` by default.
- Updated batch orchestration to reuse one Discord thread across safe mode batches.
- Updated stress mode to use one full-suite invocation for cleaner one-thread reporting.
- Safe mode now runs all batches even when earlier batches fail, then exits with combined failure status.
- Safe mode report publishing now merges all batch blob outputs into a single report link.

# [3.0.3]

> Superseded by `3.0.4` (kept for historical context).

### Changed

- Updated CI workflow to prevent report/publish conflicts:
  - worker jobs now run with `DISCORD_REPORTER=0` and upload JUnit/blob artifacts
  - worker jobs now set `DISCORD_SETUP=0` (Discord setup is explicitly controlled)
  - added `finalize-reporting` job as single owner for Discord summary + report publish
  - report publishing now happens once per workflow run, not in parallel worker jobs
- Updated Playwright config to support optional CI reporters via env:
  - `PW_JUNIT_OUTPUT` for JUnit output
  - `PW_BLOB_OUTPUT` for blob output
  - `DISCORD_REPORTER=0` to disable Discord reporter on worker jobs
- Added Discord channel routing by `REPORT_PUBLISH` + `TEST_ENV`:
  - `REPORT_PUBLISH=0` routes to `LOCAL_RUNS_CHANNELID`
  - publish-enabled runs route by env (`DEV_TESTING_CHANNELID`, `QA_TESTING_CHANNELID`, `PROD_TESTING_CHANNELID`)
  - fallback channel is `LOCAL_RUNS_CHANNELID`

# [3.0.2]

### Added

- Added local batch runner script: `scripts/run-all.sh`
  - `safe` mode: API standalone -> pause -> API E2E -> pause -> UI E2E
  - `stress` mode: all three batches run in parallel
  - `DRY_RUN=1` for execution preview logs without running tests
- Added npm scripts:
  - `test:all`
  - `test:all:safe`
  - `test:all:stress`

### Changed

- Updated CI workflow `.github/workflows/tests.yml`:
  - `push`/`schedule` now resolve to safe mode by default
  - `workflow_dispatch` now accepts `run_mode`, `threads`, `safe_pause_seconds`, `rerun_tags`, and `rerun_project`
  - targeted rerun now supports `rerun_project=all` (`PROJECT=e2e,api`)
  - test execution now calls batch scripts instead of a single direct `playwright` command
- Updated `README.md` and `USAGE.md` to document safe/stress execution behavior.

# [3.0.1]

### Changed

- **API failures** now post to Discord **per test (immediately)** with a **cleaned Error/Expected/Received snippet** (ANSI-stripped) and **no file paths**.
- Reporter polish: removed duplicate ❌ in API logs; clarified comments and flow.

## [3.0.0]

### Added

- **Env-based project selection**: set `PROJECT=api` or `PROJECT=e2e,api`. Empty/unset runs **both**.
- **Case-insensitive, tokenized tags**: `TAGS='smoke|regression'` matches `@smoke` / `@regression` in any case and avoids `smoke1`.
- **API fixtures baseline** (`api/globalConfig.api.js`) to init/teardown an API client per test.

### Changed

- **Discord header titles & icons** now reflect selected projects:
  - **E2E only** → `🌐 End2End Test Suite`
  - **API only** → `🧭 API Test Suite`
  - **Both** → `🛠️ End2End & API Test Suites`
- Updated **USAGE.md** and **README.md** samples

---

## [2.2.5]

### Changed

- Renamed `testUtils.js` → `testUtilsUI.js` under `e2e/helpers/`.
- Added `api/helpers/testUtilsAPI.js` as a scaffold for upcoming API-safe helpers.
- Updated `playwright.config.js` to reflect new `e2e` and `api` projects.
- Synced README.md and USAGE.md:
  - Project tree now lists both helper files.
  - Usage docs clarify **UI helpers** vs. **API helpers** sections.

---

## [2.2.4]

### Changed

- Restructured repository into **projects**:
  - **`e2e/`** for UI/browser tests (moved `globalConfig` → `e2e/globalConfig.ui.js`, `Timeouts.js`, pages & specs).
  - **`api/`** scaffold for future API tests.
- Updated `playwright.config.js` to define **projects** and point to `./e2e/tests` and `./api/tests`.
- Updated docs to show `--project=e2e|api` usage and new project tree.

---

## [2.2.3]

### Changed

- Cleaned up documentation to remove duplication:
  - `.env` configuration is now centralized in `.env.example`.
  - README.md Quick Start now points directly to `.env.example` instead of duplicating values.
  - Confirmed PROJECTVISIONS.md and USAGE.md contain only roadmap and usage details respectively.
- Ensured all markdown files (README, USAGE, PROJECTVISIONS, CHANGELOG) are in sync with v2.2.x features.

---

## [2.2.2]

- Nothing much. Just missed update in changelog

---

## [2.2.1]

### Added

- `.env.example` file with placeholders for easy setup.
- Updated README and USAGE to document `REPORT_PUBLISH` and all env vars.

### Changed

- Updated PROJECTVISIONS.md To-Do list (safe helpers marked complete).

---

## [2.2.0]

### Added

- Automatic publishing of Playwright HTML reports to **GitHub Pages** (with timestamped runs).
- Final Discord summary now includes a direct 🔗 link to the published HTML report.

---

### Changed

- Discord summary simplified: always a single final message with ✅/❌/⚪ counts + report link.

## [2.1.0]

### Added

- Generic, concise whole-test timeout message: **“Test timed-out after {N}s.”**
- Automatic pre-run cleanup of `screenshots/`, `.playwright-report/`, and `test-results/`.

### Changed

- Default per-test timeout increased to **60s** (from 30s).

---

## [2.0.0]

### Added

- Safe helpers:
  - `safeClick`
  - `safeInput`
  - `safeHover`
  - `safeNavigateToUrl`
  - `safeWaitForElementVisible`
  - `safeWaitForPageLoad`
- Automatic screenshots on all failures.
- Discord reporting:
  - Suite header with env + tags.
  - Live progress bar.
  - Per-test ✅/❌ logs.
  - Final summary with counts.
- HTML report generation (`.playwright-report`).

---

## [1.0.0]

### Added

- Initial project setup with Playwright + Discord integration.
- Suite header + thread creation in Discord.
- Manual failure logging with `markFailed`.
