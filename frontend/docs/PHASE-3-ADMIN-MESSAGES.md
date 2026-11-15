# Phase 3 — Admin Messages

## Summary
Completed the Admin Messages module on the shared messaging screen. The admin path now presents a university-wide directory overview (coordinator, host representative, and student counts derived from permitted contacts), admin-specific empty-state guidance, and a de-duplicated backend availability notice. No messages are fabricated; sending remains unavailable until Phase 4.

## Changes
- `src/views/Messages.jsx`
  - Admin-only "Messages directory" overview strip with counts by contact role.
  - Admin empty state: "Contacts appear when other staff or student accounts are recorded."
  - Removed the duplicated sending-unavailable sentence from the banner (the composer note still states it once).
- `src/views/messages.css`
  - Added responsive `.messages-directory` strip (three columns from 640px).
- `tests/messages.test.js`
  - Added admin contact-scope test (every recorded account except the admin) and admin directory/empty-state assertions.
- `scripts/smoke.mjs` — added admin Messages landmark assertions.

## Access-policy note
`contactsFor` gives admins every recorded staff and student account. This breadth was preserved, not widened; confirm the policy during Phase 4 authorization design.

## Limitations
- Message delivery and persistence are unavailable until the Phase 4 backend is connected.
