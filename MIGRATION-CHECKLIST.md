# InternMS React migration checklist

Status meanings: **Not started** = no React workflow; **In progress** = partial; **Implemented** = workflow exists in React; **Tested** = automated coverage exists; **Verified** = exercised in the browser or against the actual backend contract.

## Migration result

The legacy vanilla implementation remains unchanged and is the reference. All role navigation destinations now render a native React workflow; no intentional `ModuleView` placeholder remains in the routed application.

| Area | Status | Evidence / scope |
|---|---|---|
| Student profile, résumé, skills, coursework, achievements | Verified | `StudentProfile.jsx`; validation, local persistence, preview, removal/undo; unit coverage and browser route smoke |
| Student checklist | Verified | `StudentChecklist.jsx`; five requirements, metadata upload, statuses, preview; coordinator review service; unit coverage and browser route smoke |
| Student placement | Tested | `Placement.jsx`, `placement.js`; eligibility gates, local similarity rankings, preference submission, coordinator assignment/reassignment, capacity and audit updates |
| Student attendance | Tested | `Training.jsx`, `training.js`; shift-derived hours/times, history, quota summary, CSC Form 48 preview/print |
| Attendance adjustments | Tested | Student request → supervisor verification → coordinator approval/rejection; approved adjustment credits one attendance record |
| Weekly task reports | Tested | Week, hours, competency, title, summary, status, feedback and review queue |
| Narrative report | Implemented | Legacy behavior preserved as composed preview/print from profile and verified logs; it is not a separate persisted submission record |
| Messaging | Verified | Role/contact scoping, search, threads, local persistence, mobile contact/thread view |
| Coordinator dashboard | Tested | Real scoped intern, checklist, partner, capacity and alert aggregates; compliance report preview |
| Supervisor dashboard | Tested | Company-scoped interns, verification counts, evaluation counts and capacity |
| Administrator dashboard | Tested | College scope, real cohort compliance table, policy/partner/audit counts |
| Approval queues | Tested | `Approvals.jsx`; document, log and adjustment categories, search/pagination, verify/approve/return decisions and remarks |
| Evaluations | Tested | `Evaluations.jsx`, `evaluations.js`; exact legacy 19-item 1–5 rubric, 95-point score, recommendation, upsert and preview |
| Final clearance | Tested | Coordinator/admin intern detail certification updates student and evaluation records and audit event |
| Partner companies / job postings | Tested | `Management.jsx`, `management.js`; scoped create/edit, capacity, GPA, role, skills, token, supervisor relationship and rename propagation |
| Staff accounts | Tested | Admin-only coordinator/supervisor creation, duplicate prevention, scope validation and subsequent local login |
| Policy governance | Tested | Admin-only clause creation, duplicate IDs, source/section/category/text/index metadata |
| Risk alerts / HITL governance | Tested | `Governance.jsx`, `governance.js`; evidence, local policy retrieval, anonymized payload preview, editable dispatch, dismissal reason, message and audit record |
| Audit views | Implemented | Search/filter/detail/export; explicitly labels seeded demo versus local-session records and does not claim tamper-proof security audit |
| College settings | Tested | Quota/GPA/absence/deficit/task mismatch thresholds and clerical keywords with role scope and validation |
| Mock student registration | Tested | Required identity/program/college/GPA/password, duplicate checks, five-document checklist, default coursework/profile and subsequent login |
| Mock supervisor onboarding | Tested | HTE token validation, existing-account update/new account creation, email/name/password updates and subsequent login |
| Responsive shell/accessibility | Verified for smoke scope | Mobile screenshot and labeled-control inspection; collapsible sidebar, drawer focus trap, inert background, Escape close, focus states |

## Laravel authentication contract

Located at **`C:\xampp\htdocs\internms-api`**. Verified with `artisan route:list` and a live in-process HTTP-kernel smoke test (`tests/laravel-live.php`).

- `POST /api/v1/auth/login`: `{ login, password, device_name }`; response `data.user`, `data.token`, `data.token_type`; Sanctum bearer token.
- `POST /api/v1/auth/register`: `{ identifier_id, name, email, password, password_confirmation, role, college|organization }`; response `201` with the same token structure.
- `GET /api/v1/auth/me`: Sanctum bearer token; response `data` user.
- `POST /api/v1/auth/logout`: Sanctum bearer token; revokes current token.
- Laravel validation errors are returned through `errors`; frontend flattens them into visible form feedback.
- No Laravel invitation-token onboarding endpoint exists. Supervisor invite onboarding therefore remains available only in mock mode; remote mode clearly reports that limitation.

`src-react/services/laravelAuth.js` is the centralized client. `apiClient.js` maps Laravel identity to a separate local application profile using `laravel:<backend id>` and never merges it with a seeded demo user by name/email.

## Persistence boundary

- **Laravel:** identity registration, login, Sanctum token, `/me`, logout/revocation when `VITE_USE_MOCK_API=false`.
- **Local `sessionStorage` (`internms_mock_database`):** all application records because Laravel has no application CRUD endpoints: placements, attendance, adjustments, reports, evaluations, partners, settings, policy corpus, alerts, messages and audit-like workflow records.
- **Document files:** metadata only (filename, size, timestamp/status). Original bytes are not uploaded or previewed.
- **Similarity / RAG:** legacy deterministic/local simulations. No live SBERT or external Gemma request is made. The governance UI labels the anonymized payload as a local preview.
- **Local audit:** useful workflow history, browser-editable and not a server security audit.

## Validation artifacts

- `npm test`: **30 passing, 0 failing** in `tests/*.test.js`.
- `npm run build`: **passed**; Vite transformed 64 modules and emitted the production bundle plus static brand assets.
- Laravel live contract smoke: **passed** — registration `201`, bearer `/me` `200`, logout `200`, revoked token `401`, identifier login `200`, wrong-password validation `422`; transaction rolled back.
- Browser basic smoke: **passed** — login, all student routes, mobile screenshot, labeled controls, zero console errors. Artifact: `browser-results/basic-results.json` and `browser-results/basic-mobile.png`.
- Full multi-role browser workflow runner: retained as `tests/browser-smoke.mjs`; its CDP reload flow is less stable in this Windows environment than the deterministic basic smoke. It should be extended/fixed before treating every coordinator/supervisor CRUD action as browser-verified.

## Remaining limitations

1. Application records are intentionally local until Laravel CRUD endpoints are implemented.
2. The browser smoke artifact verifies the complete student route surface, but not every coordinator/supervisor/admin click path; those paths have service-level tests and production-build coverage.
3. Mock credentials are shipped in the frontend bundle and are not production authentication.
4. Session storage is tab-scoped and can be cleared by the browser.
5. Uploaded document contents, real PDF generation, server-side audit immutability, live vector search, and external AI calls are not implemented because the legacy app/backend does not provide them.