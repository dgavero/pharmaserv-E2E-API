# Test Layer Map

## Purpose

This repository has multiple test layers with different responsibilities. Place code in the correct layer to avoid duplicated logic, fragile tests, and broken abstractions.

## 1. API Feature Tests

Location:

- `api/tests/<role>/<feature>/`

Examples:

- `api/tests/patient/ordering/`
- `api/tests/admin/riderManagement/`
- `api/tests/pharmacy/profile/`

Use this layer for:

- a single API feature or endpoint behavior
- happy path and negative auth coverage
- small create/update/read/delete validations
- feature-level GraphQL assertions

Put in this layer:

- role-specific specs
- sibling query files
- local feature builders if reuse is limited to that feature

Do not put in this layer:

- long multi-role workflows
- merchant UI logic
- shared cross-role orchestration helpers

## 2. API Workflow Tests

Location:

- `api/tests/e2e/`

Examples:

- `api/tests/e2e/deliverx/`
- `api/tests/e2e/findMyMeds/`
- `api/tests/e2e/pabili/`

Shared workflow support:

- `api/tests/e2e/shared/queries/`
- `api/tests/e2e/shared/steps/`

Use this layer for:

- API-only end-to-end business workflows
- cross-role state transitions without UI
- workflow reuse for patient/admin/pharmacist/rider actors

Put in this layer:

- workflow specs
- shared workflow step functions
- shared workflow GraphQL docs

Do not put in this layer:

- merchant UI operations
- page-object behavior
- selector logic

## 3. Hybrid Merchant UI/API Tests

Location:

- `e2e/tests/merchantPortal/`

Examples:

- `DeliverXFlow.spec.js`
- `FindMyMedsFlow.spec.js`
- `PabiliFlow.spec.js`

Use this layer for:

- workflows where merchant operations must happen in UI
- patient/admin/rider/pharmacist continuation through API
- final merchant portal verification in UI
- approved merchant-portal behavior that mirrors existing API workflows without moving merchant actions back to API

Put in this layer:

- spec-level orchestration only
- flow tags and summary comments
- calls into page objects and role action modules

Do not put in this layer:

- long inline API chains if a role action module already exists
- duplicated order search/open/status logic
- raw selector strings for shared merchant UI elements
- merchant operational shortcuts that bypass the page objects

## 4. Page Objects

Location:

- `e2e/pages/merchantPortal/`

Use page objects for:

- merchant UI interaction logic
- page navigation
- state transitions on merchant screens
- status verification in details and tabs
- exact booking-reference search/open behavior

Current examples:

- `merchantPortalLogin.page.js`
- `merchantOrders.page.js`
- `merchantOrderDetails.page.js`

Do not put in page objects:

- patient/admin/rider API orchestration
- environment bootstrapping
- cross-project shared config

## 5. Hybrid Action Modules

Location:

- `e2e/tests/merchantPortal/actions/`

Use action modules for:

- patient/admin/rider API actions used by hybrid merchant tests
- hybrid flow adapters between merchant UI and shared API steps
- hybrid-only glue code that should not live in page objects

Current examples:

- `patientActions.js`
- `adminActions.js`
- `riderActions.js`

Do not put in action modules:

- merchant UI selectors
- page navigation logic
- generic Playwright helper behavior

## 6. Selector Layer

Location:

- `e2e/selectors/merchant.selectors.json`
- `e2e/helpers/selectors.js`

Use this layer for:

- centralized merchant selector definitions
- selector template strings
- selector lookup/resolution

Do not put in this layer:

- workflow logic
- retries
- business assertions

## 7. Shared Helpers

API shared helpers:

- `api/helpers/`

UI shared helpers:

- `e2e/helpers/`

Cross-project shared helpers:

- `helpers/`

Use shared helpers for:

- common request wrappers
- auth helpers
- safe UI action wrappers
- cross-test utilities like random data or reporting
- shared API workflow helpers used by API-only workflow tests

Do not put in shared helpers:

- feature-specific assertions
- one-off spec behavior
- merchant page-specific selectors or actions

## Placement Rules Summary

If the code is about a single API feature:

- put it in `api/tests/<role>/<feature>/`

If the code is about a multi-role API-only workflow:

- put it in `api/tests/e2e/`

If the code is about merchant UI steps:

- put it in `e2e/pages/merchantPortal/`

If the code is about hybrid patient/admin/rider API orchestration for merchant tests:

- put it in `e2e/tests/merchantPortal/actions/`

If the code is a reusable merchant selector:

- put it in `e2e/selectors/merchant.selectors.json`

If the code affects all tests:

- it is probably in a fragile shared area and should be treated as approval-required

If the code affects merchant order search, pricing, quote, branch assignment, or final status verification:

- it probably belongs in a merchant page object and is high-risk
