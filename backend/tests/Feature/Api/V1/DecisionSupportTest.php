<?php

namespace Tests\Feature\Api\V1;

use App\Models\College;
use App\Models\CollegeDocumentRequirement;
use App\Models\CollegeSetting;
use App\Models\Document;
use App\Models\Company;
use App\Models\Evaluation;
use App\Models\Placement;
use App\Models\RiskAlert;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DecisionSupportTest extends TestCase
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

        College::create(['code' => 'CITE', 'name' => 'College of IT Education']);
        CollegeSetting::create(['college_code' => 'CITE', 'required_hours' => 486, 'max_gpa_cutoff' => 2.50]);

        $this->company = Company::create(['name' => 'Innovate Corp', 'college_code' => 'CITE', 'max_slots' => 5, 'filled_slots' => 0]);

        $this->studentUser = User::create([
            'name' => 'Maria Intern',
            'email' => 'maria@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
            'company' => 'Innovate Corp',
            'company_id' => $this->company->id,
        ]);
        $this->student = Student::create([
            'user_id' => $this->studentUser->id,
            'student_number' => '2026-2001',
            'college_code' => 'CITE',
            'program' => 'BSCS',
            'gpa' => 1.75,
            'disciplinary_clearance' => 'Cleared & Certified',
        ]);
        foreach (CollegeDocumentRequirement::where('college_code', 'CITE')->where('is_active', true)->where('is_required', true)->get() as $requirement) {
            Document::create([
                'student_id' => $this->student->id, 'doc_code' => $requirement->doc_code, 'title' => $requirement->title,
                'original_name' => strtolower($requirement->doc_code).'.pdf', 'file_path' => 'documents/'.$requirement->doc_code.'.pdf',
                'file_size_bytes' => 100, 'mime_type' => 'application/pdf', 'status' => 'Verified',
            ]);
        }

        $this->coordinatorUser = User::create([
            'name' => 'Dean Coordinator',
            'email' => 'dean@nemsu.edu.ph',
            'role' => 'coordinator',
            'college_code' => 'CITE',
        ]);

        $this->supervisorUser = User::create([
            'name' => 'Engr. Supervisor',
            'email' => 'sup@innovate.ph',
            'role' => 'supervisor',
            'company' => 'Innovate Corp',
            'company_id' => $this->company->id,
        ]);
        $this->company->update(['representative_user_id' => $this->supervisorUser->id]);
    }

    public function test_supervisor_can_submit_19_criteria_evaluation_for_placed_intern(): void
    {
        $scores = [];
        for ($i = 1; $i <= 19; $i++) {
            $scores["q{$i}"] = 5;
        }

        $response = $this->actingAs($this->supervisorUser, 'sanctum')->postJson('/api/v1/evaluations', [
            'student_id' => $this->student->id,
            'period' => 'Final',
            'feedback' => 'Exceptional technical execution.',
            'scores' => $scores,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'evaluation' => [
                    'student_id' => $this->student->id,
                    'total_score' => 95,
                    'average_score' => 5.0,
                    'percentage' => 100.0,
                    'recommendation' => 'Outstanding',
                    'coordinator_clearance_status' => 'Pending Coordinator Review',
                ],
            ]);

        $this->student->refresh();
        $this->assertEquals('Evaluation Completed', $this->student->clearance_status);
    }

    public function test_evaluation_submission_rejects_missing_criteria(): void
    {
        $scores = [];
        for ($i = 1; $i <= 18; $i++) { // missing q19
            $scores["q{$i}"] = 5;
        }

        $response = $this->actingAs($this->supervisorUser, 'sanctum')->postJson('/api/v1/evaluations', [
            'student_id' => $this->student->id,
            'scores' => $scores,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['scores.q19']);
    }

    public function test_supervisor_cannot_evaluate_intern_of_another_company(): void
    {
        $otherCompany = Company::create(['name' => 'Beta Corp', 'college_code' => 'CITE']);
        $otherSup = User::create([
            'name' => 'Beta Supervisor',
            'email' => 'beta@betacorp.ph',
            'role' => 'supervisor',
            'company' => 'Beta Corp',
            'company_id' => $otherCompany->id,
        ]);

        $scores = [];
        for ($i = 1; $i <= 19; $i++) $scores["q{$i}"] = 5;

        $response = $this->actingAs($otherSup, 'sanctum')->postJson('/api/v1/evaluations', [
            'student_id' => $this->student->id,
            'scores' => $scores,
        ]);

        $response->assertStatus(403);
    }

    public function test_student_can_save_placement_preference_without_changing_assigned_role(): void
    {
        $this->student->update(['assigned_role' => 'Existing Approved Role']);

        $response = $this->actingAs($this->studentUser, 'sanctum')->postJson("/api/v1/students/{$this->student->id}/placement", [
            'company_id' => $this->company->id,
            'preferred_role' => 'Requested Preference Role',
        ]);

        $response->assertOk();
        $this->student->refresh();
        $this->assertEquals($this->company->id, $this->student->preferred_company_id);
        $this->assertEquals('Innovate Corp', $this->student->preferred_company);
        $this->assertEquals('Requested Preference Role', $this->student->preferred_role);
        $this->assertEquals('Existing Approved Role', $this->student->assigned_role);
        $this->assertDatabaseHas('placements', [
            'student_id' => $this->student->id,
            'company_id' => $this->company->id,
            'status' => 'Pending Coordinator Endorsement',
            'assigned_role' => null,
        ]);
    }

    public function test_student_cannot_submit_assigned_role_as_a_preference(): void
    {
        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
                'assigned_role' => 'Unauthorized Assigned Role',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assigned_role']);

        $this->student->refresh();
        $this->assertNull($this->student->preferred_company_id);
        $this->assertNull($this->student->preferred_role);
    }

    public function test_student_cannot_submit_preference_for_another_student(): void
    {
        $otherStudentUser = User::create([
            'name' => 'Another Student',
            'email' => 'another-student@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
        ]);
        $otherStudent = Student::create([
            'user_id' => $otherStudentUser->id,
            'college_code' => 'CITE',
        ]);

        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$otherStudent->id}/placement", [
                'company_id' => $this->company->id,
            ])
            ->assertForbidden();

        $otherStudent->refresh();
        $this->assertNull($otherStudent->preferred_company_id);
    }

    public function test_student_cannot_submit_preference_when_gpa_is_over_the_cutoff(): void
    {
        $this->student->update(['gpa' => 3.00]);

        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['eligibility']);

        $this->student->refresh();
        $this->assertNull($this->student->preferred_company_id);
    }

    public function test_student_cannot_submit_preference_without_certified_clearance(): void
    {
        $this->student->update(['disciplinary_clearance' => 'Not Cleared']);

        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['eligibility']);

        $this->student->refresh();
        $this->assertNull($this->student->preferred_company_id);
    }

    public function test_student_cannot_submit_preference_when_host_has_no_open_slots(): void
    {
        $fullCompany = Company::create([
            'name' => 'Full Company',
            'college_code' => 'CITE',
            'max_slots' => 2,
            'filled_slots' => 2,
        ]);

        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $fullCompany->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['capacity']);

        $this->student->refresh();
        $this->assertNull($this->student->preferred_company_id);
    }

    public function test_placement_is_rejected_when_host_capacity_is_not_configured(): void
    {
        $unconfiguredCompany = Company::create([
            'name' => 'Unconfigured Company',
            'college_code' => 'CITE',
            'max_slots' => null,
            'filled_slots' => 0,
        ]);

        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $unconfiguredCompany->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['capacity']);

        $this->student->refresh();
        $this->assertNull($this->student->preferred_company_id);
    }

    public function test_coordinator_cannot_deploy_student_to_full_company(): void
    {
        $fullCompany = Company::create([
            'name' => 'Full Company',
            'college_code' => 'CITE',
            'max_slots' => 2,
            'filled_slots' => 2,
        ]);

        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $fullCompany->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['capacity']);

        $this->assertDatabaseCount('placements', 0);
        $fullCompany->refresh();
        $this->assertSame(2, $fullCompany->filled_slots);
    }

    public function test_placement_is_rejected_when_student_gpa_is_unknown(): void
    {
        $this->student->update(['gpa' => null]);

        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['eligibility']);

        $this->student->refresh();
        $this->assertNull($this->student->preferred_company_id);
    }

    public function test_coordinator_can_assign_and_deploy_student_placement(): void
    {
        $this->student->update([
            'preferred_company_id' => $this->company->id,
            'preferred_company' => $this->company->name,
            'preferred_role' => 'Student Preferred Developer Role',
        ]);

        $response = $this->actingAs($this->coordinatorUser, 'sanctum')->postJson("/api/v1/students/{$this->student->id}/placement", [
            'company_id' => $this->company->id,
            'assigned_role' => 'Fullstack Developer Intern',
            'reason' => 'Highest skill match and verified student preference.',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('placements', [
            'student_id' => $this->student->id,
            'company_id' => $this->company->id,
            'status' => 'Approved & Deployed',
            'assigned_role' => 'Fullstack Developer Intern',
            'endorsed_by_user_id' => $this->coordinatorUser->id,
        ]);

        $this->company->refresh();
        $this->assertEquals(1, $this->company->filled_slots);
        $this->student->refresh();
        $this->assertNull($this->student->preferred_company_id);
        $this->assertNull($this->student->preferred_role);
    }

    public function test_coordinator_cannot_deploy_until_every_required_document_is_verified(): void
    {
        Document::where('student_id', $this->student->id)->where('doc_code', 'INSURANCE')->delete();
        $response = $this->actingAs($this->coordinatorUser, 'sanctum')->postJson("/api/v1/students/{$this->student->id}/placement", [
            'company_id' => $this->company->id,
            'assigned_role' => 'Fullstack Developer Intern',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors(['documents']);
        $this->assertDatabaseCount('placements', 0);
        $this->assertSame(0, $this->company->fresh()->filled_slots);
    }


    public function test_repeating_assignment_to_same_company_updates_existing_placement_and_does_not_consume_another_slot(): void
    {
        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
                'assigned_role' => 'Software Intern',
            ])
            ->assertOk();

        $firstPlacement = Placement::where('student_id', $this->student->id)->firstOrFail();

        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
                'assigned_role' => 'Senior Software Intern',
            ])
            ->assertOk()
            ->assertJsonPath('placement.id', $firstPlacement->id);

        $this->assertSame(1, Placement::where('student_id', $this->student->id)->count());
        $this->assertDatabaseHas('placements', [
            'id' => $firstPlacement->id,
            'status' => 'Approved & Deployed',
            'assigned_role' => 'Senior Software Intern',
        ]);
        $this->company->refresh();
        $this->assertSame(1, $this->company->filled_slots);
    }

    public function test_reassigning_student_releases_old_company_slot_and_frees_old_deployment(): void
    {
        $oldCompany = Company::create([
            'name' => 'Previous Host',
            'college_code' => 'CITE',
            'max_slots' => 4,
            'filled_slots' => 1,
        ]);
        $oldPlacement = Placement::create([
            'student_id' => $this->student->id,
            'company_id' => $oldCompany->id,
            'status' => 'Approved & Deployed',
            'assigned_role' => 'Previous Role',
            'endorsed_by_user_id' => $this->coordinatorUser->id,
        ]);
        $this->studentUser->update(['company' => $oldCompany->name, 'company_id' => $oldCompany->id]);
        $this->student->update(['assigned_role' => 'Previous Role']);

        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
                'assigned_role' => 'New Role',
            ])
            ->assertOk();

        $this->assertDatabaseHas('placements', [
            'id' => $oldPlacement->id,
            'status' => 'Reassigned',
        ]);
        $this->assertDatabaseHas('placements', [
            'student_id' => $this->student->id,
            'company_id' => $this->company->id,
            'status' => 'Approved & Deployed',
            'assigned_role' => 'New Role',
        ]);

        $oldCompany->refresh();
        $this->company->refresh();
        $this->studentUser->refresh();
        $this->assertSame(0, $oldCompany->filled_slots);
        $this->assertSame(1, $this->company->filled_slots);
        $this->assertSame($this->company->id, $this->studentUser->company_id);
    }

    public function test_coordinator_can_return_pending_preference_with_revision_reason(): void
    {
        $this->student->update([
            'preferred_company_id' => $this->company->id,
            'preferred_company' => $this->company->name,
            'preferred_role' => 'Preferred QA Role',
        ]);
        $preference = Placement::create([
            'student_id' => $this->student->id,
            'company_id' => $this->company->id,
            'status' => 'Pending Coordinator Endorsement',
        ]);

        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement/return", [
                'reason' => 'Please choose a role that matches your current program skills.',
            ])
            ->assertOk()
            ->assertJsonPath('placement.status', 'Returned for Revision')
            ->assertJsonPath('placement.reason', 'Please choose a role that matches your current program skills.')
            ->assertJsonPath('placement.endorsed_by_user_id', $this->coordinatorUser->id);

        $this->assertDatabaseHas('placements', [
            'id' => $preference->id,
            'status' => 'Returned for Revision',
            'reason' => 'Please choose a role that matches your current program skills.',
        ]);
    }

    public function test_returning_preference_requires_a_minimum_reason(): void
    {
        Placement::create([
            'student_id' => $this->student->id,
            'company_id' => $this->company->id,
            'status' => 'Pending Coordinator Endorsement',
        ]);

        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement/return", ['reason' => 'no'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reason']);

        $this->assertDatabaseHas('placements', [
            'student_id' => $this->student->id,
            'status' => 'Pending Coordinator Endorsement',
        ]);
    }

    public function test_student_cannot_return_placement_preference(): void
    {
        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement/return", [
                'reason' => 'Please update your placement role choice.',
            ])
            ->assertForbidden();
    }

    public function test_coordinator_cannot_return_preference_outside_their_college(): void
    {
        College::create(['code' => 'CBM', 'name' => 'College of Business and Management']);
        $otherUser = User::create([
            'name' => 'Other Student',
            'email' => 'return-other@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CBM',
        ]);
        $otherStudent = Student::create(['user_id' => $otherUser->id, 'college_code' => 'CBM']);

        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$otherStudent->id}/placement/return", [
                'reason' => 'Please update your placement role choice.',
            ])
            ->assertForbidden();
    }

    public function test_returned_preference_can_be_resubmitted_to_pending_review(): void
    {
        $this->student->update([
            'preferred_company_id' => $this->company->id,
            'preferred_company' => $this->company->name,
            'preferred_role' => 'Original Preferred Role',
        ]);
        $preference = Placement::create([
            'student_id' => $this->student->id,
            'company_id' => $this->company->id,
            'status' => 'Returned for Revision',
            'reason' => 'Please revise your role choice.',
            'endorsed_by_user_id' => $this->coordinatorUser->id,
        ]);

        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
                'preferred_role' => 'Revised Preferred Role',
            ])
            ->assertOk();

        $this->assertSame(1, Placement::where('student_id', $this->student->id)->count());
        $this->assertDatabaseHas('placements', [
            'id' => $preference->id,
            'status' => 'Pending Coordinator Endorsement',
            'reason' => null,
            'endorsed_by_user_id' => null,
        ]);
        $this->student->refresh();
        $this->assertSame('Revised Preferred Role', $this->student->preferred_role);
    }

    public function test_coordinator_cannot_submit_student_preferred_role_field(): void
    {
        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
                'preferred_role' => 'Unapproved Preference Role',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['preferred_role']);

        $this->assertDatabaseCount('placements', 0);
    }

    public function test_supervisor_cannot_submit_placement_decision(): void
    {
        $this->actingAs($this->supervisorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('placements', 0);
    }

    public function test_coordinator_cannot_assign_student_from_another_college(): void
    {
        College::create(['code' => 'CBM', 'name' => 'College of Business and Management']);
        $otherStudentUser = User::create([
            'name' => 'Other College Student',
            'email' => 'other-student@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CBM',
        ]);
        $otherStudent = Student::create([
            'user_id' => $otherStudentUser->id,
            'college_code' => 'CBM',
        ]);

        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$otherStudent->id}/placement", [
                'company_id' => $this->company->id,
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('placements', 0);
    }

    public function test_student_cannot_request_company_affiliated_with_another_college(): void
    {
        College::create(['code' => 'CBM', 'name' => 'College of Business and Management']);
        $otherCompany = Company::create([
            'name' => 'Other College Company',
            'college_code' => 'CBM',
            'max_slots' => 5,
            'filled_slots' => 0,
        ]);

        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $otherCompany->id,
            ])
            ->assertForbidden();

        $this->student->refresh();
        $this->assertNull($this->student->preferred_company_id);
    }

    public function test_coordinator_cannot_assign_student_to_company_from_another_college(): void
    {
        College::create(['code' => 'CBM', 'name' => 'College of Business and Management']);
        $otherCompany = Company::create([
            'name' => 'Other College Company',
            'college_code' => 'CBM',
            'max_slots' => 5,
            'filled_slots' => 0,
        ]);

        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $otherCompany->id,
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('placements', 0);
    }

    public function test_admin_can_assign_student_placement(): void
    {
        $admin = User::create([
            'name' => 'System Administrator',
            'email' => 'admin@nemsu.edu.ph',
            'role' => 'admin',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/placement", [
                'company_id' => $this->company->id,
            ])
            ->assertOk();

        $this->assertDatabaseHas('placements', [
            'student_id' => $this->student->id,
            'company_id' => $this->company->id,
            'endorsed_by_user_id' => $admin->id,
        ]);
    }

    public function test_coordinator_can_certify_student_clearance_after_evaluation(): void
    {
        $scores = [];
        for ($i = 1; $i <= 19; $i++) $scores["q{$i}"] = 5;

        $eval = Evaluation::create([
            'student_id' => $this->student->id,
            'supervisor_id' => $this->supervisorUser->id,
            'company_id' => $this->company->id,
            'period' => 'Final',
            'scores' => $scores,
            'total_score' => 95,
            'average_score' => 5.0,
            'percentage' => 100.0,
            'recommendation' => 'Outstanding',
        ]);

        $response = $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/clearance");

        $response->assertOk();

        $this->student->refresh();
        $this->assertEquals('Cleared & Certified', $this->student->disciplinary_clearance);
        $this->assertEquals('Cleared & Certified', $this->student->clearance_status);

        $eval->refresh();
        $this->assertEquals('Cleared & Certified', $eval->coordinator_clearance_status);
        $this->assertEquals($this->coordinatorUser->id, $eval->certified_by_user_id);
    }

    public function test_coordinator_cannot_certify_clearance_without_completed_evaluation(): void
    {
        // Student has NO evaluation
        $response = $this->actingAs($this->coordinatorUser, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/clearance");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['clearance']);
    }

    public function test_coordinator_can_review_and_dispatch_risk_alert(): void
    {
        $alert = RiskAlert::create([
            'student_id' => $this->student->id,
            'college_code' => 'CITE',
            'rule_key' => 'RULE_A_ATTENDANCE',
            'rule_label' => 'Consecutive Absences',
            'triggers' => ['3 consecutive unexcused absences recorded'],
            'evidence' => ['absences' => 3],
            'status' => 'PENDING',
        ]);

        $response = $this->actingAs($this->coordinatorUser, 'sanctum')->postJson("/api/v1/alerts/{$alert->id}/review", [
            'action' => 'approve',
            'stage' => 'warning_1',
            'message' => 'Please report to the OJT coordinator office regarding your absences.',
        ]);

        $response->assertOk();

        $alert->refresh();
        $this->assertEquals('DISPATCHED', $alert->status);
        $this->assertEquals('warning_1', $alert->intervention_stage);
        $this->assertEquals('Please report to the OJT coordinator office regarding your absences.', $alert->dispatched_message);
        $this->assertEquals($this->coordinatorUser->id, $alert->reviewed_by_user_id);
    }

    public function test_coordinator_can_dismiss_risk_alert(): void
    {
        $alert = RiskAlert::create([
            'student_id' => $this->student->id,
            'college_code' => 'CITE',
            'rule_key' => 'RULE_A_ATTENDANCE',
            'rule_label' => 'Consecutive Absences',
            'triggers' => ['3 consecutive unexcused absences recorded'],
            'status' => 'PENDING',
        ]);

        $response = $this->actingAs($this->coordinatorUser, 'sanctum')->postJson("/api/v1/alerts/{$alert->id}/review", [
            'action' => 'dismiss',
            'reason' => 'Absences excused with medical certificate.',
        ]);

        $response->assertOk();

        $alert->refresh();
        $this->assertEquals('DISMISSED', $alert->status);
        $this->assertEquals('Absences excused with medical certificate.', $alert->dismissed_reason);
    }
}
