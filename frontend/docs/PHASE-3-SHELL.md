# Phase 3 — shared layout shell

## Scope
Shared chrome only. No role module, authentication, API, package, or configuration changes. Design follows the approved ui-ux-pro-max-based neutral/blue foundation.

- 248px desktop sidebar, 72px collapsed rail; desktop starts at 1024px.
- Below 1024px, navigation becomes a modal drawer. Closed drawer is hidden/inert; open drawer makes content and student bottom navigation inert, locks body scrolling, contains Tab focus, dismisses with Escape/backdrop/close, and restores the trigger on dismissal.
- Resize to desktop releases modality without restoring focus to a hidden mobile trigger.
- Route transitions close the drawer, focus the main landmark, and update the document title.
- Existing role routes are preserved. Student bottom navigation retains Home, Attendance, Tasks, Messages and More. Host role label is now “Host company representative”; internal supervisor route key is unchanged.
- Missing name displays “Account unavailable” with a neutral user icon; no invented identity or counts. No unknown academic year is filled in.
- Semantic color/type tokens, visible focus, 44px minimum controls, 12px minimum metadata, reduced motion, safe-area bottom spacing, and 1200px content width.
- Actual shell access remains protected: no preview identity or bypass was added.

## Files
Edited:
- c:\projects\internms\src\components\Shell.jsx
- c:\projects\internms\src\components\shell.css
- c:\projects\internms\src\hooks\useDrawerAccessibility.js
- c:\projects\internms\scripts\smoke.mjs
- c:\projects\internms\scripts\validate.mjs

Created:
- c:\projects\internms\src\hooks\navigationDrawer.js
- c:\projects\internms\tests\shell.test.js
- c:\projects\internms\docs\PHASE-3-SHELL.md

Production output under c:\projects\internms\dist and ignored validation outputs were regenerated. Earlier phase changes remain in the working tree; this module does not commit or revert them.

## Validation
21 unit/contract tests and 40 local HTTP/server-render checks passed. Drawer tests use a minimal DOM contract, not a real browser. Smoke checks assert exact menu/route allowlist agreement, correct student-only bottom navigation, missing-account rendering and no invalid-role links. Build passed with no warnings. Lint remains blocked by the preexisting absence of a lint script/tool; no package was installed.

No claim of browser viewport, touch, screen-reader or full WCAG certification is made. Visual viewport and native keyboard checks remain needed. No accounts exist to enter protected routes; server rendering is not a replacement for browser review.

Stop here. Student Dashboard is the next module and requires explicit approval.
