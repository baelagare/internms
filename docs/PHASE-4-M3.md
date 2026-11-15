# Phase 4 — Milestone 3: Student Workflows (Documents, Weekly Task Reports, Attendance & DTR)

## Summary
Implemented the complete student operational workflows, document management, weekly accomplishment reporting pipeline, and attendance tracking:
- **Student Profile & Portfolio Mutations:** Endpoints to update contact info, GPA, program, student number, and add/remove skills, coursework, and achievements.
- **Pre-Deployment Document Submissions:** File upload handling with MIME and size verification, secure role-authorized download streaming, and coordinator verification/revision reviews.
- **Weekly Accomplishment Reports (2-Stage Review Pipeline):** Student submits weekly report with hours and summary; on-site host supervisor verifies deliverables (`Supervisor Verified`); college OJT coordinator approves for university credit (`Coordinator Approved`).
- **Attendance & Daily Time Record (DTR):** Daily camera punch-ins (`am_in`, `am_out`, `pm_in`, `pm_out`) with an automatic session cap (max 4.0h per session, max 8.0h daily total); DTR adjustment request and review pipeline.
- **Workspace Integration:** `WorkspaceService` updated to project uploaded documents, task reports, daily attendance punches, and DTR adjustment requests into the unified `/api/v1/workspace` response matching frontend contract.

---

## 1. Endpoints Implemented

| Endpoint | Method | Role Access | Description |
|---|---|---|---|
| `/api/v1/students/me` | `PATCH` | Student | Updates student profile fields (`phone`, `bio`, `gpa`, `studentNumber`, `program`). |
| `/api/v1/students/me/portfolio` | `POST` | Student | Adds item to `skills`, `coursework`, or `achievements`. |
| `/api/v1/students/me/portfolio` | `DELETE` | Student | Removes item from `skills`, `coursework`, or `achievements`. |
| `/api/v1/students/me/documents` | `POST` | Student | Multipart file upload for pre-deployment documents (`docCode`, `title`, `issuer`, `file`). |
| `/api/v1/documents/{id}/download` | `GET` | Authenticated | Authorized document stream download. Enforces student self-only and coordinator college boundary. |
| `/api/v1/documents/{id}/review` | `PATCH` | Coordinator / Admin | Reviews pre-deployment document (`status: Verified \| Returned for Revision`, `remarks`). |
| `/api/v1/task-reports` | `POST` | Student | Submits weekly report (`week`, `period_start`, `period_end`, `hours`, `summary`, optional `evidence`). |
| `/api/v1/task-reports/{id}/verify` | `POST` | Supervisor / Admin | Host supervisor verifies deliverables (`status: Supervisor Verified`, `supervisor_notes`). Scoped to supervisor company. |
| `/api/v1/task-reports/{id}/review` | `POST` | Coordinator / Admin | Coordinator approves report for official credit (`status: Coordinator Approved`, `coordinator_notes`). Scoped to coordinator college. |
| `/api/v1/attendance/punches` | `POST` | Student | Records daily punch (`type: am_in \| am_out \| pm_in \| pm_out`). Computes hours with session cap (4.0h max per session). |
| `/api/v1/attendance/adjustments` | `POST` | Student | Submits DTR adjustment request (`date`, `requested_hours`, `reason`, `notes`, punch times). |
| `/api/v1/attendance/adjustments/{id}/review` | `POST` | Supervisor / Coordinator | Reviews adjustment. If approved, automatically creates/updates corresponding `AttendanceLog` with approved hours. |

---

## 2. Database Models & Migrations

1. **`documents` Table**:
   - `id`, `student_id` (FK), `doc_code`, `title`, `issuer`, `original_name`, `file_path`, `file_size_bytes`, `mime_type`, `status` (`Pending`, `Verified`, `Returned for Revision`), `reviewer_id`, `remarks`, `timestamps`.
2. **`task_reports` Table**:
   - `id`, `student_id` (FK), `week`, `period_start`, `period_end`, `hours`, `summary`, `evidence_path`, `status` (`Submitted`, `Supervisor Verified`, `Coordinator Approved`, `Returned for Revision`), `supervisor_id`, `supervisor_notes`, `coordinator_id`, `coordinator_notes`, `timestamps`.
3. **`attendance_logs` Table**:
   - `id`, `student_id` (FK), `date` (unique with student_id), `am_in`, `am_out`, `pm_in`, `pm_out`, `hours`, `status` (`Submitted`, `Supervisor Verified`, `Coordinator Approved`), `supervisor_id`, `coordinator_id`, `timestamps`.
4. **`attendance_adjustments` Table**:
   - `id`, `student_id` (FK), `attendance_log_id` (FK nullable), `date`, `requested_hours`, `reason`, `notes`, `am_in`, `am_out`, `pm_in`, `pm_out`, `status` (`Pending`, `Approved`, `Rejected`), `reviewer_id`, `reviewer_notes`, `timestamps`.

---

## 3. Automated Test Coverage

7 comprehensive feature tests in `backend/tests/Feature/Api/V1/StudentWorkflowTest.php`:
1. `test_student_can_update_profile_and_manage_portfolio`: Profile and skills/coursework mutation assertions.
2. `test_student_can_upload_document_and_download_it`: Multipart upload, storage persistence, authorized download stream, and 403 isolation check for other students.
3. `test_coordinator_can_review_and_verify_document`: Verification status update and remarks logging.
4. `test_weekly_task_report_submission_and_two_stage_review_pipeline`: Complete 3-state transition (`Submitted` → `Supervisor Verified` → `Coordinator Approved`).
5. `test_supervisor_cannot_verify_reports_for_other_companies`: Strict company boundary isolation check (403 forbidden).
6. `test_student_attendance_punch_calculates_hours_with_session_cap`: AM/PM punch recording with 4.0h per session cap (8.0h total daily limit).
7. `test_student_attendance_adjustment_request_and_review`: Adjustment submission, coordinator review, and automatic `AttendanceLog` credit creation.

**Cumulative Test Results:**
- Backend: **30 passed, 0 failed (140 assertions)**
- Frontend: **123 passed, 0 failed**
- Frontend smoke: **46 passed, 0 failed**
- Frontend build: **passed**
