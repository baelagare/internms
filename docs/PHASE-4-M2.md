# Phase 4 — Milestone 2: Domain Core & Workspace Projection

## Summary
Implemented the core domain database schema, models, and server-side role-based workspace projection for InternMS:
- **Domain Migrations & Models:** `colleges`, `college_settings`, `students`, and `placements`.
- **Workspace Projection Service (`WorkspaceService`):** Implements the central `GET /api/v1/workspace` endpoint that serves the exact dataset required by the frontend application shell, strictly scoped server-side based on the authenticated user's role and boundaries.
- **Institutional Seeder (`CollegeSeeder`):** Provides the official university colleges (CITE, CBA, CED, CAS, CET) and approved academic thresholds (required hours, GPA cutoffs, absence rules) kept separate from production data.

---

## 1. Domain Migrations & Schema

1. **`colleges` Table**:
   - `code` (string, PK: `CITE`, `CBA`, `CED`, `CAS`, `CET`)
   - `name` (string)
   - `timestamps`
2. **`college_settings` Table**:
   - `id` (bigint, PK)
   - `college_code` (string, unique, index)
   - `required_hours` (integer, e.g. 486 for CITE, 300 for CBA)
   - `max_gpa_cutoff` (decimal 3,2, default 2.50)
   - `rule_a_max_consecutive_absences` (integer, default 3)
   - `rule_a_max_deficit_pct` (integer, default 20)
   - `rule_b_consecutive_weeks` (integer, default 2)
   - `rule_b_clerical_keywords` (json, default terms)
   - `timestamps`
3. **`students` Table**:
   - `id` (bigint, PK)
   - `user_id` (foreignId -> users, unique, cascade)
   - `student_number` (string, nullable, unique, index)
   - `college_code` (string, nullable, index)
   - `program` (string, nullable)
   - `gpa` (decimal 3,2, nullable)
   - `phone` (string, nullable)
   - `bio` (text, nullable)
   - `skills` (json, nullable)
   - `coursework` (json, nullable)
   - `achievements` (json, nullable)
   - `preferred_company`, `preferred_company_id` (string/FK, nullable)
   - `assigned_role` (string, nullable)
   - `disciplinary_clearance` (string, default 'Cleared & Certified')
   - `clearance_status` (string, nullable)
   - `timestamps`
4. **`placements` Table**:
   - `id` (bigint, PK)
   - `student_id` (foreignId -> students, cascade)
   - `company_id` (foreignId -> companies, cascade)
   - `status` (string, default 'Pending Coordinator Endorsement', index)
   - `assigned_role` (string, nullable)
   - `reason` (text, nullable)
   - `endorsed_by_user_id` (bigint, nullable, index)
   - `timestamps`

---

## 2. Server-Side Scoping Policy (`GET /api/v1/workspace`)

The endpoint delivers the full workspace projection matching the frontend's contract with strict server-side filtering:

| Role | Scoping Rules Applied |
|---|---|
| **Admin** | Receives all users across all colleges, all HTEs (companies), and all college settings. |
| **Coordinator** | Receives only students enrolled in their assigned college (`college_code === user.college_code`), staff roles, and HTEs / settings relevant to their college. Students from other colleges are strictly excluded. |
| **Supervisor** | Receives only interns placed with their company (`company_id === user.company_id` or `company === user.company`), coordinators, and their own company record in `htes`. Interns from other companies are strictly excluded. |
| **Student** | Isolated strictly to their own user/student record (with full portfolio, GPA, placement status, and documents), their assigned college coordinator, and administrator contacts. Other students are completely invisible. |

---

## 3. Automated Test Coverage

6 comprehensive feature tests in `backend/tests/Feature/Api/V1/WorkspaceTest.php` covering:
1. `GET /api/v1/workspace` rejects unauthenticated requests with 401 JSON error envelope.
2. Full contract structure assertion: verifying presence of `academicYear`, `campus`, `users`, `htes`, `collegeSettings`, `policyCorpus`, `logs`, `dtrDisputes`, `alerts`, `evaluations`, `auditLogs`, `messages`, `documents`.
3. Admin workspace delivers cross-college cohort and setting aggregation.
4. Coordinator workspace enforces strict college-boundary isolation.
5. Supervisor workspace isolates view to assigned interns and their own company.
6. Student workspace isolates view to own record and delivers complete profile & portfolio data.

**Cumulative Test Results:**
- Backend: **23 passed, 0 failed (108 assertions)**
- Frontend: **123 passed, 0 failed**
- Frontend smoke: **46 passed, 0 failed**
- Frontend build: **passed**
