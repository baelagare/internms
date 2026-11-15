# Phase 3 — Host Company Representative Messages

## Summary
Redesigned the Host Company Representative's Messages view (`src/views/Messages.jsx`) with company-scoped contact subtitles, responsive two-pane contact/thread layout, explicit backend-unavailable status banners, and honest empty states when no company interns are assigned.

## Changes
- Added role-specific subtitles: for host representatives (`supervisor`), displays `"Conversations with interns and coordinators assigned to your company."`
- Added an always-visible status banner explaining: `"Messages are read-only until the backend is connected. Sending is unavailable until the backend is connected. Real-time message exchange will become available in Phase 4."`
- Preserved contact scoping in `contactsFor`: host company representatives can converse only with assigned interns, their college coordinators, and system administrators.
- Added company-specific empty state: when no contacts exist for the representative, explains `"Contacts will appear when interns or college coordinators are assigned to your company."`
- In the active message thread, preserves the responsive composer, live chat log, and character limit with honest disabled send actions.
- Added unit tests in `tests/messages.test.js` covering host representative subtitle, company scope, and empty state guidance.
- Verified `Messages supervisor` smoke assertion passes in `scripts/smoke.mjs`.

## Validation
- Tests: 98 passed, 0 failed across all unit test suites.
- Production build: passed.
- Host Messages smoke assertion: passed (`Messages supervisor: True`).
- Lint: not configured.

## Scope & Role Completion Note
With Host Company Representative Messages complete, all 6 Host Company Representative modules are finished:
1. Host Dashboard (`docs/PHASE-3-HOST-DASHBOARD.md`)
2. Host Interns (`docs/PHASE-3-HOST-INTERNS.md`)
3. Host Approvals (`docs/PHASE-3-HOST-APPROVALS.md`)
4. Host Postings (`docs/PHASE-3-HOST-POSTINGS.md`)
5. Host Evaluations (`docs/PHASE-3-HOST-EVALUATIONS.md`)
6. Host Messages (`docs/PHASE-3-HOST-MESSAGES.md`)