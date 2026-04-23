# API Validation Checklist

## Purpose

Use this checklist when creating or upgrading API tests beyond basic "status is 200" checks.

This is the reference for incremental API test hardening in this repository.

## Scope and Placement

Default placement for these validations:

- Put endpoint-level checks in `api/tests/<role>/<feature>/` feature specs.
- Keep API E2E (`api/tests/e2e/`) for cross-role workflow and state-transition checks.
- Do not move endpoint contract checks into long workflow specs unless the behavior only exists in workflow context.

## Validation Categories

### 1) API Response Contract

- Status and transport gate are explicit (`httpStatus`, `httpOk`, `ok`).
- Required fields exist.
- Field types are explicit (`string`, `number`, `array`, `object`).
- Nullable vs required behavior is validated.
- Response structure drift is detected for critical nodes.

### 2) Schema and Structure

- Response path matches expected JSON shape.
- Arrays are validated as arrays and objects as objects.
- Nested fields are asserted at the correct path.
- Enum-like fields are validated against allowed values when known.

### 3) Business Logic

- Returned values are validated for correctness, not only presence.
- Create/update effects are verified through follow-up reads where relevant.
- Relationship integrity is verified (for example, create result vs detail query).
- Pagination/list invariants are checked when list endpoints are involved.

### 4) Error Handling

- Unauthorized and invalid-auth behavior covers transport and GraphQL error shapes.
- Invalid input fails with meaningful error payload.
- Error response structure and classification/code/message are consistent.

## Required Assertion Pattern

For GraphQL API tests:

1. Assert operation gate first (`ok` with `safeGraphQL`).
2. Assert explicit target node path.
3. Add secondary checks with `expect.soft(...)` for field/type/shape details.

## Idempotency Rule (Repo Policy)

- Do not implement idempotency checks by default.
- Only implement idempotency if the user prompt explicitly requests it, or the expected idempotency contract is already explicitly stated for that API.
- If idempotency could apply but expected behavior is not explicit, stop and ask the user before adding assertions.

## Incremental Upgrade Strategy

When enhancing old tests, apply these in order:

1. Contract gate + explicit node assertions.
2. Field/type/shape checks for critical output.
3. Error path hardening (no-auth, invalid-auth, invalid-input).
4. Relationship or list invariant checks where the endpoint behavior requires them.

Keep the change minimal and local to the target spec/query path.
