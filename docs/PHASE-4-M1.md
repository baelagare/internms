# Phase 4 — Milestone 1: Authentication & Users

## Summary
Implemented the complete authentication system for InternMS according to the approved architecture:
- **Google Sign-In** for institutional NEMSU roles (Student, Coordinator, Admin) enforcing institutional email domain (`@nemsu.edu.ph`) and Google token verification.
- **Email / Password** authentication strictly scoped to Host Company Representatives (`supervisor`). Institutional accounts are prohibited from password login.
- **Supervisor Invitation Onboarding** via one-time cryptographically secure partner tokens, automatically linking the representative to their company record and clearing the token.
- **Token Strategy:** Laravel Sanctum bearer tokens with revocation on logout.
- **Current User Profile:** `GET /api/v1/me` returning role, college scope, company assignment, and permissions.

---

## 1. Endpoints Implemented

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/v1/auth/google` | `POST` | Public | Accepts `{ idToken }`, verifies via `google/auth`, enforces `@nemsu.edu.ph`, auto-provisions students or signs in existing staff, returns `{ user, token }`. |
| `/api/v1/auth/login` | `POST` | Public | Accepts `{ email, password }` for Host Company Representatives only. Rejects institutional logins with explicit guidance. Returns `{ user, token }`. |
| `/api/v1/auth/supervisor-invite` | `POST` | Public | Accepts `{ inviteToken, name, email, password }`, verifies and consumes company token, creates `supervisor` user, links company, returns `{ user, token }`. |
| `/api/v1/auth/logout` | `POST` | `auth:sanctum` | Revokes the current access token. Subsequent requests with that token return 401. |
| `/api/v1/me` | `GET` | `auth:sanctum` | Returns `{ user: { id, name, email, role, college, company } }`. Unauthenticated requests return standard 401 JSON envelope. |

---

## 2. Database Models & Migrations

- **`users` Table:**
  - `id` (bigint, PK)
  - `name` (string)
  - `email` (string, unique, index)
  - `role` (string, indexed; values: `admin`, `coordinator`, `student`, `supervisor`)
  - `college_code` (string, nullable, index)
  - `company` (string, nullable, index)
  - `company_id` (bigint, nullable, index)
  - `google_sub` (string, nullable, unique)
  - `password` (string, nullable)
  - `email_verified_at` (timestamp, nullable)
  - `remember_token`, `timestamps`
- **`companies` Table:**
  - `id` (bigint, PK)
  - `name` (string, unique)
  - `college_code` (string, nullable, index)
  - `location`, `role_title`, `description` (text/string, nullable)
  - `required_skills` (json, nullable)
  - `max_slots`, `filled_slots` (integer)
  - `min_gpa` (decimal 3,2, nullable)
  - `invite_token` (string, nullable, unique, index)
  - `representative_user_id` (bigint, nullable, index)
  - `supervisor_name`, `supervisor_email` (string, nullable)
  - `timestamps`
- **`personal_access_tokens` Table (Laravel Sanctum):**
  - Standard Sanctum bearer token storage.

---

## 3. Services & Classes

- **`App\Services\GoogleTokenVerifier`:** Encapsulates `Google\Auth\AccessToken` token verification, allowing full test isolation and mockability without external network calls during testing.
- **`App\Http\Controllers\Api\V1\AuthController`:** Handles token verification, credential checks, invite consumption in a database transaction, token issuance, and logout.
- **`App\Http\Requests\GoogleAuthRequest`**, **`LoginRequest`**, **`SupervisorInviteRequest`**: Dedicated form requests enforcing validation rules.
- **`App\Http\Resources\UserResource`**: Formats user responses uniformly for the frontend.

---

## 4. Automated Test Coverage

14 feature tests in `backend/tests/Feature/Api/V1/AuthTest.php` covering:
1. Student auto-provisioning via institutional Google ID token.
2. Rejection of non-institutional emails (`@gmail.com`).
3. Rejection of invalid/forged Google tokens.
4. Coordinator sign-in via Google ID token.
5. Host company representative password login.
6. Rejection of institutional accounts attempting password login.
7. Rejection of invalid password for supervisors.
8. Supervisor invitation token consumption and company linkage.
9. Rejection of invalid or already used invitation tokens.
10. `GET /api/v1/me` returns authenticated user profile.
11. `GET /api/v1/me` unauthenticated returns 401 JSON error envelope.
12. `POST /api/v1/auth/logout` deletes access token from database and invalidates subsequent calls.

**Test Results:**
- Backend: **17 passed, 0 failed (68 assertions)**
- Frontend: **123 passed, 0 failed**
- Frontend smoke: **46 passed, 0 failed**
- Frontend build: **passed**
