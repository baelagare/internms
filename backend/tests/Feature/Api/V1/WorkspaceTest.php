<?php

namespace Tests\Feature\Api\V1;

use App\Models\College;
use App\Models\CollegeSetting;
use App\Models\Company;
use App\Models\Placement;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        College::create(['code' => 'CITE', 'name' => 'College of IT Education']);
        College::create(['code' => 'CBM', 'name' => 'College of Business and Management']);

        CollegeSetting::create([
            'college_code' => 'CITE',
            'required_hours' => 486,
            'max_gpa_cutoff' => 2.50,
        ]);

        CollegeSetting::create([
            'college_code' => 'CBM',
            'required_hours' => 300,
            'max_gpa_cutoff' => 2.50,
        ]);
    }

    public function test_unauthenticated_user_cannot_access_workspace(): void
    {
        $response = $this->getJson('/api/v1/workspace');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
                'errors' => [],
            ]);
    }

    public function test_workspace_contract_shape_matches_frontend_expectations(): void
    {
        $admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin@nemsu.edu.ph',
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/workspace');

        $response->assertOk()
            ->assertJsonStructure([
                'academicYear',
                'campus',
                'users',
                'htes',
                'collegeSettings',
                'policyCorpus',
                'logs',
                'dtrDisputes',
                'alerts',
                'evaluations',
                'auditLogs',
                'messages',
                'documents',
            ]);
    }

    public function test_admin_workspace_returns_all_records_across_colleges(): void
    {
        $admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin@nemsu.edu.ph',
            'role' => 'admin',
        ]);

        $citeStudentUser = User::create([
            'name' => 'Alice CITE',
            'email' => 'alice@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
        ]);
        Student::create([
            'user_id' => $citeStudentUser->id,
            'student_number' => '2026-0001',
            'college_code' => 'CITE',
            'program' => 'BSCS',
        ]);

        $cbmStudentUser = User::create([
            'name' => 'Bob CBM',
            'email' => 'bob@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CBM',
        ]);
        Student::create([
            'user_id' => $cbmStudentUser->id,
            'student_number' => '2026-0002',
            'college_code' => 'CBM',
            'program' => 'BSBA',
        ]);

        Company::create(['name' => 'Tech Corp', 'college_code' => 'CITE']);
        Company::create(['name' => 'Finance Inc', 'college_code' => 'CBM']);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/workspace');

        $response->assertOk();
        $users = collect($response->json('users'));
        $htes = collect($response->json('htes'));
        $settings = $response->json('collegeSettings');

        $this->assertTrue($users->contains('email', 'alice@nemsu.edu.ph'));
        $this->assertTrue($users->contains('email', 'bob@nemsu.edu.ph'));
        $this->assertCount(2, $htes);
        $this->assertArrayHasKey('CITE', $settings);
        $this->assertArrayHasKey('CBM', $settings);
    }

    public function test_coordinator_workspace_is_scoped_to_their_college(): void
    {
        $coordinator = User::create([
            'name' => 'Prof. Cruz',
            'email' => 'cruz@nemsu.edu.ph',
            'role' => 'coordinator',
            'college_code' => 'CITE',
        ]);

        $citeStudentUser = User::create([
            'name' => 'Alice CITE',
            'email' => 'alice@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
        ]);
        Student::create([
            'user_id' => $citeStudentUser->id,
            'student_number' => '2026-0001',
            'college_code' => 'CITE',
        ]);

        $cbmStudentUser = User::create([
            'name' => 'Bob CBM',
            'email' => 'bob@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CBM',
        ]);
        Student::create([
            'user_id' => $cbmStudentUser->id,
            'student_number' => '2026-0002',
            'college_code' => 'CBM',
        ]);

        $response = $this->actingAs($coordinator, 'sanctum')->getJson('/api/v1/workspace');

        $response->assertOk();
        $users = collect($response->json('users'));
        $settings = $response->json('collegeSettings');

        $this->assertTrue($users->contains('email', 'alice@nemsu.edu.ph'));
        $this->assertFalse($users->contains('email', 'bob@nemsu.edu.ph'));

        $this->assertArrayHasKey('CITE', $settings);
        $this->assertArrayNotHasKey('CBM', $settings);
    }

    public function test_supervisor_workspace_is_scoped_to_their_interns_and_company(): void
    {
        $companyA = Company::create(['name' => 'Alpha Software', 'college_code' => 'CITE']);
        $companyB = Company::create(['name' => 'Beta Logistics', 'college_code' => 'CITE']);

        $supervisor = User::create([
            'name' => 'Sarah Supervisor',
            'email' => 'sarah@alphasoft.ph',
            'role' => 'supervisor',
            'company' => 'Alpha Software',
            'company_id' => $companyA->id,
        ]);
        $companyA->update(['representative_user_id' => $supervisor->id]);

        $placedStudentUser = User::create([
            'name' => 'Placed Intern',
            'email' => 'placed@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
            'company' => 'Alpha Software',
            'company_id' => $companyA->id,
        ]);
        $placedStudent = Student::create([
            'user_id' => $placedStudentUser->id,
            'student_number' => '2026-0010',
            'college_code' => 'CITE',
        ]);
        Placement::create([
            'student_id' => $placedStudent->id,
            'company_id' => $companyA->id,
            'status' => 'Approved & Deployed',
            'assigned_role' => 'Junior Web Developer',
        ]);

        $otherStudentUser = User::create([
            'name' => 'Other Intern',
            'email' => 'other@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
            'company' => 'Beta Logistics',
            'company_id' => $companyB->id,
        ]);
        Student::create([
            'user_id' => $otherStudentUser->id,
            'student_number' => '2026-0011',
            'college_code' => 'CITE',
        ]);

        $response = $this->actingAs($supervisor, 'sanctum')->getJson('/api/v1/workspace');

        $response->assertOk();
        $users = collect($response->json('users'));
        $htes = collect($response->json('htes'));

        $this->assertTrue($users->contains('email', 'placed@nemsu.edu.ph'));
        $this->assertFalse($users->contains('email', 'other@nemsu.edu.ph'));
        $this->assertTrue($htes->contains('name', 'Alpha Software'));
        $this->assertFalse($htes->contains('name', 'Beta Logistics'));
    }

    public function test_pending_preference_is_separate_from_assigned_company_and_role(): void
    {
        $studentUser = User::create([
            'name' => 'Pending Intern',
            'email' => 'pending@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
            'company' => 'Pending Host',
        ]);
        $host = Company::create([
            'name' => 'Pending Host',
            'college_code' => 'CITE',
            'max_slots' => 3,
            'filled_slots' => 0,
        ]);
        $student = Student::create([
            'user_id' => $studentUser->id,
            'college_code' => 'CITE',
            'preferred_company_id' => $host->id,
            'preferred_company' => $host->name,
            'preferred_role' => 'Preferred QA Role',
            'assigned_role' => null,
        ]);
        Placement::create([
            'student_id' => $student->id,
            'company_id' => $host->id,
            'status' => 'Pending Coordinator Endorsement',
            'assigned_role' => 'Requested Host Role',
        ]);

        $response = $this->actingAs($studentUser, 'sanctum')->getJson('/api/v1/workspace');
        $response->assertOk();

        $record = collect($response->json('users'))->firstWhere('id', $studentUser->id);
        $this->assertSame('Pending Coordinator Endorsement', $record['placementStatus']);
        $this->assertNull($record['company']);
        $this->assertNull($record['company_id']);
        $this->assertNull($record['assignedRole']);
        $this->assertSame('Pending Host', $record['preferredHte']);
        $this->assertSame('Preferred QA Role', $record['preferredRole']);
        $this->assertSame('Pending Coordinator Endorsement', $record['preferenceStatus']);
        $this->assertNull($record['preferenceFeedback']);
    }

    public function test_returned_preference_is_exposed_to_student_with_reason_and_no_assignment(): void
    {
        $studentUser = User::create([
            'name' => 'Returned Intern',
            'email' => 'returned@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
        ]);
        $host = Company::create(['name' => 'Return Host', 'college_code' => 'CITE']);
        $student = Student::create([
            'user_id' => $studentUser->id,
            'college_code' => 'CITE',
            'preferred_company_id' => $host->id,
            'preferred_company' => $host->name,
            'preferred_role' => 'Preferred Analyst Role',
        ]);
        Placement::create([
            'student_id' => $student->id,
            'company_id' => $host->id,
            'status' => 'Returned for Revision',
            'reason' => 'Please choose a role related to your approved academic program.',
        ]);

        $response = $this->actingAs($studentUser, 'sanctum')->getJson('/api/v1/workspace');
        $response->assertOk();

        $record = collect($response->json('users'))->firstWhere('id', $studentUser->id);
        $this->assertSame('Returned for Revision', $record['placementStatus']);
        $this->assertSame('Returned for Revision', $record['preferenceStatus']);
        $this->assertSame('Please choose a role related to your approved academic program.', $record['preferenceFeedback']);
        $this->assertNull($record['company']);
        $this->assertNull($record['assignedRole']);
        $this->assertSame('Return Host', $record['preferredHte']);
        $this->assertSame('Preferred Analyst Role', $record['preferredRole']);
    }

    public function test_deployed_placement_remains_assigned_and_old_pending_preference_is_not_current(): void
    {
        $studentUser = User::create([
            'name' => 'Deployed Intern',
            'email' => 'deployed@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
            'company' => 'Active Host',
        ]);
        $host = Company::create(['name' => 'Active Host', 'college_code' => 'CITE']);
        $oldHost = Company::create(['name' => 'Old Preferred Host', 'college_code' => 'CITE']);
        $student = Student::create([
            'user_id' => $studentUser->id,
            'college_code' => 'CITE',
            'assigned_role' => 'Approved Role',
        ]);
        Placement::create([
            'student_id' => $student->id,
            'company_id' => $oldHost->id,
            'status' => 'Pending Coordinator Endorsement',
            'assigned_role' => 'Old Preferred Role',
        ]);
        Placement::create([
            'student_id' => $student->id,
            'company_id' => $host->id,
            'status' => 'Approved & Deployed',
            'assigned_role' => 'Approved Role',
        ]);

        $response = $this->actingAs($studentUser, 'sanctum')->getJson('/api/v1/workspace');
        $response->assertOk();

        $record = collect($response->json('users'))->firstWhere('id', $studentUser->id);
        $this->assertSame('Approved & Deployed', $record['placementStatus']);
        $this->assertSame('Active Host', $record['company']);
        $this->assertSame($host->id, $record['company_id']);
        $this->assertSame('Approved Role', $record['assignedRole']);
        $this->assertNull($record['preferredHte']);
        $this->assertNull($record['preferredRole']);
    }

    public function test_student_workspace_excludes_other_students(): void
    {
        $studentUserA = User::create([
            'name' => 'Student Alice',
            'email' => 'alice@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
        ]);
        Student::create([
            'user_id' => $studentUserA->id,
            'student_number' => '2026-0100',
            'college_code' => 'CITE',
            'program' => 'BS Information Technology',
            'gpa' => 1.75,
            'bio' => 'Passionate about frontend development',
            'skills' => ['React', 'JavaScript'],
        ]);

        $studentUserB = User::create([
            'name' => 'Student Bob',
            'email' => 'bob@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
        ]);
        Student::create([
            'user_id' => $studentUserB->id,
            'student_number' => '2026-0101',
            'college_code' => 'CITE',
        ]);

        $response = $this->actingAs($studentUserA, 'sanctum')->getJson('/api/v1/workspace');

        $response->assertOk();
        $users = collect($response->json('users'));

        // Alice sees herself, but Bob is excluded
        $this->assertTrue($users->contains('email', 'alice@nemsu.edu.ph'));
        $this->assertFalse($users->contains('email', 'bob@nemsu.edu.ph'));

        $aliceData = $users->firstWhere('email', 'alice@nemsu.edu.ph');
        $this->assertEquals('2026-0100', $aliceData['studentNumber']);
        $this->assertEquals('BS Information Technology', $aliceData['program']);
        $this->assertEquals(1.75, $aliceData['gpa']);
        $this->assertEquals('Passionate about frontend development', $aliceData['portfolioData']['bio']);
        $this->assertEquals(['React', 'JavaScript'], $aliceData['portfolioData']['skills']);
    }
}
