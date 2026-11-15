# Phase 2 — cleanup report

## Scope
Application demo records, identities, local mock authentication/persistence, fake model/policy outputs, preset evaluation scores, generated first-person narrative and default quotas were removed. No backend or HTTP transport was added. Authentication and mutations explicitly reject; saves/sign-ins are not fabricated.

Existing screens were consolidated from `c:\projects\internms\src-react` into `c:\projects\internms\src`. Legacy code was removed after active dependencies were replaced. Auth component casing was normalized and the drawer hook moved into `c:\projects\internms\src\hooks`. This is not a Phase 3 redesign.

## Validation
- 12 replacement empty-state/validation/source-boundary tests without demo identities.
- Production Vite build passes; main bundle approximately 374 kB.
- 35 smoke assertions: three local HTTP checks and 32 server-rendered empty screens. Not browser interaction/accessibility certification.
- `npm.cmd run lint` attempted: missing script/tool; no linter installed.
- No typecheck configuration exists.
- Git whitespace check passed at reconciliation.

The ignored `c:\projects\internms\.validation` contains captured child-process exit codes and logs. IDE shell completion capture is unreliable; the runner records actual process status.

## Forced fixes
- Fresh empty collections replace fixture-dependent initialization.
- Explicit unavailable errors replace local saves and authentication.
- Removed fixture-derived checklist, coursework, profile defaults and policy/model simulations.
- Narrative text remains in form state only, with unsaved notice; no generated personal testimony or autosave.
- Removed unreachable training fallback and unused imports.
- Incomplete evaluations have no score rather than preselected perfect ratings.
- Invalid attendance times no longer manufacture credited hours.
- HTML entry and Tailwind scanning updated after source consolidation.
- Missing catalog/settings safely render unavailable/[PLACEHOLDER] content.
- Public auth submissions disabled; unverified support email links removed.
- Messaging error feedback and stale sign-out copy corrected.

## File report
`c:\projects\internms\docs\phase-2-file-changes.json` enumerates individual absolute paths, including browser-profile artifacts and move destinations.

Deleted groups: seed database; prototype Node server; legacy entry/styles/modules; mock auth; premature Laravel adapter; browser repository mutations; simulated decision engines; unrouted Dashboard/ModuleView; six unimported student stylesheets; all 18 former tests/runners; historical screenshots/browser profiles/logs/process snapshots; old generated bundles.

The former tests used seeded/injected identities or machine-specific tooling. Replacement tests use empty collections and validation inputs only.

## Dependencies/configuration
No packages installed and no versions changed. No direct dependency was proven unused. Build tools moved to devDependencies with corresponding lockfile classification updates. React/React DOM remain runtime dependencies. Added test:smoke script.

Added `c:\projects\internms\.gitignore`. Updated `.env` and `.env.example` to remove obsolete mock/backend settings. No frontend environment variables are currently required; API/Google settings await the Phase 4 contract.

`.gitignore` does not untrack committed files. Existing tracked node_modules and generated dist remain repository-hygiene decisions; no blanket index rewrite or commit was performed. Verification changes to tracked dependency cache were restored.

## Retained for review
- `c:\projects\internms\MIGRATION-CHECKLIST.md` and five root `STUDENT-*-VERIFICATION.md` documents: substantive history, restored after an overly broad deletion and marked historical. They contain old demo descriptions, not active fixtures. No claim that every historical mention was erased.
- `c:\projects\internms\design-system\internms\MASTER.md` and `c:\projects\internms\.taste-skill\direction.json`: prior references, not an approved Phase 3 system.
- `c:\projects\internms\.vscode`: existing editor settings.
- Root logo/seal/favicon variants: uncertain future institutional use; active SVG retained.
- Existing rubric, validation bounds, statuses, and input-format examples: workflow definitions rather than personal records. Institutional correctness still requires review.
- Existing large JSX/layout issues: redesign is deferred to Phase 3.

## Limitations
Protected screens cannot be signed into until real authentication exists. They remain in source and are tested with empty props; no in-app preview identity was introduced. Google sign-in and host authentication are not implemented.

No uploaded document bytes exist to migrate. Old session storage is not read, but unrelated browser profiles are not accessed; clear site data manually if desired.

Lint remains unconfigured. Historical documentation/assets above remain review exceptions. This is not a production-readiness certification.

## Boundary disclosure
An initial npm lint attempt wrote npm's standard diagnostic log to its default user cache outside the project. Later attempts redirect cache settings into the project and disable npm diagnostic logs. No outside backend was accessed. The external log was not deleted because that would be another outside-project change.

Stop at Phase 2. No Phase 3 or Phase 4 implementation is authorized by this report.
