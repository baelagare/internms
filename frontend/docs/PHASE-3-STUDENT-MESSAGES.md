# Phase 3 — Student Messages

## Summary
Redesigned `src/views/Messages.jsx` with a responsive desktop two-pane layout and mobile contact/thread navigation. Contact discovery continues to use the existing `contactsFor` access filter; conversation messages remain filtered to the selected participant pair. Mutation feedback is visible, and sends remain honestly unavailable until the Phase 4 backend exists.

## Changes
- Replaced fixed viewport-height subtraction with flexible grid/flex layout and bounded content regions.
- Added accessible contact search, selected conversation state, mobile Back to contacts control, labeled composer, polite live log, and explicit backend-unavailable guidance.
- Updated role wording to “Host company representative.”
- Added token-based responsive styling in `src/views/messages.css`.
- Added tests for role contacts and responsive layout; added smoke assertion.

## Validation
- Tests: 61 passed.
- Build: passed, 358.20 kB JS / 52.13 kB CSS (uncompressed).
- Smoke: 44/44 passed (server-render/runtime checks; not a browser interaction test).
- Lint: not configured.

## Access policy note
The existing `contactsFor` policy allows all coordinators to contact host representatives and all supervisors to contact coordinators. This screen intentionally preserves that behavior. Confirm whether these broad staff contacts are intended before any access-policy change.
