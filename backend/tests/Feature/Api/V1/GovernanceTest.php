<?php

namespace Tests\Feature\Api\V1;

use App\Models\College;
use App\Models\CollegeSetting;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class GovernanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $coordinator;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        College::create(['code' => 'CITE', 'name' => 'College of IT Education']);
        CollegeSetting::create(['college_code' => 'CITE', 'required_hours' => 486, 'max_gpa_cutoff' => 2.50]);

        $this->admin = User::create([
            'name' => 'System Administrator',
            'email' => 'admin@nemsu.edu.ph',
            'role' => 'admin',
        ]);
        $this->coordinator = User::create([
            'name' => 'College Coordinator',
            'email' => 'coord@nemsu.edu.ph',
            'role' => 'coordinator',
            'college_code' => 'CITE',
        ]);
        $this->company = Company::create(['name' => 'Partner Corp', 'college_code' => 'CITE', 'max_slots' => 5]);
    }

    public function test_admin_can_create_partner_company_and_invitation_token_is_generated(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/partners', [
            'name' => 'New Partner Ltd',
            'college_code' => 'CITE',
            'location' => 'Tandag City',
            'role_title' => 'Software Intern',
            'description' => 'Software engineering internship.',
            'required_skills' => ['PHP', 'SQL'],
            'max_slots' => 10,
            'min_gpa' => 2.50,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('company.name', 'New Partner Ltd');

        $this->assertDatabaseHas('companies', [
            'name' => 'New Partner Ltd',
            'college_code' => 'CITE',
        ]);
        $this->assertNotEmpty($response->json('company.invite_token'));
    }

    public function test_supervisor_can_update_only_own_job_posting_fields(): void
    {
        $supervisor = User::create([
            'name' => 'Company Representative',
            'email' => 'rep@partner.ph',
            'role' => 'supervisor',
            'company' => 'Partner Corp',
            'company_id' => $this->company->id,
            'password' => Hash::make('SecretPass123!'),
        ]);
        $this->company->update(['representative_user_id' => $supervisor->id]);

        $response = $this->actingAs($supervisor, 'sanctum')->patchJson("/api/v1/partners/{$this->company->id}", [
            'role_title' => 'Updated QA Intern',
            'description' => 'Updated training scope.',
            'required_skills' => ['Testing'],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('companies', [
            'id' => $this->company->id,
            'role_title' => 'Updated QA Intern',
        ]);
    }

    public function test_admin_can_create_staff_accounts_for_coordinators_and_supervisors(): void
    {
        $coordinatorResponse = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/staff', [
            'role' => 'coordinator',
            'name' => 'New Coordinator',
            'id' => 'newcoord@nemsu.edu.ph',
            'scope' => 'CITE',
        ]);

        $coordinatorResponse->assertStatus(201)
            ->assertJsonPath('user.role', 'coordinator');

        $supervisorResponse = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/staff', [
            'role' => 'supervisor',
            'name' => 'New Host Rep',
            'id' => 'newrep@partner.ph',
            'pass' => 'StrongPassword123!',
            'scope' => (string) $this->company->id,
        ]);

        $supervisorResponse->assertStatus(201)
            ->assertJsonPath('user.role', 'supervisor');
    }

    public function test_college_settings_update_is_scoped_and_audited(): void
    {
        $response = $this->actingAs($this->coordinator, 'sanctum')->putJson('/api/v1/colleges/CITE/settings', [
            'requiredHours' => 500,
            'maxGpaCutoff' => 2.50,
            'ruleAMaxConsecutiveAbsences' => 3,
            'ruleAMaxDeficitPct' => 20,
            'ruleBConsecutiveWeeks' => 2,
            'ruleBClericalKeywords' => ['filing'],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('college_settings', [
            'college_code' => 'CITE',
            'required_hours' => 500,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action_type' => 'SETTINGS_UPDATED',
            'college_code' => 'CITE',
        ]);
    }

    public function test_admin_can_add_policy_clause_and_audit_record_is_created(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/policy-corpus', [
            'chunkId' => 'POL-CITE-001',
            'sourceDoc' => 'OJT Handbook',
            'sectionRef' => 'Section 4.1',
            'title' => 'Attendance requirement',
            'ruleCategory' => 'RULE_A_ATTENDANCE',
            'verbatimText' => 'Students must complete their assigned attendance requirements.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('clause.chunk_id', 'POL-CITE-001');

        $this->assertDatabaseHas('policy_corpus', ['chunk_id' => 'POL-CITE-001']);
        $this->assertDatabaseHas('audit_logs', ['action_type' => 'POLICY_CREATED']);
    }

    public function test_message_communication_boundaries_are_enforced(): void
    {
        $student = User::create([
            'name' => 'Student',
            'email' => 'student@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
            'company' => 'Partner Corp',
            'company_id' => $this->company->id,
        ]);
        $otherStudent = User::create([
            'name' => 'Other Student',
            'email' => 'other@nemsu.edu.ph',
            'role' => 'student',
            'college_code' => 'CITE',
        ]);

        $this->actingAs($student, 'sanctum')->postJson('/api/v1/messages', [
            'recipient_id' => $otherStudent->id,
            'body' => 'This should be blocked.',
        ])->assertStatus(403);

        $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/messages', [
            'recipient_id' => $student->id,
            'body' => 'Administrative notice.',
        ])->assertStatus(201);

        $this->assertDatabaseHas('messages', [
            'sender_id' => $this->admin->id,
            'recipient_id' => $student->id,
        ]);
    }
}
