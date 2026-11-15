# Phase 3 — Coordinator Approvals

## Summary
Updated the coordinator presentation of the existing shared approvals workflow. The existing host representative approval presentation and review action logic remain intact.

## Changes
- Added a coordinator-specific heading and short explanation of the supervisor-verification/coordinator-review stages.
- Added record-derived counts for needs review, approved/verified, and returned records.
- Improved coordinator table naming and empty-state wording while retaining category/status filters and detail review dialog.
- Added responsive token-based styles in `src/views/approvals.css`.
- Added tests for college scope, stage-specific review eligibility, summary landmarks, and a coordinator smoke assertion.

## Validation
- Tests: 68 passed.
- Production build: passed.
- Smoke checks: 44/44 passed (server render/runtime, not browser interaction).
- Lint: not configured.

## Caveats
- No backend actions are available; decisions fail with an honest unavailable-service message.
- Document records show metadata only where file bytes are not available.
- Summary counts follow current status strings and should be checked against finalized institutional workflow definitions.
