# Phase 3 — Student Attendance

## Scope
Student Attendance only. Existing routes and backend-disconnected boundary remain unchanged. No packages, configuration edits, API requests, authentication bypasses or demo identities added. Design uses the approved ui-ux-pro-max-based token system.

## Changes
- **Live Time In / Out Card (Task First):**
  - Camera preview well styled with Phase 3A tokens (`border-line`, `bg-subtle`, `text-ink`).
  - Safe camera capture: verified video width and height are available before capturing canvas snapshot.
  - 4-Stage Daily Timeline (AM In, AM Out, PM In, PM Out) with clear active/completed/upcoming step indicators.
  - Single primary punch button with 44px min height displaying current target punch label and live PST time.
- **OJT Hours Summary Strip:**
  - Compact 4-column KPI grid on desktop (responsive 2-column on tablet, 1-column on mobile).
  - Approved OJT Hours with tabular numerals, quota display, and `ProgressBar`.
  - Remaining Hours, Queued for Review, and Assigned Host metrics.
  - Quota percentage displays honest status when curriculum quota is unassigned.
- **Daily Time Record (DTR) Table & Mobile Cards:**
  - Desktop view: Semantic `<table>` with uppercase headers, tabular hour values, status badge, and Details button.
  - Mobile view (<768px): Responsive card view displaying date, punch times in 4-column strip, hours, status badge, and full-width Details toggle. Eliminates narrow column wrapping and horizontal scrolling.
  - Summary bar displaying total logged, approved, and pending hours.
- **Attendance Adjustments (Time Fix Requests):**
  - Scannable list of submitted adjustment requests with status badge, requested hours, and schedule times.
  - Modal form for requesting a time fix with date picker, reason category dropdown, requested hours, AM/PM time fields, and explanation textarea with 44px touch targets.
- **Printable DTR Modal:**
  - Labeled as **DTR Preview** with clear notice that preview is based on system logs and an official Civil Service Form No. 48 template has not been supplied.
  - Uses filtered records matching the active reporting period.
  - Print letterhead, signature blocks, and print action button.

## Files touched
- `src/views/StudentAttendance.jsx` (redesigned)
- `src/views/studentAttendance.css` (created)
- `src/views/StudentAttendanceDtrModal.jsx` (redesigned)
- `src/services/studentAttendance.js` (refactored interval parsing and daily state)
- `tests/attendance.test.js` (created)
- `scripts/smoke.mjs` (added attendance landmark assertions)
- `scripts/validate.mjs` (included `attendance.test.js` in validation suite)
- `docs/PHASE-3-STUDENT-ATTENDANCE.md` (created)

## Validation results
- **52 unit & contract tests passing** (including 6 new tests in `tests/attendance.test.js`).
- **Production build passed with 0 warnings** (Vite build in ~15.5s; 361.38 kB JS · 49.21 kB CSS).
- **44/44 runtime smoke checks passing** (including explicit assertions verifying attendance landmarks).
- `git diff --check` passed cleanly.
