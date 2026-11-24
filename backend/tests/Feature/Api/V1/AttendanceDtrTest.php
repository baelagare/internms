<?php

namespace Tests\Feature\Api\V1;

use App\Models\AttendanceLog;
use App\Models\College;
use App\Models\Company;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttendanceDtrTest extends TestCase
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
            'gpa' => 1.75,
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
    }

    private function recordFullDayWithPhoto(): void
    {
        foreach ([
            ['type' => 'am_in', 'time' => '08:00'],
            ['type' => 'am_out', 'time' => '12:00'],
            ['type' => 'pm_in', 'time' => '13:00'],
        ] as $punch) {
            $this->actingAs($this->studentUser, 'sanctum')
                ->postJson('/api/v1/attendance/punches', $punch + ['date' => '2026-11-02'])->assertOk();
        }

        $this->actingAs($this->studentUser, 'sanctum')->postJson('/api/v1/attendance/punches', [
            'type' => 'pm_out',
            'date' => '2026-11-02',
            'time' => '17:00',
            'photo' => UploadedFile::fake()->create('punch.jpg', 100, 'image/jpeg'),
        ])->assertOk();
    }

    public function test_student_punch_stores_the_camera_photo_on_the_record(): void
    {
        $this->recordFullDayWithPhoto();

        $log = AttendanceLog::where('student_id', $this->student->id)->whereDate('date', '2026-11-02')->first();
        $this->assertNotNull($log->pm_out_photo_path);
        Storage::disk('local')->assertExists($log->pm_out_photo_path);
        $this->assertNull($log->am_in_photo_path);
        $this->assertSame(8.0, (float) $log->hours);
    }

    public function test_dtr_two_stage_review_supervisor_then_coordinator(): void
    {
        $this->recordFullDayWithPhoto();
        $log = AttendanceLog::where('student_id', $this->student->id)->whereDate('date', '2026-11-02')->first();
        $this->assertSame('Submitted', $log->status);

        // Supervisor verification is stage one and must not credit hours.
        $this->actingAs($this->supervisorUser, 'sanctum')->postJson("/api/v1/attendance-logs/{$log->id}/verify", [
            'status' => 'Supervisor Verified',
            'supervisor_notes' => 'Punch photos confirmed on site.',
        ])->assertOk();

        $log->refresh();
        $this->assertSame('Supervisor Verified', $log->status);
        $this->assertSame($this->supervisorUser->id, $log->supervisor_id);
        $this->assertNull($log->coordinator_id);

        // Coordinator approval is stage two and credits the record.
        $this->actingAs($this->coordinatorUser, 'sanctum')->postJson("/api/v1/attendance-logs/{$log->id}/review", [
            'status' => 'Coordinator Approved',
            'coordinator_notes' => 'Hours credited toward OJT quota.',
        ])->assertOk();

        $log->refresh();
        $this->assertSame('Coordinator Approved', $log->status);
        $this->assertSame($this->coordinatorUser->id, $log->coordinator_id);
    }

    public function test_a_supervisor_cannot_verify_another_companies_dtr(): void
    {
        $this->recordFullDayWithPhoto();
        $log = AttendanceLog::where('student_id', $this->student->id)->whereDate('date', '2026-11-02')->first();

        $otherCompany = Company::create(['name' => 'Other Corp', 'college_code' => 'CITE']);
        $otherSupervisor = User::create([
            'name' => 'Other Supervisor',
            'email' => 'other@othercorp.ph',
            'role' => 'supervisor',
            'company' => 'Other Corp',
            'company_id' => $otherCompany->id,
        ]);

        $this->actingAs($otherSupervisor, 'sanctum')
            ->postJson("/api/v1/attendance-logs/{$log->id}/verify", ['status' => 'Supervisor Verified'])
            ->assertStatus(403);
    }
    public function test_punch_photo_download_is_role_and_company_scoped(): void
    {
        $this->recordFullDayWithPhoto();
        $log = AttendanceLog::where('student_id', $this->student->id)->whereDate('date', '2026-11-02')->first();

        // The owning student can download their own photo.
        $this->actingAs($this->studentUser, 'sanctum')
            ->get("/api/v1/attendance-logs/{$log->id}/photo/pm_out")->assertOk();

        // The assigned host supervisor and college coordinator can view it.
        $this->actingAs($this->supervisorUser, 'sanctum')
            ->get("/api/v1/attendance-logs/{$log->id}/photo/pm_out")->assertOk();
        $this->actingAs($this->coordinatorUser, 'sanctum')
            ->get("/api/v1/attendance-logs/{$log->id}/photo/pm_out")->assertOk();

        // An unrelated supervisor cannot.
        $otherCompany = Company::create(['name' => 'Other Corp', 'college_code' => 'CITE']);
        $otherSupervisor = User::create([
            'name' => 'Other Supervisor',
            'email' => 'other@othercorp.ph',
            'role' => 'supervisor',
            'company' => 'Other Corp',
            'company_id' => $otherCompany->id,
        ]);
        $this->actingAs($otherSupervisor, 'sanctum')
            ->get("/api/v1/attendance-logs/{$log->id}/photo/pm_out")->assertStatus(403);

        // A punch with no photo returns a clean 404.
        $this->actingAs($this->studentUser, 'sanctum')
            ->get("/api/v1/attendance-logs/{$log->id}/photo/am_in")->assertStatus(404);
    }

    public function test_workspace_exposes_dtr_status_and_photo_availability(): void
    {
        $this->recordFullDayWithPhoto();
        $log = AttendanceLog::where('student_id', $this->student->id)->whereDate('date', '2026-11-02')->first();
        $log->update(['status' => 'Supervisor Verified', 'supervisor_id' => $this->supervisorUser->id]);

        $response = $this->actingAs($this->coordinatorUser, 'sanctum')->getJson('/api/v1/workspace')->assertOk();
        $dtr = collect($response->json('logs'))->firstWhere('apiId', $log->id);

        $this->assertSame('daily_punch', $dtr['type']);
        $this->assertSame('Supervisor Verified', $dtr['status']);
        $this->assertTrue($dtr['pmOutPhoto']);
        $this->assertFalse($dtr['amInPhoto']);
    }
}


