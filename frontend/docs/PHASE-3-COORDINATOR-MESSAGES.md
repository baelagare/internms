# Phase 3 — Coordinator Messages

## Summary
Completed the Coordinator Messages module using the shared responsive conversation screen. Contact selection continues to use `contactsFor`; no permissions or access policy were changed.

## Changes
- Coordinator-facing subtitle now clarifies that contacts are those permitted for their college.
- Added an always-visible coordinator notice explaining messages are read-only until Phase 4, including when no contact is available.
- Existing search, selected conversation, mobile back navigation, visible send error feedback, and responsive desktop/mobile layout remain.
- Added a targeted test and smoke assertion.

## Validation
- Tests: 83 passed.
- Build: passed.
- Coordinator Messages smoke assertion: passed. Broader suite failures remain for Coordinator Dashboard, Coordinator Placement, Coordinator Settings, and Messages for student/supervisor/admin.
- Lint: not configured.

## Access note
`contactsFor` presently permits a coordinator to contact all host representatives and admins, as well as their scoped students. This module preserves that existing behavior; verify the intended policy before altering it.
