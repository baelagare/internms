# Phase 3 — Admin Staff

## Summary
Redesigned the admin-only Staff accounts screen (`Staff` in `src/views/Management.jsx`). The directory now shows human role labels and invitation status instead of raw tokens, and the create-account form matches the approved authentication direction: institutional Google sign-in for coordinators (no password) and email/password for host company representatives. Scope selection is guided by recorded data instead of free-text recall.

## Changes
- `src/views/Management.jsx`
  - Added a staff overview strip (OJT coordinators, host representatives) scoped to the active college filter.
  - Role column maps internal keys to "Administrator", "OJT coordinator", "Host company representative".
  - Invitation column shows "Token issued" / "Not issued" instead of displaying raw token values.
  - New `StaffAccountForm`: role selection with plain labels, SSO/password guidance per role, initial password only for host representatives, and college/partner selects driven by recorded data (with a hint when no partners exist yet).
  - Guarded missing `users`/`htes` collections; distinct empty states for unscoped vs. scoped views.
- `src/views/staff.css` (new) — responsive overview strip using design tokens.
- `tests/adminStaff.test.js` (new) — role labels, invitation status, auth-direction wording, and collection guards.
- `scripts/validate.mjs` — added `tests/adminStaff.test.js`.
- `scripts/smoke.mjs` — added admin Staff landmark assertions.

## Limitations
- Creating staff accounts cannot be saved until the Phase 4 backend is connected; the form surfaces the unavailable-save notice. Login ID uniqueness and SSO provisioning behavior are backend concerns.
