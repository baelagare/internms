<?php

namespace Tests\Feature\Api\V1;

use App\Models\College;
use App\Models\CollegeSetting;
use App\Models\Company;
use App\Models\Document;
use App\Models\Placement;
use App\Models\Student;
use App\Models\TaskReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $studentUser;
    protected Student $student;
    protected User $coordinatorUser;
    protected User $supervisorUser;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        College::create(['code' => 'CITE', 'name' => 'College of IT Education']);
        CollegeSetting::create(['college_code' => 'CITE', 'required_hours' => 486, 'max_gpa_cutoff' => 2.50]);

        $this->company = Company::create(['name' => 'Tech Corp', 'college_code' => 'CITE']);

        $this->studentUser = User::create([
            'name' => 'Juan Student',
            'email' => 'juan@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
            'company' => 'Tech Corp',
            'company_id' => $this->company->id,
        ]);
        $this->student = Student::create([
            'user_id' => $this->studentUser->id,
            'student_number' => '2026-1001',
            'college_code' => 'CITE',
            'program' => 'BSCS',
            'gpa' => 1.75,
        ]);

        Placement::create([
            'student_id' => $this->student->id,
            'company_id' => $this->company->id,
            'status' => 'Approved & Deployed',
            'assigned_role' => 'Software Engineer Intern',
        ]);

        $this->coordinatorUser = User::create([
            'name' => 'Prof. Coordinator',
            'email' => 'coord@nemsu.edu.ph',
            'role' => 'coordinator',
            'college_code' => 'CITE',
        ]);

        $this->supervisorUser = User::create([
            'name' => 'Supervisor Mark',
            'email' => 'mark@techcorp.ph',
            'role' => 'supervisor',
            'company' => 'Tech Corp',
            'company_id' => $this->company->id,
        ]);
        $this->company->update(['representative_user_id' => $this->supervisorUser->id]);
    }

    public function test_student_can_update_profile_and_manage_portfolio(): void
    {
        $response = $this->actingAs($this->studentUser, 'sanctum')->patchJson('/api/v1/students/me', [
            'phone' => '09123456789',
            'bio' => 'Aspiring backend engineer.',
            'gpa' => 1.50,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('students', [
            'id' => $this->student->id,
            'phone' => '09123456789',
            'bio' => 'Aspiring backend engineer.',
            'gpa' => 1.50,
        ]);

        $this->actingAs($this->studentUser, 'sanctum')->postJson('/api/v1/students/me/portfolio', [
            'type' => 'skills',
            'item' => 'PHP/Laravel',
        ])->assertOk();

        $this->student->refresh();
        $this->assertContains('PHP/Laravel', $this->student->skills);

        $this->actingAs($this->studentUser, 'sanctum')->deleteJson('/api/v1/students/me/portfolio', [
            'type' => 'skills',
            'item' => 'PHP/Laravel',
        ])->assertOk();

        $this->student->refresh();
        $this->assertNotContains('PHP/Laravel', $this->student->skills);
    }

    public function test_student_can_upload_document_and_download_it(): void
    {
        $file = UploadedFile::fake()->create('consent.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->studentUser, 'sanctum')->postJson('/api/v1/students/me/documents', [
            'docCode' => 'PARENT_CONSENT',
            'title' => 'Parent Consent Form',
            'issuer' => 'Parent/Guardian',
            'file' => $file,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'document' => [
                    'docCode' => 'PARENT_CONSENT',
                    'title' => 'Parent Consent Form',
                    'status' => 'Pending',
                ],
            ]);

        $docId = $response->json('document.id');
        $this->assertDatabaseHas('documents', ['id' => $docId, 'doc_code' => 'PARENT_CONSENT']);

        $downloadResponse = $this->actingAs($this->studentUser, 'sanctum')->get("/api/v1/documents/{$docId}/download");
        $downloadResponse->assertOk();

        $otherStudentUser = User::create([
            'name' => 'Other',
            'email' => 'other@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
        ]);
        Student::create(['user_id' => $otherStudentUser->id, 'college_code' => 'CITE']);

        $this->actingAs($otherStudentUser, 'sanctum')
            ->get("/api/v1/documents/{$docId}/download")
            ->assertStatus(403);
    }

    public function test_coordinator_can_review_and_verify_document(): void
    {
        $doc = Document::create([
            'student_id' => $this->student->id,
            'doc_code' => 'MOA',
            'title' => 'Memorandum of Agreement',
            'original_name' => 'moa.pdf',
            'file_path' => 'documents/1/moa.pdf',
            'file_size_bytes' => 1024,
            'mime_type' => 'application/pdf',
            'status' => 'Pending',
        ]);

        $response = $this->actingAs($this->coordinatorUser, 'sanctum')->patchJson("/api/v1/documents/{$doc->id}/review", [
            'status' => 'Verified',
            'remarks' => 'Signed and approved by dean.',
        ]);

        $response->assertOk()
            ->assertJson([
                'document' => [
                    'id' => $doc->id,
                    'status' => 'Verified',
                    'remarks' => 'Signed and approved by dean.',
                ],
            ]);

        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'status' => 'Verified',
            'reviewer_id' => $this->coordinatorUser->id,
        ]);
    }

    public function test_weekly_task_report_submission_and_two_stage_review_pipeline(): void
    {
        // 1. Student submits weekly report
        $response = $this->actingAs($this->studentUser, 'sanctum')->postJson('/api/v1/task-reports', [
            'week' => 1,
            'period_start' => '2026-11-02',
            'period_end' => '2026-11-06',
            'hours' => 40.0,
            'summary' => 'Configured local development environment and completed orientation.',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'report' => [
                    'week' => 1,
                    'hours' => 40.0,
                    'status' => 'Submitted',
                ],
            ]);

        $reportId = $response->json('report.id');

        // 2. Supervisor verifies report
        $verifyResponse = $this->actingAs($this->supervisorUser, 'sanctum')
            ->postJson("/api/v1/task-reports/{$reportId}/verify", [
                'status' => 'Supervisor Verified',
                'supervisor_notes' => 'Deliverables confirmed on site.',
            ]);

        $verifyResponse->assertOk()
            ->assertJson([
                'report' => [
                    'id' => $reportId,
                    'status' => 'Supervisor Verified',
                    'supervisor_notes' => 'Deliverables confirmed on site.',
                ],
            ]);

        // 3. Coordinator approves report for academic credit
        $reviewResponse = $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/task-reports/{$reportId}/review", [
                'status' => 'Coordinator Approved',
                'coordinator_notes' => 'Hours officially credited.',
            ]);

        $reviewResponse->assertOk()
            ->assertJson([
                'report' => [
                    'id' => $reportId,
                    'status' => 'Coordinator Approved',
                    'coordinator_notes' => 'Hours officially credited.',
                ],
            ]);
    }

    public function test_supervisor_cannot_verify_reports_for_other_companies(): void
    {
        $otherCompany = Company::create(['name' => 'Other Inc', 'college_code' => 'CITE']);
        $otherSupervisor = User::create([
            'name' => 'Other Sup',
            'email' => 'other@otherinc.ph',
            'role' => 'supervisor',
            'company' => 'Other Inc',
            'company_id' => $otherCompany->id,
        ]);

        $report = TaskReport::create([
            'student_id' => $this->student->id,
            'week' => 1,
            'period_start' => '2026-11-02',
            'period_end' => '2026-11-06',
            'hours' => 40.0,
            'summary' => 'Orientation and setup.',
            'status' => 'Submitted',
        ]);

        $response = $this->actingAs($otherSupervisor, 'sanctum')->postJson("/api/v1/task-reports/{$report->id}/verify", [
            'status' => 'Supervisor Verified',
        ]);

        $response->assertStatus(403);
    }

    public function test_student_attendance_punch_calculates_hours_with_session_cap(): void
    {
        // 1. AM In at 08:00
        $this->actingAs($this->studentUser, 'sanctum')->postJson('/api/v1/attendance/punches', [
            'type' => 'am_in',
            'date' => '2026-11-02',
            'time' => '08:00:00',
        ])->assertOk();

        // 2. AM Out at 12:00 (4.0 hrs)
        $this->actingAs($this->studentUser, 'sanctum')->postJson('/api/v1/attendance/punches', [
            'type' => 'am_out',
            'date' => '2026-11-02',
            'time' => '12:00:00',
        ])->assertOk();

        $this->assertDatabaseHas('attendance_logs', [
            'student_id' => $this->student->id,
            'date' => '2026-11-02',
            'hours' => 4.0,
        ]);

        // 3. PM In at 13:00 and PM Out at 17:00 (4.0 hrs -> total 8.0 hrs)
        $this->actingAs($this->studentUser, 'sanctum')->postJson('/api/v1/attendance/punches', [
            'type' => 'pm_in',
            'date' => '2026-11-02',
            'time' => '13:00:00',
        ])->assertOk();

        $this->actingAs($this->studentUser, 'sanctum')->postJson('/api/v1/attendance/punches', [
            'type' => 'pm_out',
            'date' => '2026-11-02',
            'time' => '17:00:00',
        ])->assertOk();

        $this->assertDatabaseHas('attendance_logs', [
            'student_id' => $this->student->id,
            'date' => '2026-11-02',
            'hours' => 8.0,
        ]);
    }

    public function test_student_attendance_adjustment_request_and_review(): void
    {
        // Student requests adjustment for missed punch
        $response = $this->actingAs($this->studentUser, 'sanctum')->postJson('/api/v1/attendance/adjustments', [
            'date' => '2026-11-03',
            'requested_hours' => 8.0,
            'reason' => 'Camera failure during morning punch in.',
            'am_in' => '08:00:00',
            'am_out' => '12:00:00',
            'pm_in' => '13:00:00',
            'pm_out' => '17:00:00',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'adjustment' => [
                    'requested_hours' => 8.0,
                    'status' => 'Pending',
                ],
            ]);

        $adjId = $response->json('adjustment.id');

        // Coordinator approves adjustment
        $this->actingAs($this->coordinatorUser, 'sanctum')->postJson("/api/v1/attendance/adjustments/{$adjId}/review", [
            'status' => 'Approved',
            'notes' => 'Timecard verified by on-site supervisor.',
        ])->assertOk();

        $this->assertDatabaseHas('attendance_adjustments', [
            'id' => $adjId,
            'status' => 'Approved',
            'reviewer_id' => $this->coordinatorUser->id,
        ]);

        // AttendanceLog was updated/created with approved hours
        $this->assertDatabaseHas('attendance_logs', [
            'student_id' => $this->student->id,
            'hours' => 8.0,
            'status' => 'Coordinator Approved',
        ]);
    }
}
