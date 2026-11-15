# Phase 3 — Admin Settings

## Summary
Completed the Admin Settings module on the shared college settings view (`Settings` in `src/views/Management.jsx`). The admin path now has university-level wording, a settings-coverage overview, and admin-appropriate guidance when a college has no saved settings. The grouped form, range validation, and backend-unavailable notice from the Coordinator Settings module are reused unchanged.

## Changes
- `src/views/Management.jsx`
  - Admin subtitles: "Review approved settings across all colleges." / "Review approved quotas and alert thresholds across all colleges."
  - New admin-only coverage strip: "Colleges with saved settings" vs. "Colleges in institution directory".
  - No-settings notice now says admins should "Provision approved values once they are confirmed by the institution" instead of asking an administrator.
- `src/views/settings.css` — responsive `.settings-summary` strip (two columns from 640px).
- `tests/adminSettings.test.js` (new) — university wording, coverage metrics, provisioning language, responsive styles.
- `scripts/validate.mjs` — added `tests/adminSettings.test.js`.
- `scripts/smoke.mjs` — added admin Settings landmark assertions.

## Limitations
- Settings saves remain unavailable until the Phase 4 backend is connected; the field ranges in `src/services/management.js` still require institutional confirmation.
