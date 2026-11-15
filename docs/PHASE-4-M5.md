# Phase 4 — Milestone 5: Governance & Communications

## Summary
Implemented the governance, partner management, staff provisioning, college settings, policy corpus, internal messaging, and audit trail APIs:
- **Partners:** Coordinators/admins can create and update partner companies; supervisors can update only their own job-posting fields.
- **Staff:** Admins can provision institutional coordinators (Google SSO; no password) and host company representatives (email/password) from recorded college/partner scopes.
- **College Settings:** Coordinators/admins can update approved college quotas and alert thresholds with range validation.
- **Policy Corpus:** Admins can add approved policy clauses with category/source metadata.
- **Messaging:** Role-scoped `GET /messages` and `POST /messages` with enforcement of student/company/college communication boundaries.
- **Audit Logging:** Critical governance actions write `audit_logs` records through `AuditService`.
- **Workspace Projection:** Real policy clauses, messages, and admin audit events now project through `GET /workspace`.

## Endpoints

- `POST /api/v1/partners`
- `PATCH /api/v1/partners/{id}`
- `POST /api/v1/staff`
- `PUT /api/v1/colleges/{code}/settings`
- `POST /api/v1/policy-corpus`
- `GET /api/v1/messages`
- `POST /api/v1/messages`
- `GET /api/v1/audit-logs`

All endpoints require Sanctum authentication. Resource authorization is enforced in requests/controllers; mutation validation is handled by Form Requests.

## Governance Guarantees

- Coordinators are restricted to their college for partner and settings changes.
- Supervisors cannot edit company capacity, GPA cutoff, or college affiliation through the job-posting update endpoint.
- Coordinators are provisioned only with institutional email addresses; no password is stored for coordinator accounts.
- Host representatives require a password and a recorded partner company scope.
- Students cannot message unrelated students; admins can message all recorded users; students can message their coordinator, assigned host representative, and admin.
- Audit records capture partner creation/update, staff provisioning, settings changes, policy creation, clearance certification, and alert dispatch/dismiss actions.

## Validation

- Backend: **45 passed, 0 failed (189 assertions)**
- Frontend: **123 passed, 0 failed**
- Frontend smoke: **46 passed, 0 failed**
- Frontend build: **passed**
