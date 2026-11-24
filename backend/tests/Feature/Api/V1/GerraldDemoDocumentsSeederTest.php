<?php

namespace Tests\Feature\Api\V1;

use App\Models\College;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\GerraldDemoDocumentsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GerraldDemoDocumentsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_creates_missing_required_sample_documents_idempotently(): void
    {
        Storage::fake('local');
        College::create(['code' => 'CITE', 'name' => 'College of IT Education']);
        $coordinator = User::create([
            'name' => 'CITE Coordinator', 'email' => 'coordinator@nemsu.edu.ph',
            'role' => 'coordinator', 'college_code' => 'CITE',
        ]);
        $user = User::create([
            'name' => 'Gerrald Juntilla', 'email' => 'jcjuntilla@nemsu.edu.ph',
            'role' => 'student', 'college_code' => 'CITE',
        ]);
        $student = Student::create([
            'user_id' => $user->id, 'college_code' => 'CITE', 'student_number' => '27-02004',
        ]);

        $seeder = new GerraldDemoDocumentsSeeder;
        $seeder->run();

        $this->assertSame(5, $student->documents()->count());
        foreach ($student->documents()->get() as $document) {
            $this->assertSame('Verified', $document->status);
            $this->assertSame($coordinator->id, $document->reviewer_id);
            Storage::disk('local')->assertExists($document->file_path);
            $this->assertStringStartsWith('%PDF-1.4', Storage::disk('local')->get($document->file_path));
        }

        $seeder->run();
        $this->assertSame(5, $student->documents()->count());
    }

    public function test_demo_seeder_repairs_only_known_metadata_only_seed_documents(): void
    {
        Storage::fake('local');
        College::create(['code' => 'CITE', 'name' => 'College of IT Education']);
        User::create([
            'name' => 'CITE Coordinator', 'email' => 'coordinator@nemsu.edu.ph',
            'role' => 'coordinator', 'college_code' => 'CITE',
        ]);
        $user = User::create([
            'name' => 'Gerrald Juntilla', 'email' => 'jcjuntilla@nemsu.edu.ph',
            'role' => 'student', 'college_code' => 'CITE',
        ]);
        $student = Student::create([
            'user_id' => $user->id, 'college_code' => 'CITE', 'student_number' => '27-02004',
        ]);
        $document = $student->documents()->create([
            'doc_code' => 'MOA', 'title' => 'Legacy Agreement', 'issuer' => 'OJT Office',
            'original_name' => 'moa-27-02004.pdf', 'file_path' => "documents/{$student->id}/moa.pdf",
            'file_size_bytes' => 142850, 'mime_type' => 'application/pdf', 'status' => 'Verified',
        ]);
        $seeder = new GerraldDemoDocumentsSeeder;
        $seeder->run();

        $this->assertSame('Verified', $document->fresh()->status);
        $this->assertSame("documents/{$student->id}/demo-MOA.pdf", $document->fresh()->file_path);
        Storage::disk('local')->assertExists("documents/{$student->id}/demo-MOA.pdf");
        $this->assertSame(5, $student->documents()->count());
    }

    public function test_demo_seeder_verifies_existing_sample_resume_and_preserves_its_file(): void
    {
        Storage::fake('local');
        College::create(['code' => 'CITE', 'name' => 'College of IT Education']);
        $coordinator = User::create([
            'name' => 'CITE Coordinator', 'email' => 'coordinator@nemsu.edu.ph',
            'role' => 'coordinator', 'college_code' => 'CITE',
        ]);
        $user = User::create([
            'name' => 'Gerrald Juntilla', 'email' => 'jcjuntilla@nemsu.edu.ph',
            'role' => 'student', 'college_code' => 'CITE',
        ]);
        $student = Student::create([
            'user_id' => $user->id, 'college_code' => 'CITE', 'student_number' => '27-02004',
        ]);
        $resumePath = "documents/{$student->id}/resume.pdf";
        Storage::disk('local')->put($resumePath, '%PDF-1.4 existing sample resume');
        $resume = $student->documents()->create([
            'doc_code' => 'RESUME', 'title' => 'Résumé / CV', 'issuer' => 'Student',
            'original_name' => 'JUNTILLA_GERRALD_RESUME.pdf', 'file_path' => $resumePath,
            'file_size_bytes' => Storage::disk('local')->size($resumePath), 'mime_type' => 'application/pdf', 'status' => 'Pending',
        ]);

        (new GerraldDemoDocumentsSeeder)->run();

        $this->assertSame('Verified', $resume->fresh()->status);
        $this->assertSame($coordinator->id, $resume->fresh()->reviewer_id);
        $this->assertSame($resumePath, $resume->fresh()->file_path);
        $this->assertSame('%PDF-1.4 existing sample resume', Storage::disk('local')->get($resumePath));
    }
}
