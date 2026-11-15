# Phase 3 — Student Checklist

## Scope
Student Checklist only. Existing routes and backend-disconnected boundary remain unchanged. No packages, configuration edits, API requests, authentication bypasses or demo identities added. Design uses the approved ui-ux-pro-max-based token system.

## Changes
- **Pre-deployment Checklist Presentation:**
  - Redesigned the checklist header with clear title, subtitle, and verification count badge (`{summary.verified} of {summary.total} verified`).
  - Added a conditional primary action button ("Upload next requirement" or "Fix {title}") that directs the student directly to the next actionable document.
  - Replaced legacy alert box with accessible `Notice tone="success"`.
- **Honest Empty and Unavailable States:**
  - If `preDeploymentDocs` is missing/null, renders `EmptyState` explaining that requirements could not be loaded.
  - If the collection is empty, renders `EmptyState` explaining that requirements have not yet been assigned by the coordinator.
- **Progress Overview Card:**
  - Clean card displaying verified document count, percentage, and accessible `ProgressBar`.
  - Scannable status breakdown: `{summary.attention} need changes`, `{summary.missing} not uploaded`, and `{summary.pending} waiting for coordinator review`.
- **Search & Status Filtering:**
  - `SearchField` with clear button for searching by document title, code, or issuer.
  - Accessible status filter dropdown (`ds-control`) with 44px minimum height.
  - Clean pagination for larger document lists.
- **Document List Items (`DocumentItem`):**
  - Subtle rounded icon container (`bg-accent-subtle text-accent`).
  - Clear heading with title and code.
  - `StatusBadge` strictly mapped via `resolveStatus` (*Verified* [success], *Pending Verification* [warning], *Returned for Revision* [danger], *Not Uploaded* [neutral]).
  - Accessible action buttons: "Details" (secondary) and "Upload file" / "Replace file" (primary/secondary with 44px min touch target).
  - Revision instructions: Rendered in an accessible `<details>` panel styled with `border-danger bg-danger-surface text-danger`, automatically open when changes are requested.
- **Dialogs & Metadata Distinction (`StudentChecklistDialogs.jsx`):**
  - **`DocumentUpload`:** File picker with file type restrictions (`.pdf, .png, .jpg, .jpeg`), selected file size in KB, error alerts, and Cancel/Submit buttons.
  - **`DocumentRecord`:** Structured definition list of file metadata (code, issuer, filename, size, reviewer, remarks), with a prominent disclaimer: *"Document metadata view. Original file contents are not stored in browser session."*

## Files touched
- `src/views/StudentChecklist.jsx` (redesigned)
- `src/views/StudentChecklistDialogs.jsx` (redesigned)
- `src/services/studentChecklist.js` (refactored to use unified `resolveStatus`, hardened summary & filtering)
- `tests/checklist.test.js` (created)
- `scripts/smoke.mjs` (added checklist landmarks assertions)
- `scripts/validate.mjs` (included `checklist.test.js` in validation suite)
- `docs/PHASE-3-STUDENT-CHECKLIST.md` (created)

## Validation results
- **40 unit & contract tests passing** (including 5 new tests in `tests/checklist.test.js`).
- **Production build passed with 0 warnings** (Vite build in ~3.5s; 361.98 kB JS · 46.49 kB CSS).
- **44/44 runtime smoke checks passing** (including explicit assertions verifying checklist landmarks).
- `git diff --check` passed cleanly.
