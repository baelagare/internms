# Phase 3 — Student Dashboard

## Scope
Student Dashboard only. Existing routes and backend-disconnected boundary remain unchanged. No packages, configuration edits, API requests, authentication bypasses or demo identities added. Design uses the approved ui-ux-pro-max-based token system.

## Changes
- Replaced the repeated metrics/six-step milestone layout with one conditional action, internship overview, and coordinator advisories.
- Documents, recorded hours, placement and evaluation each have a short summary and relevant navigation/detail action.
- Missing student identity/source renders an unavailable screen, not invented zero progress or a suggested profile task.
- Missing collections remain unavailable; an explicitly empty collection can show zero recorded activity or no records. Unknown quota/checklist requirements never become a fabricated percentage or completion claim.
- Existing credited stages (Approved, Supervisor Verified, Coordinator Approved) are preserved and explained. Invalid credited hour values produce unknown totals.
- The next action is based on returned/missing assigned documents, recorded unplaced status with a verified checklist, or approved deployment. It does not establish eligibility or invent deadlines.
- Only exact Dispatched advisories with final text are shown. Draft, dismissed, not-dispatched and other-owner records are excluded. Message details use native disclosure.
- Existing evaluation preview/print is preserved; no new clearance or rubric rules.
- Removed unused local matching call and six-step progress calculation. Shared checklist verification counts remain unchanged.
- Scoped CSS: single column on narrow screens, two columns from 640px; wrapping for long content, semantic focus colors and 44px navigation/disclosure targets.

## Files touched
- c:\projects\internms\src\views\StudentDashboard.jsx
- c:\projects\internms\src\views\studentDashboard.css (created)
- c:\projects\internms\src\services\studentDashboard.js
- c:\projects\internms\tests\dashboard.test.js (created)
- c:\projects\internms\scripts\smoke.mjs
- c:\projects\internms\scripts\validate.mjs
- c:\projects\internms\docs\PHASE-3-STUDENT-DASHBOARD.md (created)

Generated build/ignored validation artifacts were refreshed. The one-off source-replacement helper deleted itself after use.

## Validation and limitations
Run the validation runner at c:\projects\internms\scripts\validate.mjs. It records tests, build, smoke and missing-lint status under c:\projects\internms\.validation.

Dashboard-specific tests cover missing records, owner isolation, invalid hour values, existing credit statuses, requirement-driven actions, advisory publication and recorded clearance. Tests use opaque ownership keys and minimal validation inputs, not account fixtures or an in-app preview session. Smoke coverage includes dashboard loading, error/retry, missing source and empty data renders.

Real browser viewport, keyboard, modal/print and screen-reader checks are not verified in this module. No claim of WCAG certification or a fresh visual click-through is made. The existing protected dashboard cannot be entered through real login until Phase 4; no bypass was added.

Loading/error props are presentation states only, not wired to invented endpoints. Existing evaluation ordering, hour-credit semantics and profile-supplied document assignment still need the approved Phase 4 contract and institutional review. This frontend ownership filtering is not server authorization.

Lint remains unavailable because no lint script/tool is configured. Stop at this gate: Student Profile requires explicit approval.
