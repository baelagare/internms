<?php

namespace Tests\Feature\Api\V1;

use App\Models\College;
use App\Models\CollegeSetting;
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
        ]);

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

    public function test_student_can_save_placement_preference(): void
    {
        $response = $this->actingAs($this->studentUser, 'sanctum')->postJson("/api/v1/students/{$this->student->id}/placement", [
            'company_id' => $this->company->id,
            'assigned_role' => 'QA Intern',
        ]);

        $response->assertOk();
        $this->student->refresh();
        $this->assertEquals($this->company->id, $this->student->preferred_company_id);
        $this->assertEquals('Innovate Corp', $this->student->preferred_company);
    }

    public function test_coordinator_can_assign_and_deploy_student_placement(): void
    {
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
