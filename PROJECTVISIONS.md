# Project Visions

Engineering direction and guardrails for this Playwright framework.

## Project Goal

Build a reliable, maintainable, and fast automation stack for Pharmaserv that covers:
- API GraphQL validation
- E2E browser workflows
- Clear run visibility through Discord summaries and logs
- Traceable artifacts through Playwright HTML reports

## Current Design Principles

- Keep API and E2E concerns separated by project.
- Keep execution configurable by environment variables.
- Keep test feedback actionable by posting concise failure context.
- Keep docs and conventions aligned with implementation.

## Runtime Contract

- `TEST_ENV` defaults to `DEV` when empty.
- `TEST_ENV` supports `DEV`, `QA`, and `PROD`.
- `PROJECT` can target `api`, `e2e`, or both.
- `THREADS` controls worker parallelism.
- `TAGS` is case-insensitive and tokenized.
- `REPORT_PUBLISH=0` disables GitHub Pages publish step.
- Env files load in this order:
- `.env` -> `.env.<env>` -> `.env.local` -> `.env.<env>.local`
- Shell/CI variables keep highest precedence over env files.
- UI base URL is selected by `BASE_URL_<TEST_ENV>` (with `BASE_URL` fallback).
- API base URL resolves as `API_BASE_URL` override first, then `API_BASE_URL_<TEST_ENV>`.

## Test Authoring Direction

- API tests follow `AGENTS.MD` as source-of-truth.
- GraphQL operations should live in sibling query files for reuse.
- Positive and negative auth checks should remain in one suite (`test.describe`) as separate `test()` cases when practical.
- Use descriptive result variable names with `Res` suffix.

## Reporting Direction

- Keep Discord header/progress updates lightweight and reliable.
- Keep rerun guidance explicit for failed PHARMA IDs.
- Maintain both rerun paths:
- CI rerun link (placeholder now, real CI link later)
- manual rerun command preserving env/threads/project context

## Near-Term Roadmap

1. Wire CI rerun link to real Jenkins/GitHub Actions endpoint.
2. Add retry-aware accounting for large suites.
3. Keep report publishing/linking resilient and observable.
4. Continue keeping docs synchronized with code changes.

## Documentation Ownership

- `README.md`: entry point and concise overview.
- `USAGE.md`: command-level operations and runtime behavior.
- `AGENTS.MD`: API test creation/update standards.
- `PROJECTVISIONS.md`: principles and roadmap only.
