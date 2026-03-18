# API E2E Workflows

This directory contains cross-role API workflow tests.

- `shared/queries/` contains reusable workflow GraphQL operations.
- `shared/steps/` contains reusable actor-based workflow actions.
- `deliverx/`, `pabili/`, and `findMyMeds/` contain scenario definitions and specs.

Preferred pattern:

- keep long GraphQL operations in shared query files
- keep reusable actor transitions in shared step modules
- let workflow specs orchestrate the shared steps instead of repeating inline role login plus `safeGraphQL(...)`
