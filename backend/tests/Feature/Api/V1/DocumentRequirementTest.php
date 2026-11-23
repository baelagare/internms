<?php

namespace Tests\Feature\Api\V1;

use App\Models\College;
use App\Models\CollegeDocumentRequirement;
use App\Models\CollegeSetting;
use App\Models\Document;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentRequirementTest extends TestCase
{
    use RefreshDatabase;

    private User $coordinator;
    private User $studentUser;
    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();
        College::create(['code' => 'CITE', 'name' => 'College of IT Education']);
        CollegeSetting::create(['college_code' => 'CITE', 'required_hours' => 486, 'max_gpa_cutoff' => 2.5]);
        $this->coordinator = User::create(['name' => 'Coordinator', 'email' => 'coord@test.edu', 'role' => 'coordinator', 'college_code' => 'CITE']);
        $this->studentUser = User::create(['name' => 'Student', 'email' => 'student@test.edu', 'role' => 'student', 'college_code' => 'CITE']);
        $this->student = Student::create(['user_id' => $this->studentUser->id, 'college_code' => 'CITE', 'student_number' => 'T-1']);
    }

    public function test_coordinator_can_create_and_deactivate_requirement_for_own_college(): void
    {
        $response = $this->actingAs($this->coordinator, 'sanctum')->postJson('/api/v1/colleges/CITE/document-requirements', [
            'docCode' => 'SAFETY_TRAINING', 'title' => 'Safety Training Certificate', 'isRequired' => true,
        ]);
        $response->assertCreated()->assertJsonPath('requirement.docCode', 'SAFETY_TRAINING');
        $id = $response->json('requirement.id');
        $this->actingAs($this->coordinator, 'sanctum')->deleteJson("/api/v1/college-document-requirements/{$id}")->assertOk();
        $this->assertDatabaseHas('college_document_requirements', ['id' => $id, 'is_active' => false]);
    }

    public function test_coordinator_cannot_manage_another_college_requirement(): void
    {
        College::create(['code' => 'CBM', 'name' => 'College of Business']);
        $this->actingAs($this->coordinator, 'sanctum')->postJson('/api/v1/colleges/CBM/document-requirements', [
            'docCode' => 'MOA', 'title' => 'Agreement',
        ])->assertForbidden();
    }

    public function test_workspace_includes_configured_requirement_even_without_uploaded_file(): void
    {
        $response = $this->actingAs($this->studentUser, 'sanctum')->getJson('/api/v1/workspace')->assertOk();
        $student = collect($response->json('users'))->firstWhere('role', 'student');
        $requirement = collect($student['preDeploymentDocs'])->firstWhere('docCode', 'MOA');
        $this->assertSame('Not Uploaded', $requirement['status']);
        $this->assertSame('MOA', $requirement['docCode']);
        $this->assertNull($requirement['documentId']);
    }

    public function test_workspace_matches_uploaded_file_to_configured_requirement(): void
    {
        Document::create(['student_id' => $this->student->id, 'doc_code' => 'MOA', 'title' => 'Old title', 'original_name' => 'agreement.pdf', 'file_path' => 'docs/agreement.pdf', 'file_size_bytes' => 100, 'mime_type' => 'application/pdf', 'status' => 'Verified']);
        $response = $this->actingAs($this->studentUser, 'sanctum')->getJson('/api/v1/workspace')->assertOk();
        $student = collect($response->json('users'))->firstWhere('role', 'student');
        $requirement = collect($student['preDeploymentDocs'])->firstWhere('docCode', 'MOA');
        $this->assertSame('Verified', $requirement['status']);
        $this->assertSame('agreement.pdf', $requirement['fileName']);
    }
}
