# Prompt Templates

Use these templates when asking an AI agent to create or update tests in this repository.

They are intentionally generic. Replace the placeholders with the actual test request.

## How To Use These Templates

- Fill in the target behavior, layer, role, and files to mirror.
- Add repo-specific requirements for the task.
- Keep the governance section intact so the agent must follow the repo workflow before editing.

## Generic Test Creation Template

```text
Create a new test in this repository.

Task:
- Add a [test type: API feature test / API workflow test / hybrid merchant UI+API test / UI test]
- Behavior under test: [describe the behavior]
- Role/domain: [patient / admin / rider / pharmacist / merchant / other]
- Preferred target location: [folder or file path, if known]

Requirements:
- Follow AGENTS.md and docs/* exactly.
- Respect the current repository architecture and local conventions.
- Reuse existing patterns from these files when relevant:
  - [reference file 1]
  - [reference file 2]
  - [reference file 3]
- Keep the change minimal.
- Do not refactor unrelated code.
- Do not touch approval-required areas unless necessary; if they are required, stop and tell me first.
- If GraphQL is needed, place operations in the correct sibling query file instead of inlining long queries in the spec.
- If merchant UI is involved, keep merchant actions in page objects and preserve hybrid merchant safeguards.
- Use `safeGraphQL`, `bearer`, `getGQLError`, role login helpers, and descriptive `*Res` variable names where applicable.
- Do not introduce new env vars, fixed IDs, or branch assumptions unless required and documented.
- Do not add raw hard waits if an existing safe wait or bounded retry can be used.

Behavior To Cover:
- Positive case: [describe]
- Negative case(s): [describe or say none]
- Setup/data needs: [env vars, builders, reusable IDs, branch/account assumptions, fixtures]
- Cleanup needs: [describe or say none]

Implementation Constraints:
- Query placement: [sibling query file / shared query module / not applicable]
- Page object requirements: [existing page object / new page object method / not applicable]
- Action/helper reuse requirements: [existing action/helper to reuse, if any]
- Selector requirements: [shared selector JSON / local existing selector / not applicable]
- Timeout/wait constraints: [any known constraints]

Validation:
- Run the narrowest relevant validation after changes.
- If full execution is not practical, explain what was not validated.

Mandatory Governance Before Editing:
1. Summarize the request in repository terms.
2. Identify the impacted files or folders.
3. Identify the main risks:
   - shared helper/config impact
   - env or fixed-ID coupling
   - selector or wait fragility
   - hybrid workflow risk
4. State whether approval is needed based on AGENTS.md.
5. Propose a minimal-change plan.
6. Implement only that plan.
7. Self-review the result against:
   - docs/change-workflow.md
   - docs/risk-checklist.md
   - docs/test-layer-map.md

Output Requirements:
- Before editing, show:
  - request summary
  - impacted files
  - risks
  - approval status
  - minimal-change plan
- After editing, show:
  - what changed
  - validation performed
  - assumptions or limitations
```

## Generic Test Update Template

```text
Update an existing test in this repository.

Task:
- Update this test or flow: [file path or behavior]
- Change requested: [describe the update]

Requirements:
- Follow AGENTS.md and docs/* exactly.
- Preserve the current architecture and local conventions in the touched area.
- Keep the diff as small as possible.
- Do not refactor unrelated code.
- Reuse existing helpers, query files, page objects, action modules, and selectors where applicable.
- If the change touches an approval-required area, stop and tell me first.
- If GraphQL is needed, place operations in the correct sibling query file instead of inlining long queries in the spec.
- If merchant UI is involved, keep merchant actions in page objects and preserve hybrid merchant safeguards.
- Use `safeGraphQL`, `bearer`, `getGQLError`, role login helpers, and descriptive `*Res` variable names where applicable.
- Do not introduce new env vars, fixed IDs, or branch assumptions unless required and documented.
- Do not add raw hard waits if an existing safe wait or bounded retry can be used.

Behavior To Preserve:
- [existing behavior that must not break]

Behavior To Change:
- [new or adjusted behavior]

Constraints:
- Layer: [API feature / API workflow / hybrid merchant / UI]
- Role/domain: [patient / admin / rider / pharmacist / merchant / other]
- Validation scope: [exact command or narrow scope if known]

Mandatory Governance Before Editing:
1. Summarize the request in repository terms.
2. Identify the impacted files or folders.
3. Identify the main risks.
4. State whether approval is needed based on AGENTS.md.
5. Propose a minimal-change plan.
6. Implement only that plan.
7. Self-review the result against:
   - docs/change-workflow.md
   - docs/risk-checklist.md
   - docs/test-layer-map.md

Output Requirements:
- Before editing, show:
  - request summary
  - impacted files
  - risks
  - approval status
  - minimal-change plan
- After editing, show:
  - what changed
  - validation performed
  - assumptions or limitations
```

## Always-Included Repo Rules

These rules are already embedded in the templates above and should remain there:

- `If GraphQL is needed, place operations in the correct sibling query file instead of inlining long queries in the spec.`
- `If merchant UI is involved, keep merchant actions in page objects and preserve hybrid merchant safeguards.`
- `Use safeGraphQL, bearer, getGQLError, role login helpers, and descriptive *Res variable names where applicable.`
- `Do not introduce new env vars, fixed IDs, or branch assumptions unless required and documented.`
- `Do not add raw hard waits if an existing safe wait or bounded retry can be used.`
