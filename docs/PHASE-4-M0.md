# Phase 4 — Milestone 0: Directory Restructure & Backend Skeleton

## Summary
Completed the approved project restructure (parent `internms`, sibling `frontend` and `backend`) and scaffolded the Laravel 12 backend with PostgreSQL configuration, Google Auth package, CORS, versioned API routing, a unified JSON error envelope, and automated feature tests.

## Restructure
- Parent: `c:\projects\internms`
- Frontend: `c:\projects\internms\frontend` (entire React Vite app moved; builds, passes 123 unit tests and 46 smoke checks)
- Backend: `c:\projects\internms\backend` (clean Laravel 12 application)

## Backend Skeleton (Laravel 12)
- Installed: `laravel/framework` (^12.0), `google/auth` (*)
- Configured:
  - `routes/api.php` mounted at `/api/v1`
  - Health check endpoint: `GET /api/v1/health` returning `{ status: "ok", service: "internms-api", version: "v1", timestamp }`
  - `bootstrap/app.php`: global JSON error envelope for `/api/*` requests (401, 403, 404, 409, 422, 500)
  - `config/cors.php`: allows `http://localhost:5173` and `http://127.0.0.1:5173`
  - `.env.example`: configured with `DB_CONNECTION=pgsql`, `DB_PORT=5432`, `DB_DATABASE=internms`, `GOOGLE_CLIENT_ID=`, and `INSTITUTION_EMAIL_DOMAIN=nemsu.edu.ph`
  - App key generated in `backend/.env`
- Feature tests (`backend/tests/Feature/Api/V1/HealthTest.php`):
  - Health check returns 200 with expected structure
  - Unknown route returns 404 with unified JSON error envelope
  - CORS preflight returns 204 with `Access-Control-Allow-Origin: http://localhost:5173`
  - **3 tests passed (10 assertions), 0 failed.**

## Files Touched
- Directory layout: moved all frontend files into `c:\projects\internms\frontend`
- Backend created: `c:\projects\internms\backend\`
- Backend configured:
  - `backend/routes/api.php`
  - `backend/bootstrap/app.php`
  - `backend/config/cors.php`
  - `backend/.env.example`
  - `backend/.env`
  - `backend/tests/Feature/Api/V1/HealthTest.php`
  - `backend/composer.json` & `backend/composer.lock`
- Ignored: root `.gitignore` and `frontend/.gitignore`
