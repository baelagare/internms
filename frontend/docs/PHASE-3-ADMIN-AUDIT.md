# Phase 3 — Admin Audit Trail

## Summary
Redesigned the admin-only audit trail (`Audit` in `src/views/Governance.jsx`) into a review-focused view: plain-language event labels, summary metrics, college and event-type filters, a structured detail dialog, and honest non-authoritative availability notices. No new events, records, or timestamps are invented.

## Changes
- `src/views/Governance.jsx`
  - Replaced raw `Object.entries` detail rendering with a labeled definition list; raw fields remain available behind a "Show raw event fields" disclosure.
  - Mapped known internal event keys to plain labels: `CLEARANCE_GRANTED` → "Clearance granted", `ALERT_DISMISSED` → "Alert dismissed", `POLICY_CREATED` → "Policy clause added"; unknown keys render as readable text, never as internal codes.
  - Guarded missing `auditLogs`/`collegeSettings` collections with an unavailable notice instead of a crash.
  - Added a summary strip (recorded events, event types, colleges recorded) shown only when events exist.
  - Distinct empty states: "No audit events recorded yet" vs. "No events match" when filters are active.
  - The export action is labeled "Export filtered events" and only appears when events exist.
- `src/views/audit.css` (new) — responsive summary, filters, detail grid, and raw-field disclosure styling using design tokens.
- `tests/audit.test.js` (new) — asserts plain labels, collection guards, honest notices/empty states, and the removal of raw field-name rendering.
- `scripts/validate.mjs` — added `tests/audit.test.js`.
- `scripts/smoke.mjs` — added admin Audit landmark assertions.

## Limitations
- Events shown are workspace-recorded events only; they are not authoritative institutional audit records until the Phase 4 backend is connected.
