<?php

namespace Tests\Feature\Api\V1;

use App\Models\College;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnrollmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $studentUser;
    protected Student $student;
    protected User $citeCoordinator;
    protected User $cbmCoordinator;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        College::create(['code' => 'CITE', 'name' => 'College of Information Technology Education']);
        College::create(['code' => 'CBM', 'name' => 'College of Business and Management']);

        $this->studentUser = User::create([
            'name' => 'John Doe',
            'email' => 'john.doe@nemsu.edu.ph',
            'role' => 'student',
            'email_verified_at' => now(),
        ]);

        $this->student = Student::create([
            'user_id' => $this->studentUser->id,
            'enrollment_status' => 'PENDING_ONBOARDING',
            'skills' => [],
            'coursework' => [],
            'achievements' => [],
        ]);

        $this->citeCoordinator = User::create([
            'name' => 'CITE Coordinator',
            'email' => 'cite.coord@nemsu.edu.ph',
            'role' => 'coordinator',
            'college_code' => 'CITE',
            'email_verified_at' => now(),
        ]);

        $this->cbmCoordinator = User::create([
            'name' => 'CBM Coordinator',
            'email' => 'cbm.coord@nemsu.edu.ph',
            'role' => 'coordinator',
            'college_code' => 'CBM',
            'email_verified_at' => now(),
        ]);

        $this->admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin@nemsu.edu.ph',
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
    }

    public function test_student_can_submit_onboarding_declaration(): void
    {
        $response = $this->actingAs($this->studentUser, 'sanctum')
            ->postJson('/api/v1/students/me/onboarding', [
                'student_number' => '2026-1001',
                'college_code' => 'CITE',
                'program' => 'BS in Computer Science',
                'phone' => '09123456789',
            ]);

        $response->assertOk()
            ->assertJsonPath('student.student_number', '2026-1001')
            ->assertJsonPath('student.college_code', 'CITE')
            ->assertJsonPath('student.program', 'BS in Computer Science')
            ->assertJsonPath('student.enrollment_status', 'PENDING_APPROVAL');

        $this->student->refresh();
        $this->studentUser->refresh();
        $this->assertEquals('PENDING_APPROVAL', $this->student->enrollment_status);
        $this->assertEquals('CITE', $this->studentUser->college_code);
    }

    public function test_student_onboarding_validates_inputs(): void
    {
        $response = $this->actingAs($this->studentUser, 'sanctum')
            ->postJson('/api/v1/students/me/onboarding', [
                'student_number' => '',
                'college_code' => 'INVALID_CODE',
                'program' => '',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['student_number', 'college_code', 'program']);
    }

    public function test_coordinator_can_approve_student_enrollment_for_own_college(): void
    {
        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson('/api/v1/students/me/onboarding', [
                'student_number' => '2026-1001',
                'college_code' => 'CITE',
                'program' => 'BS in Computer Science',
            ]);

        $response = $this->actingAs($this->citeCoordinator, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/enrollment/approve");

        $response->assertOk()
            ->assertJsonPath('student.enrollment_status', 'APPROVED');

        $this->student->refresh();
        $this->assertEquals('APPROVED', $this->student->enrollment_status);
        $this->assertEquals($this->citeCoordinator->id, $this->student->verified_by_user_id);
    }

    public function test_coordinator_cannot_approve_enrollment_for_another_college(): void
    {
        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson('/api/v1/students/me/onboarding', [
                'student_number' => '2026-1001',
                'college_code' => 'CITE',
                'program' => 'BS in Computer Science',
            ]);

        $response = $this->actingAs($this->cbmCoordinator, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/enrollment/approve");

        $response->assertForbidden();
    }

    public function test_coordinator_can_reject_student_enrollment_with_reason(): void
    {
        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson('/api/v1/students/me/onboarding', [
                'student_number' => '2026-1001',
                'college_code' => 'CITE',
                'program' => 'BS in Computer Science',
            ]);

        $response = $this->actingAs($this->citeCoordinator, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/enrollment/reject", [
                'reason' => 'Student ID does not match the CITE enrollment roster. Please check your college.',
            ]);

        $response->assertOk()
            ->assertJsonPath('student.enrollment_status', 'REJECTED');

        $this->student->refresh();
        $this->assertEquals('REJECTED', $this->student->enrollment_status);
        $this->assertEquals('Student ID does not match the CITE enrollment roster. Please check your college.', $this->student->rejection_reason);

        // Student resubmits after correction
        $resubmitResponse = $this->actingAs($this->studentUser, 'sanctum')
            ->postJson('/api/v1/students/me/onboarding', [
                'student_number' => '2026-1002',
                'college_code' => 'CBM',
                'program' => 'Financial Management',
            ]);

        $resubmitResponse->assertOk()
            ->assertJsonPath('student.enrollment_status', 'PENDING_APPROVAL');
        $this->student->refresh();
        $this->assertNull($this->student->rejection_reason);
    }

    public function test_admin_can_approve_enrollment_for_any_college(): void
    {
        $this->actingAs($this->studentUser, 'sanctum')
            ->postJson('/api/v1/students/me/onboarding', [
                'student_number' => '2026-1001',
                'college_code' => 'CITE',
                'program' => 'BS in Computer Science',
            ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/students/{$this->student->id}/enrollment/approve");

        $response->assertOk()
            ->assertJsonPath('student.enrollment_status', 'APPROVED');
    }
}
