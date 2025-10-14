# 🎭 Playwright Automation Template

End-to-end testing framework powered by **Playwright** with **Discord integration** for real-time reporting and screenshots on failures.

---

## 🚀 Features

- Run Playwright E2E tests with **multi-env** support (`LOCAL` / `PROD` / `ORANGE`).
- **Discord integration**:
  - Suite headers with environment + tags.
  - Live progress bar with ✅/❌/⚪ summary.
  - Dedicated Discord **thread per run**.
  - ❌ **E2E**: Failures log screenshots inline (with context image).
  - ❌ **API**: Failures post clean **Error / Expected / Received** snippets (no file paths).
  - Optional ✅ pass logging.
- **Case-insensitive, tokenized tags**: `TAGS='smoke|regression'` matches `@smoke` / `@regression` regardless of case; won’t match `smoke1`.
- **Project selection via env**: `PROJECT=api` or `PROJECT=e2e,api` (unset = run both).
- **Safe helpers** that return booleans instead of throwing.
- **Timeouts** centralized (`short`, `standard`, `long`, `extraLong`).
- Full `.env` support for configuration.
- Always generates an **HTML report** (`npx playwright show-report`).
- Test-level timeout defaults to **60s** (configurable).
- Pre-run cleanup of reports/screenshots/test-results.
- Auto-publish HTML reports to GitHub Pages with direct link in Discord summary.

---

## 📦 Installation

```bash
npm install
```

---

## 🛠 Quick Start

### 1. Configure `.env`

Copy `.env.example` to `.env` and fill in your values.

### 2. Run Sample Test

```bash
TAGS='samples' npx playwright test
```

---

## 📘 Documentation

See **[USAGE.md](./USAGE.md)** for:

- Detailed usage examples
- Safe helper reference
- Tagging strategies
- Discord reporting flow
- Upcoming enhancements

> Looking for version history? See **[CHANGELOG.md](./CHANGELOG.md)**.

---

## 🧩 Project Structure

```
e2e-project/
├── e2e/                     # UI / browser tests
│   ├── pages/
│   ├── tests/
│   ├── globalConfig.ui.js   # UI-only hooks (uses page)
│   └── Timeouts.js
│   └── helpers/
│       └── testUtilsUI.js   # UI-only safe helpers
├── api/                     # API tests (scaffold)
│   └── tests/
│   └── helpers/
│       └── testUtilsAPI.js  # API-only safe helpers
├── helpers/
│   └── discord/
│       ├── discordBot.js
│       ├── discordReporter.js
│       └── discordSetup.js
├── scripts/
│   └── publish-report.js
├── reports/                 # generated; published to gh-pages (gitignored)
├── globalSetup.js
├── playwright.config.js     # defines projects: e2e, api (with PROJECT filter)
├── .env / .env.example
├── README.md / USAGE.md / CHANGELOG.md / PROJECTVISIONS.md
└── package.json
```

---

## Testing Guidelines

See [AGENTS.MD](./agents.md) for how we write API tests (GraphQL + Playwright).

---

## 📄 License

MIT — Use, modify, and enjoy 🚀
