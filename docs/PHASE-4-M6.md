# Phase 4 — Milestone 6: Frontend Wiring & Integration

## Summary
Connected the React/Vite frontend to the Laravel API through a shared bearer-token transport and endpoint adapters while preserving the approved Phase 3 UI. Auth, workspace loading, supported mutations, and role-scoped messaging now use real API calls.

## Frontend integration
- `frontend/src/services/apiClient.js`
  - `VITE_API_BASE_URL` support with local Laravel default.
  - Sanctum bearer token in `sessionStorage`.
  - `/auth/login`, `/auth/google`, `/auth/supervisor-invite`, `/me`, `/workspace`, logout.
  - Unified API error parsing and 401 `internms:unauthorized` event.
- `frontend/src/services/workspaceAdapter.js`
  - Maps API field names/statuses to the existing presentation contract without fabricating records.
  - Preserves backend student profile IDs for resource endpoints.
- `frontend/src/services/applicationService.js`
  - Connected profile/portfolio, document upload, task report, attendance, review, placement, evaluation, clearance, governance, alert, and messaging adapters.
  - Unsupported operations remain explicit rather than silently discarding data: résumé deletion/restoration, evaluation update, replacement upload, daily-attendance review in the existing combined queue, and bulk writes.
- `frontend/src/components/Auth.jsx`
  - Host representative email/password controls are enabled.
  - Google Identity Services loads only when `VITE_GOOGLE_CLIENT_ID` is present; credential callback uses the backend verifier.
- `frontend/src/App.jsx`
  - Real Google sign-in handler and API-issued session entry.
- `frontend/src/views/Training.jsx`
  - Weekly report form now requires explicit report start/end dates for the API contract.
- `.env.example` and README updated with API/Google setup.

## Backend integration corrections
- Google token verification now enforces `email_verified` and the correct Google issuer (`https://accounts.google.com`) while applying configured audience.
- Workspace projection includes `studentProfileId` required by student resource endpoints.

## Validation
- Backend: **45 passed, 0 failed (189 assertions)**
- Backend PHP syntax lint: clean across application, routes, migrations, and feature tests
- PHP syntax lint: clean across backend app/routes/migrations/tests
- Frontend: **124 passed, 0 failed**
- Frontend build: passed
- Frontend smoke: **46/46 passed**

## Known integration gaps
1. Google sign-in needs a real institutional `VITE_GOOGLE_CLIENT_ID`; no credential was invented.
2. The backend has no endpoint yet for evaluation update, résumé delete/restore, document replacement, or the existing combined supervisor attendance-review UI; those actions show explicit unsupported errors.
3. The frontend still has a Phase 3 narrative-draft hint saying it is not remotely synced; only the narrative draft itself remains local because no narrative endpoint was included in the approved contract.
4. PostgreSQL migrations and live API testing require valid local PostgreSQL credentials. The current read-only `php artisan migrate:status` check failed because `backend/.env` uses `DB_USERNAME=root`, and PostgreSQL rejected that role/password. Update `DB_USERNAME` and `DB_PASSWORD` to the credentials configured in pgAdmin4, then rerun the read-only status check before approving migrations. Backend feature tests use the configured in-memory SQLite test connection.
