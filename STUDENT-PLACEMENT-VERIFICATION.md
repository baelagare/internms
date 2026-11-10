# Student Placement Management — implementation and verification

## Files

Created:
- `C:\projects\internms\src-react\views\StudentPlacement.jsx` — student workspace, overview, controls and confirmation workflow.
- `C:\projects\internms\src-react\views\StudentPlacementCards.jsx` — recommendation cards, score presentation, tags and eligibility details.
- `C:\projects\internms\src-react\views\studentPlacement.css` — scoped responsive styles matching completed student modules.
- `C:\projects\internms\src-react\services\studentPlacement.js` — presentation adapters; original engine results are not rescored.
- `C:\projects\internms\tests\studentPlacement.test.js` — twelve focused regression tests.
- `C:\projects\internms\tests\placement-browser.mjs` — browser integration/accessibility/responsive checks.
- `C:\projects\internms\STUDENT-PLACEMENT-VERIFICATION.md` — this report.

Modified:
- `C:\projects\internms\src-react\views\Placement.jsx` — dispatches students to the new workspace; existing staff view retained.
- `C:\projects\internms\src-react\services\placement.js` — rejects duplicate active preferences in the local transaction layer, not merely in button state.

No dependency, authentication, route, shared shell, Dashboard, My Profile, Checklist or recommendation-engine changes were made. Existing unrelated working-tree changes were retained.

## UI and behavior

- Proper page title and requested supporting description; one existing application-wide demonstration notice.
- Dedicated current-placement summary with actual host, role, location, supervisor, deployment date and recorded status. Identical preferred/assigned hosts are not repeated.
- Separate global readiness overview; college and capacity are explicitly host-specific rather than always-green checks.
- Compact ranked cards, original rank retained across sorting, native percentage progress bars, two-line description previews and keyboard-operable native details disclosures.
- Matched required-skill tags, amber development-gap tags and coursework tags retain engine strings and counts. Coursework matching is not claimed as verified completion.
- Host-specific eligibility details and visible unmet hard-gate warnings. Missing inputs are unconfirmed rather than green successes based on legacy fallbacks.
- Capacity shown as available slots and occupied/total counts, sourced from host records rather than defaulted ranking output. Missing capacity stays unknown; zero-capacity/default-rule discrepancies are disclosed.
- Recommended order remains the original eligible-first/descending-score ranking. Additional highest-match, lowest-match and organization-name sorts do not recalculate scores. Eligible and available-capacity filters compose with sorting and offer a resettable empty state.
- Existing assigned-host information remains visible above filtered lists. Assigned cards are labeled Current Placement with an explained disabled action.
- Unplaced students request a placement preference; pending requests are identified; deployed students can update their preference without changing deployment. Confirmation explains replacement of the one existing preference, no reserved slot, and coordinator review.
- Existing mutation lock, loading state, transaction-level eligibility recheck, persisted-state refresh and accessible failure feedback are reused. No withdrawal, rejection action, multi-application queue or automatic approval was invented.

## Verified engine and workflow semantics

`C:\projects\internms\src\services\sbertEngine.js` remains unchanged.

- The misleading historical function/model names do not indicate live SBERT: this is a local weighted concept/keyword-vector implementation.
- Its cosine helper rounds/clamps similarity (and has a zero-vector fallback). The final score blends that result at 52%, skill coverage at 36%, and coursework coverage at 12%; the existing blended rounding and 0.28–0.99 bounds remain intact. The UI calls the stored `cosineSimilarity` field **local blended similarity**, not raw cosine.
- Hard eligibility comprises college/program, GPA, disciplinary clearance and capacity. Checklist verification remains separate.
- Candidate hosts favor the student's college when those records exist. Ranking puts hard-eligible hosts first, then sorts descending by blended score.
- Seed scores are still 91, 74, 69, 59 and 28, with unchanged matching arrays and ranks.
- Requests save one preference. Existing deployed assignments are retained when students change preferences. Staff assignment, override reasons, occupied-capacity adjustments and audit behavior remain intact.

## Validation results

- `npm test` equivalent (`node --test tests/*.test.js`): **60 passed, 0 failed**. Evidence: `C:\projects\internms\placement-tests.log`.
- `npm run build` equivalent (Vite build): **passed**, 79 modules transformed. Evidence: `C:\projects\internms\placement-build.log`.
- Placement browser suite: **passed**, no console errors. Evidence: `C:\projects\internms\browser-results\placement-browser.json`.
- Existing Dashboard, Profile and Checklist browser regression suites: **passed**, no console errors in their result artifacts under `C:\projects\internms\browser-results`.
- Viewports **1440, 1024, 768, 390 and 320px**: no horizontal page/expanded-card/dialog overflow; student buttons, selects and disclosure summaries meet 44px minimum height. Full-page captures: `C:\projects\internms\browser-results\placement-1440.png`, `C:\projects\internms\browser-results\placement-1024.png`, `C:\projects\internms\browser-results\placement-768.png`, `C:\projects\internms\browser-results\placement-390.png`, `C:\projects\internms\browser-results\placement-320.png`.
- Browser checks include native Enter disclosure activation, modal keyboard containment, Escape/focus return, mobile navigation, actual scores/counts, combined sorting/filtering, saved deployed preference, pending unplaced request, persistence across reload, dashboard consistency, duplicate-action disabling, stale-capacity rejection and storage-failure non-commit.
- Missing skills/coursework/GPA/clearance/checklist/capacity, full hosts, failed recommendation calculation, empty filters/hosts, expired-session event and corrupted workspace retrieval were exercised.
- Unit coverage checks transaction-level duplicate rejection, scope guards, staff approval/capacity, exact original engine outputs, missing/invalid scores and local repository failures.
- Initial browser test failures were harness errors (Enter needed its native text payload; a selector counted skills across all cards). These were corrected and the full suite rerun successfully.
- No lint script/tool is configured. Repository-wide `git diff --check` reports an existing unrelated blank line at EOF in `C:\projects\internms\index.html`; that file was not changed for this task.

## Remaining production limitations

1. `C:\xampp\htdocs\internms-api\routes\api.php` exposes authentication routes only. Placement requests, assignments, audit records and capacity are still browser-session demonstration data, not server records. No placement-network API exists to test; existing auth expiry handling was exercised via its application event and existing auth-client tests.
2. The local transaction layer is the current workflow authority, **not a production security boundary**. Server-side authorization, transactional capacity locking and duplicate protection remain necessary when placement endpoints are implemented. The duplicate-current-assignment legacy no-op remains accepted by the service for compatibility; the student UI disables it.
3. Legacy fallback GPA/clearance/capacity and score-floor behavior remain in the untouched engine. Missing records are disclosed and not shown as confirmed eligibility; submissions still follow existing institutional/service rules rather than new UI-invented rules. Staff assignment preserves existing override/validation behavior and does not gain new eligibility restrictions.
4. No live SBERT inference is integrated. The component receives existing result fields without binding rendering to the misleading legacy model identifier, but a future service adapter and accurate algorithm description will still be required.
5. There is no implemented placement withdrawal, separate request history or rejection transition. Recorded status text is retained; no unsupported lifecycle has been added.
6. Native loading/error/auth states are retained. No synthetic delay was added just to display a spinner for synchronous local recommendations.
7. Browser checks use the existing local CDP helper installed at `C:\Users\Berto\.agents\skills\design-taste-frontend\scripts\lib\cdp.mjs` and Node 22+. This harness dependency is external to the repository, as with the existing student browser tests. No screen-reader audit, cross-browser matrix or live multi-user backend concurrency test was performed.

The frontend redesign is implemented and verified against the current application. End-to-end production deployment still depends on the backend work above.