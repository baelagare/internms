# Student dashboard redesign

## Scope
Updated the active React/Vite student dashboard and shared application shell. Existing auth pages, student modules, workflow mutations, recommendation calculation, approved-hours calculation and role route allowlists are retained. The old student branch was extracted from RoleDashboard without redesigning management dashboards.

## Files
- src-react/App.jsx: academic-year context, accurate loading and retryable startup error state.
- src-react/components/Shell.jsx and shell.css: persistent 264px / 76px sidebar, sidebar-header toggle, navigation tooltips, compact top bar and explicit data-source notice.
- src-react/components/useDrawerAccessibility.js: inert background, scroll lock, focus containment/restoration, Escape and responsive cleanup.
- src-react/components/Icons.jsx: matching outline document, placement, clearance and panel controls.
- src-react/views/RoleDashboard.jsx: delegates student rendering to the dedicated dashboard.
- src-react/views/StudentDashboard.jsx and studentDashboard.css: summary cards, six-stage tracker, placement, evaluation, full advisory details and stored policy excerpts.
- src-react/services/studentDashboard.js: tested presentation model reusing approvedHours; distinguishes missing records from known zero values and prioritizes student IDs over name fallback.
- tests/studentDashboard.test.js: five dashboard regressions.
- tests/dashboard-browser.mjs and validate-dashboard.mjs: repeatable browser/build validation.

## Verified
- Fresh Vite production build: exit 0.
- Node tests: 35 passed, 0 failed.
- Browser: 15 checks passed, no collected console errors.
- No horizontal overflow at 1440, 1024, 768, 390 or 320 CSS pixels.
- Sidebar collapse/expand changes content margin, persists across reload and retains accessible navigation.
- Mobile drawer focuses Close, traps Tab, makes background inert, locks scroll, closes on backdrop/Escape/navigation and restores focus.
- Evaluation modal and full attendance notice remain available.
- All allowed routes rendered for student, coordinator, supervisor and administrator.
- Cross-role route guard and logout verified.

Logs/screenshots: browser-results/dashboard-validation.json, dashboard-build.log, dashboard-unit.log, dashboard-browser.json and dashboard-{width}.png.

## Existing integration limitations
- Laravel can authenticate accounts, but application records still use browser session storage in both auth modes. No production dashboard API was added or implied.
- Uploaded documents retain metadata only.
- Placement recommendations use the existing local similarity algorithm, not a live SBERT endpoint. Scores are not internship-success probabilities.
- Advisory evidence, text and corpus references remain stored records; no live RAG service or policy authenticity verification was introduced.
- Browser testing used seeded local sessions. Live Laravel deployment, real assistive-technology testing and browser-native zoom testing remain release checks. Responsive CSS viewport checks are not a substitute for those checks.
- No lint command is configured in package.json.
