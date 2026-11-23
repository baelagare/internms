<?php

namespace Database\Seeders;

use App\Models\AttendanceLog;
use App\Models\College;
use App\Models\Company;
use App\Models\Document;
use App\Models\Evaluation;
use App\Models\Placement;
use App\Models\PolicyClause;
use App\Models\RiskAlert;
use App\Models\Student;
use App\Models\TaskReport;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class InstitutionalDataSeeder extends Seeder
{
    public function run(): void
    {
        if (! College::where('code', 'CITE')->exists()) {
            $this->call(CollegeSeeder::class);
        }

        // 1. Institutional Leadership & 5 College Coordinators
        $admin = User::firstOrCreate(['email' => 'internship.office@nemsu.edu.ph'], [
            'name' => 'Dr. Elena V. Mercado',
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $coordinatorDefs = [
            'CITE' => ['Prof. Mark Anthony Villanueva', 'cite.coordinator@nemsu.edu.ph'],
            'CBM' => ['Prof. Maria Teresa S. Ramos', 'cbm.coordinator@nemsu.edu.ph'],
            'CAS' => ['Dr. Roberto C. Alcantara', 'cas.coordinator@nemsu.edu.ph'],
            'CET' => ['Engr. Arnel M. Bautista', 'cet.coordinator@nemsu.edu.ph'],
            'CTE' => ['Dr. Cynthia P. Lumapas', 'cte.coordinator@nemsu.edu.ph'],
        ];

        $coordinators = [];
        foreach ($coordinatorDefs as $code => [$name, $email]) {
            $coordinators[$code] = User::updateOrCreate(['email' => $email], [
                'name' => $name,
                'role' => 'coordinator',
                'college_code' => $code,
                'email_verified_at' => now(),
            ]);
        }

        // 2. Partner Companies (22 HTEs across 5 Colleges)
        $companiesData = json_decode(file_get_contents(__DIR__.'/companies_data.json'), true);

        $seededCompanies = [];
        foreach ($companiesData as $c) {
            $supUser = User::firstOrCreate(['email' => $c['supEmail']], [
                'name' => $c['supName'],
                'role' => 'supervisor',
                'company' => $c['name'],
                'password' => Hash::make('Password123!'),
                'email_verified_at' => now(),
            ]);

            $company = Company::updateOrCreate(['name' => $c['name']], [
                'college_code' => $c['college'],
                'location' => $c['location'],
                'role_title' => $c['role'],
                'description' => "Accredited Host Training Establishment for {$c['college']} interns, offering structured training plans and professional mentorship.",
                'required_skills' => $c['skills'],
                'max_slots' => $c['slots'],
                'filled_slots' => $c['filled'],
                'min_gpa' => $c['gpa'],
                'representative_user_id' => $supUser->id,
                'supervisor_name' => $c['supName'],
                'supervisor_email' => $c['supEmail'],
            ]);

            $supUser->update(['company_id' => $company->id]);
            $seededCompanies[$c['name']] = $company;
        }

        // 3. Students Cohort (319 Students across 22 Academic Programs)
        $studentsRaw = json_decode(file_get_contents(__DIR__.'/cohort_data.json'), true);

        $now = now();
        $userEmails = array_column($studentsRaw, 'email');
        $existingUsers = User::whereIn('email', $userEmails)->orWhereIn('id', [2, 5])->get()->keyBy(function ($u) {
            return $u->id === 2 ? 'rabglinogo@nemsu.edu.ph' : ($u->id === 5 ? 'jcjuntilla@nemsu.edu.ph' : $u->email);
        });

        // Batch insert new users
        $newUsers = [];
        foreach ($studentsRaw as $st) {
            $assignedComp = !empty($st['assigned_company']) && isset($seededCompanies[$st['assigned_company']]) ? $seededCompanies[$st['assigned_company']] : null;
            if (!$existingUsers->has($st['email'])) {
                $newUsers[] = [
                    'name' => $st['name'],
                    'email' => $st['email'],
                    'role' => 'student',
                    'college_code' => $st['college'],
                    'company' => $st['assigned_company'] ?? null,
                    'company_id' => $assignedComp?->id,
                    'email_verified_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }
        foreach (array_chunk($newUsers, 100) as $chunk) {
            DB::table('users')->insertOrIgnore($chunk);
        }

        // Re-query all student users
        $allStudentUsers = User::whereIn('email', $userEmails)->orWhereIn('id', [2, 5])->get()->keyBy(function ($u) {
            return $u->id === 2 ? 'rabglinogo@nemsu.edu.ph' : ($u->id === 5 ? 'jcjuntilla@nemsu.edu.ph' : $u->email);
        });

        // Update User 2 (Racel Ann Glinogo) & User 5 (Gerrald Juntilla)
        if ($u2 = $allStudentUsers->get('rabglinogo@nemsu.edu.ph')) {
            $u2->update(['name' => 'Racel Ann Glinogo', 'college_code' => 'CBM']);
        }
        if ($u5 = $allStudentUsers->get('jcjuntilla@nemsu.edu.ph')) {
            $citeComp = $seededCompanies['Caraga Digital Solutions Inc.'] ?? null;
            $u5->update([
                'name' => 'Gerrald Juntilla',
                'college_code' => 'CITE',
                'company' => $citeComp?->name,
                'company_id' => $citeComp?->id,
            ]);
        }

        // Pre-query existing students
        $existingStudents = Student::whereIn('user_id', $allStudentUsers->pluck('id'))->get()->keyBy('user_id');

        $newStudents = [];
        foreach ($studentsRaw as $st) {
            $user = $allStudentUsers->get($st['email']);
            if (!$user) continue;

            $assignedComp = !empty($st['assigned_company']) && isset($seededCompanies[$st['assigned_company']]) ? $seededCompanies[$st['assigned_company']] : null;
            $prefComp = !empty($st['preferred_company']) && isset($seededCompanies[$st['preferred_company']]) ? $seededCompanies[$st['preferred_company']] : null;
            $coord = $coordinators[$st['college']] ?? $coordinators['CITE'];

            if ($existingStudents->has($user->id)) {
                $existingStudents->get($user->id)->update([
                    'student_number' => $st['number'],
                    'college_code' => $st['college'],
                    'program' => $st['program'],
                    'enrollment_status' => 'APPROVED',
                    'gpa' => $st['gpa'],
                    'skills' => $st['skills'],
                    'coursework' => $st['coursework'],
                    'achievements' => [],
                    'bio' => $st['bio'],
                    'disciplinary_clearance' => 'Cleared & Certified',
                    'clearance_status' => !empty($st['cleared']) ? 'Cleared & Certified' : null,
                    'preferred_company' => $st['preferred_company'] ?? null,
                    'preferred_company_id' => $prefComp?->id,
                    'assigned_role' => $st['role'] ?? ($assignedComp ? $assignedComp->role_title : null),
                    'verified_by_user_id' => $coord->id,
                    'verified_at' => $now,
                ]);
            } else {
                $newStudents[] = [
                    'user_id' => $user->id,
                    'student_number' => $st['number'],
                    'college_code' => $st['college'],
                    'program' => $st['program'],
                    'enrollment_status' => 'APPROVED',
                    'gpa' => $st['gpa'],
                    'skills' => json_encode($st['skills']),
                    'coursework' => json_encode($st['coursework']),
                    'achievements' => json_encode([]),
                    'bio' => $st['bio'],
                    'disciplinary_clearance' => 'Cleared & Certified',
                    'clearance_status' => !empty($st['cleared']) ? 'Cleared & Certified' : null,
                    'preferred_company' => $st['preferred_company'] ?? null,
                    'preferred_company_id' => $prefComp?->id,
                    'assigned_role' => $st['role'] ?? ($assignedComp ? $assignedComp->role_title : null),
                    'verified_by_user_id' => $coord->id,
                    'verified_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        foreach (array_chunk($newStudents, 100) as $chunk) {
            DB::table('students')->insertOrIgnore($chunk);
        }

        // Re-query all students mapped by user_id
        $allStudentsMap = Student::whereIn('user_id', $allStudentUsers->pluck('id'))->get()->keyBy('user_id');

        // Batch Placements and Documents
        $existingPlacements = Placement::whereIn('student_id', $allStudentsMap->pluck('id'))->pluck('student_id')->flip();
        $existingDocs = Document::whereIn('student_id', $allStudentsMap->pluck('id'))->select('student_id', 'doc_code')->get()->map(fn($d) => "{$d->student_id}_{$d->doc_code}")->flip();

        $placementsBatch = [];
        $documentsBatch = [];

        foreach ($studentsRaw as $st) {
            $user = $allStudentUsers->get($st['email']);
            if (!$user) continue;
            $student = $allStudentsMap->get($user->id);
            if (!$student) continue;

            $assignedComp = !empty($st['assigned_company']) && isset($seededCompanies[$st['assigned_company']]) ? $seededCompanies[$st['assigned_company']] : null;
            $prefComp = !empty($st['preferred_company']) && isset($seededCompanies[$st['preferred_company']]) ? $seededCompanies[$st['preferred_company']] : null;
            $coord = $coordinators[$st['college']] ?? $coordinators['CITE'];

            if (!$existingPlacements->has($student->id)) {
                if ($assignedComp) {
                    $placementsBatch[] = [
                        'student_id' => $student->id,
                        'company_id' => $assignedComp->id,
                        'status' => 'Approved & Deployed',
                        'assigned_role' => $st['role'] ?? $assignedComp->role_title,
                        'reason' => 'Official institutional deployment approved by College OJT Coordinator.',
                        'endorsed_by_user_id' => $coord->id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                } elseif ($prefComp) {
                    $placementsBatch[] = [
                        'student_id' => $student->id,
                        'company_id' => $prefComp->id,
                        'status' => 'Pending Coordinator Endorsement',
                        'assigned_role' => $prefComp->role_title,
                        'reason' => 'Student placement preference submitted for coordinator review and endorsement.',
                        'endorsed_by_user_id' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            $docSpecs = [
                ['MOA', 'Memorandum of Agreement', 'Verified'],
                ['MEDICAL_CERT', 'Medical Clearance Certificate', 'Verified'],
                ['PARENT_CONSENT', 'Parent / Guardian Consent Form', 'Verified'],
                ['INSURANCE', 'Student Internship Insurance Policy', ($st['name'] === 'Kenneth B. Alcantara') ? 'Pending' : 'Verified'],
            ];

            foreach ($docSpecs as [$code, $title, $docStatus]) {
                if (!$existingDocs->has("{$student->id}_{$code}")) {
                    $documentsBatch[] = [
                        'student_id' => $student->id,
                        'doc_code' => $code,
                        'title' => $title,
                        'issuer' => 'University Health and Student Affairs Office',
                        'original_name' => strtolower($code).'-'.$student->student_number.'.pdf',
                        'file_path' => 'documents/'.$student->id.'/'.strtolower($code).'.pdf',
                        'file_size_bytes' => 142850,
                        'mime_type' => 'application/pdf',
                        'status' => $docStatus,
                        'reviewer_id' => $docStatus === 'Verified' ? $coord->id : null,
                        'remarks' => $docStatus === 'Verified' ? 'Document verified by College OJT Coordinator.' : 'Pending receipt of endorsed physical copy.',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        foreach (array_chunk($placementsBatch, 100) as $chunk) {
            DB::table('placements')->insertOrIgnore($chunk);
        }
        foreach (array_chunk($documentsBatch, 100) as $chunk) {
            DB::table('documents')->insertOrIgnore($chunk);
        }

        // 4. Specific Scenarios
        // Gerrald Juntilla (CITE CS - User 5): 35 days attendance (280 hrs), 4 task reports, midterm evaluation
        $gjStudent = Student::where('user_id', 5)->first();
        if ($gjStudent) {
            $citeComp = $seededCompanies['Caraga Digital Solutions Inc.'] ?? null;
            $sup = User::where('email', 'rsantos@caragadigital.ph')->first();
            $citeCoord = $coordinators['CITE'];

            for ($d = 1; $d <= 35; $d++) {
                AttendanceLog::firstOrCreate(['student_id' => $gjStudent->id, 'date' => now()->subDays(50 - $d)->toDateString()], [
                    'am_in' => '08:00',
                    'am_out' => '12:00',
                    'pm_in' => '13:00',
                    'pm_out' => '17:00',
                    'hours' => 8.0,
                    'status' => 'Coordinator Approved',
                    'supervisor_id' => $sup?->id,
                    'coordinator_id' => $citeCoord->id,
                ]);
            }

            for ($w = 1; $w <= 4; $w++) {
                TaskReport::firstOrCreate(['student_id' => $gjStudent->id, 'week' => $w], [
                    'period_start' => now()->subWeeks(6 - $w)->startOfWeek()->toDateString(),
                    'period_end' => now()->subWeeks(6 - $w)->endOfWeek()->toDateString(),
                    'hours' => 40.0,
                    'summary' => 'Implemented database query modules, engineered React frontend components, and conducted code review sessions for the enterprise application system.',
                    'status' => 'Coordinator Approved',
                    'supervisor_id' => $sup?->id,
                    'supervisor_notes' => 'Exceptional technical focus, rapid learning curve, and clean code practices.',
                    'coordinator_id' => $citeCoord->id,
                    'coordinator_notes' => 'Weekly learning deliverables confirmed aligned with Computer Science competencies.',
                ]);
            }

            $gjScores = [];
            for ($q = 1; $q <= 19; $q++) { $gjScores['q'.$q] = in_array($q, [2, 6, 11]) ? 4 : 5; }
            Evaluation::firstOrCreate(['student_id' => $gjStudent->id, 'period' => 'Midterm'], [
                'supervisor_id' => $sup?->id ?? $admin->id,
                'company_id' => $citeComp?->id ?? 1,
                'academic_year' => 'A.Y. 2026–2027',
                'scores' => $gjScores,
                'total_score' => 89,
                'average_score' => 4.68,
                'percentage' => 93.7,
                'recommendation' => 'Outstanding',
                'feedback' => 'Demonstrates strong algorithmic foundation, proactive communication, and high diligence in task completion.',
                'coordinator_clearance_status' => 'Pending Coordinator Review',
            ]);
        }

        // Noel R. Rivas: 3 consecutive unexcused absences triggering RULE_A_ATTENDANCE
        $noelUser = User::where('email', 'nrrivas@nemsu.edu.ph')->first();
        if ($noelUser && $noelUser->student) {
            $noel = $noelUser->student;
            for ($i = 3; $i >= 1; $i--) {
                AttendanceLog::firstOrCreate(['student_id' => $noel->id, 'date' => now()->subDays($i)->toDateString()], [
                    'hours' => 0.0,
                    'status' => 'Submitted',
                ]);
            }
            RiskAlert::firstOrCreate(['student_id' => $noel->id, 'rule_key' => 'RULE_A_ATTENDANCE'], [
                'college_code' => 'CITE',
                'rule_label' => 'Consecutive Absences & Deficit Risk',
                'triggers' => ['3 consecutive unexcused absences recorded during the current training cycle.'],
                'evidence' => [
                    'consecutive_unexcused_days' => 3,
                    'dates' => [now()->subDays(3)->toDateString(), now()->subDays(2)->toDateString(), now()->subDays(1)->toDateString()],
                    'deficit_hours' => 24.0,
                ],
                'status' => 'PENDING',
                'intervention_stage' => 'warning_1',
            ]);
        }

        // Talia J. Mendoza: clerical tasks triggering RULE_B_MISALIGNMENT (Dispatched)
        $taliaUser = User::where('email', 'tjmendoza@nemsu.edu.ph')->first();
        if ($taliaUser && $taliaUser->student) {
            $talia = $taliaUser->student;
            $waterSupervisor = User::where('email', 'areyes@tandagwater.gov.ph')->first();
            $citeCoord = $coordinators['CITE'];
            foreach ([1 => 'Organized customer application folders, executed photocopying of billing statements, and handled office document sorting.', 2 => 'Continued document photocopying for consumer records, filing billing slips, and running department administrative errands.'] as $week => $summary) {
                TaskReport::firstOrCreate(['student_id' => $talia->id, 'week' => $week], [
                    'period_start' => now()->subWeeks(3 - $week)->startOfWeek()->toDateString(),
                    'period_end' => now()->subWeeks(3 - $week)->endOfWeek()->toDateString(),
                    'hours' => 40.0,
                    'summary' => $summary,
                    'status' => 'Supervisor Verified',
                    'supervisor_id' => $waterSupervisor?->id,
                    'supervisor_notes' => 'Trainee assisted administrative support staff with office archiving tasks.',
                ]);
            }
            RiskAlert::firstOrCreate(['student_id' => $talia->id, 'rule_key' => 'RULE_B_MISALIGNMENT'], [
                'college_code' => 'CITE',
                'rule_label' => 'Task Non-Alignment & Clerical Work',
                'triggers' => ['Task reports for consecutive weeks contain repetitive clerical keywords: photocopying, filing, running errands.'],
                'evidence' => [
                    'consecutive_weeks' => 2,
                    'matched_keywords' => ['photocopying', 'filing', 'running errands'],
                    'report_weeks' => [1, 2],
                ],
                'status' => 'DISPATCHED',
                'intervention_stage' => 'warning_1',
                'dispatched_message' => 'Please coordinate with your immediate supervisor and OJT coordinator to ensure daily tasks align with your approved computer science internship training plan.',
                'reviewed_by_user_id' => $citeCoord->id,
                'reviewed_at' => now()->subDay(),
            ]);
        }

        // Kenneth B. Alcantara: RULE_C_DOCS (Dismissed)
        $kennethUser = User::where('email', 'kbalcantara@nemsu.edu.ph')->first();
        if ($kennethUser && $kennethUser->student) {
            $kenneth = $kennethUser->student;
            $citeCoord = $coordinators['CITE'];
            RiskAlert::firstOrCreate(['student_id' => $kenneth->id, 'rule_key' => 'RULE_C_DOCS'], [
                'college_code' => 'CITE',
                'rule_label' => 'Pre-Deployment Document Compliance Gap',
                'triggers' => ['Insurance policy certificate unverified prior to field deployment.'],
                'evidence' => [
                    'pending_document' => 'INSURANCE',
                    'submission_state' => 'Pending Physical Copy',
                ],
                'status' => 'DISMISSED',
                'intervention_stage' => null,
                'dismissed_reason' => 'Student presented official insurance policy receipt endorsed by Student Affairs; verified manually.',
                'reviewed_by_user_id' => $citeCoord->id,
                'reviewed_at' => now()->subDays(2),
            ]);
        }

        // Iris D. Dominguez: Completed hours and Final Evaluation
        $irisUser = User::where('email', 'iddominguez@nemsu.edu.ph')->first();
        if ($irisUser && $irisUser->student) {
            $iris = $irisUser->student;
            $pitoComp = $seededCompanies['Provincial Information Technology Office — Surigao del Sur'] ?? null;
            $citeCoord = $coordinators['CITE'];
            for ($w = 1; $w <= 12; $w++) {
                AttendanceLog::firstOrCreate(['student_id' => $iris->id, 'date' => now()->subWeeks(13 - $w)->startOfWeek()->toDateString()], [
                    'am_in' => '08:00',
                    'am_out' => '12:00',
                    'pm_in' => '13:00',
                    'pm_out' => '17:00',
                    'hours' => 40.5,
                    'status' => 'Coordinator Approved',
                    'coordinator_id' => $citeCoord->id,
                ]);
            }
            $irisScores = [];
            for ($q = 1; $q <= 19; $q++) { $irisScores['q'.$q] = in_array($q, [3, 7, 14]) ? 4 : 5; }
            Evaluation::firstOrCreate(['student_id' => $iris->id, 'period' => 'Final'], [
                'supervisor_id' => $admin->id,
                'company_id' => $pitoComp?->id ?? 1,
                'academic_year' => 'A.Y. 2026–2027',
                'scores' => $irisScores,
                'total_score' => 92,
                'average_score' => 4.84,
                'percentage' => 96.8,
                'recommendation' => 'Outstanding',
                'feedback' => 'Demonstrated exceptional technical capability in building front-end views for the provincial digital records portal. Highly dependable and self-driven.',
                'coordinator_clearance_status' => 'Cleared & Certified',
                'certified_by_user_id' => $citeCoord->id,
                'certified_at' => now(),
            ]);
        }

        // 5. Policy Corpus (CHED & NEMSU Regulations)
        $policies = [
            [
                'chunk_id' => 'CHED-CMO104-S2017-SEC12',
                'source_doc' => 'CHED CMO No. 104, Series of 2017',
                'section_ref' => 'Section 12.1 — Attendance and Punctuality',
                'title' => 'Student Attendance Standards and Absence Thresholds',
                'rule_category' => 'RULE_A_ATTENDANCE',
                'verbatim_text' => 'Student interns must observe regular working hours agreed upon by the HEI and Host Training Establishment. Unexcused consecutive absences exceeding three (3) working days shall be reported immediately to the OJT Coordinator for formal academic intervention.',
            ],
            [
                'chunk_id' => 'CHED-CMO104-S2017-SEC13',
                'source_doc' => 'CHED CMO No. 104, Series of 2017',
                'section_ref' => 'Section 13.2 — Internship Tasks and Mentorship',
                'title' => 'Alignment of Internship Deliverables with Academic Program',
                'rule_category' => 'RULE_B_MISALIGNMENT',
                'verbatim_text' => 'Internship assignments must directly correspond with the competencies of the academic curriculum. Trainees must not be relegated to purely clerical, menial, or personal errands unrelated to their professional field of study.',
            ],
            [
                'chunk_id' => 'NEMSU-OJT-MANUAL-2026-SEC4',
                'source_doc' => 'NEMSU Student Internship Policy Manual (2026)',
                'section_ref' => 'Chapter IV, Subsection 4.3 — Pre-Deployment Requirements',
                'title' => 'Mandatory Clearances and Verification Sequence',
                'rule_category' => 'RULE_C_DOCS',
                'verbatim_text' => 'Prior to official deployment to host training partner facilities, interns must submit all required compliance documentation including Memorandum of Agreement, Parent/Guardian Consent, Medical Certificate, and Student Insurance.',
            ],
        ];

        foreach ($policies as $pol) {
            PolicyClause::firstOrCreate(['chunk_id' => $pol['chunk_id']], [
                'source_doc' => $pol['source_doc'],
                'section_ref' => $pol['section_ref'],
                'title' => $pol['title'],
                'rule_category' => $pol['rule_category'],
                'verbatim_text' => $pol['verbatim_text'],
                'status' => 'ACTIVE',
                'last_indexed_at' => now(),
                'created_by_user_id' => $admin->id,
            ]);
        }
    }
}
