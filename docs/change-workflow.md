# Change Workflow

## Purpose

Use this workflow before making code changes in this repository. It applies to both AI agents and human contributors. The goal is conservative, low-risk changes that fit the existing architecture.

This file is intentionally procedural. For hard rules, use `AGENTS.md`. For code-shape rules, use `docs/coding-standards.md`.

## Step 1: Understand the Request

Classify what is being asked:

- add a new API feature test
- update an existing API feature test
- add or update an API workflow test
- add or update a merchant UI test
- add or update a hybrid merchant UI/API workflow
- change shared infrastructure or helper behavior
- change docs only

If the request is ambiguous, resolve the target layer before editing.

## Step 2: Classify the Domain and Role

Identify the affected role and domain:

- patient
- admin
- rider
- pharmacist
- merchant portal

Then identify the target abstraction:

- spec
- query file
- builder
- step/action helper
- page object
- selector JSON
- shared harness/config

## Step 3: Check Architecture First

Read the minimum architecture context before touching code:

1. `AGENTS.md`
2. `docs/architecture.md`
3. `docs/test-layer-map.md`
4. the nearest existing files in the same folder

Questions to answer:

- Which project owns this test: `api` or `e2e`?
- Is this a feature test or a multi-step workflow?
- Does a shared helper or page object already handle this behavior?
- Does this area already have a query file?
- Is this an approval-required area?

## Step 4: Check Local Patterns

Read the local neighboring files before writing code.

For API work:

- target spec
- sibling query file
- nearby feature specs

For merchant work:

- target spec
- relevant page object
- relevant action module
- relevant selector entries
- if selectors are involved, inspect the current DOM before deciding what to use

Do not assume the whole repo is uniform. Match the local dominant pattern unless there is a strong reason not to.

## Step 5: Identify Risks

Before editing, explicitly check:

- does the change touch a shared helper?
- does it rely on env-specific IDs?
- does it depend on reusable test records?
- does it depend on merchant branch selection?
- is the flow schedule-sensitive?
- does it affect selector stability?
- does it affect CI or reporting?
- does it require confirming selectors against the rendered UI?

If yes, treat the change as high-risk and keep the plan minimal.

If the change touches any approval-required area from `AGENTS.md`, do not proceed silently. Call out the blast radius first.

Approval rule for normal test work:

- If the user directly asks to create, fix, or investigate a specific test, treat that as approval for the minimal changes required in that test path.
- Do not extend that approval to unrelated shared infrastructure, broad helper behavior changes, CI/reporting changes, or refactors outside the requested test path.

## Step 6: Make a Minimal-Change Plan

Plan only the smallest set of edits needed.

Preferred order of reuse:

1. existing helper
2. existing query file
3. existing page object or action module
4. add a small local extension
5. only then add a new helper/module if reuse is insufficient

Avoid:

- opportunistic folder cleanup
- renaming unrelated variables
- moving code across layers unless necessary

## Step 7: Implement Conservatively

### API Changes

- use `api/globalConfig.api.js`
- use `safeGraphQL`
- keep long queries in sibling query files when possible
- add only the assertions needed to verify behavior

### UI / Hybrid Changes

- use `e2e/globalConfig.ui.js`
- keep merchant actions in page objects
- keep non-merchant API orchestration in action modules
- use safe UI helpers and timeout constants
- preserve merchant UI-only rules for merchant operations
- if selectors are added or changed, inspect the rendered DOM and choose the most stable currently exposed signal instead of assuming locator shape

### Shared Area Changes

If the change touches shared harnesses, selectors, workflow actions, CI, or reporting:

- verify it is explicitly requested
- explain likely blast radius
- keep the change extremely narrow

For hybrid merchant changes:

- verify whether the behavior belongs in a page object, action module, selector JSON, or spec
- preserve merchant UI-only actions
- preserve active-branch binding and final status verification behavior

## Step 8: Self-Review the Diff

Before finishing, review for:

- wrong test layer placement
- duplicated selector logic
- inline GraphQL added where a query file exists
- generic variable naming
- new hard waits
- new env assumptions
- accidental shared helper/config changes
- unrelated cleanup in the same diff

## Step 9: Validate

Validation should match scope.

Small spec-only changes:

- validate by reading the final code path carefully
- run the narrowest relevant test if practical

Shared/helper changes:

- run the narrowest set of affected tests
- mention what was not validated if full verification was not possible

High-risk hybrid changes:

- review the full actor sequence in order
- check branch selection, quote/payment flow, rider assignment, and final merchant verification explicitly
- if selector-related, confirm the chosen selector against the actual DOM before closing the task

## Step 10: Close Out Clearly

When reporting the change:

- summarize what changed
- mention any assumptions
- mention any mixed local conventions you preserved
- mention validation performed or not performed
