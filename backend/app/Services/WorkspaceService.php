<?php

namespace App\Services;

use App\Models\AttendanceAdjustment;
use App\Models\AttendanceLog;
use App\Models\College;
use App\Models\CollegeSetting;
use App\Models\CollegeDocumentRequirement;
use App\Models\Company;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\Evaluation;
use App\Models\Message;
use App\Models\PolicyClause;
use App\Models\RiskAlert;
use App\Models\Student;
use App\Models\TaskReport;
use App\Models\User;

class WorkspaceService
{
    /**
     * Build the scoped workspace dataset for an authenticated user.
     *
     * @param User $user
     * @return array<string, mixed>
     */
    public function forUser(User $user): array
    {
        $academicYear = config('app.academic_year', 'A.Y. 2026–2027');
        $campus = config('app.campus', 'NEMSU Main Campus');

        $users = $this->buildUsers($user);
        $htes = $this->buildHtes($user);
        $collegeSettings = $this->buildCollegeSettings($user);
        $logs = $this->buildLogs($user);
        $dtrDisputes = $this->buildDtrDisputes($user);
        $evaluations = $this->buildEvaluations($user);
        $alerts = $this->buildAlerts($user);
        $policyCorpus = $this->buildPolicyCorpus($user);
        $messages = $this->buildMessages($user);
        $auditLogs = $this->buildAuditLogs($user);

        return [
            'academicYear' => $academicYear,
            'campus' => $campus,
            'users' => $users,
            'htes' => $htes,
            'collegeSettings' => $collegeSettings,
            'policyCorpus' => $policyCorpus,
            'logs' => $logs,
            'dtrDisputes' => $dtrDisputes,
            'alerts' => $alerts,
            'evaluations' => $evaluations,
            'auditLogs' => $auditLogs,
            'messages' => $messages,
            'documents' => [],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildUsers(User $currentUser): array
    {
        $query = User::with([
            'student',
            'student.activePlacement.company',
            'student.pendingPreference.company',
            'student.preferredCompany',
            'student.documents.reviewer',
        ]);

        if ($currentUser->isStudent()) {
            $query->where(function ($q) use ($currentUser) {
                $q->where('id', $currentUser->id)
                    ->orWhere('role', 'admin')
                    ->orWhere(function ($q2) use ($currentUser) {
                        $q2->where('role', 'coordinator')
                            ->where('college_code', $currentUser->college_code);
                    });

                if ($currentUser->company_id) {
                    $q->orWhere(function ($q3) use ($currentUser) {
                        $q3->where('role', 'supervisor')
                            ->where('company_id', $currentUser->company_id);
                    });
                }
            });
        } elseif ($currentUser->isCoordinator()) {
            $query->where(function ($q) use ($currentUser) {
                $q->where('role', '!=', 'student')
                    ->orWhere(function ($q2) use ($currentUser) {
                        $q2->where('role', 'student')
                            ->where('college_code', $currentUser->college_code);
                    });
            });
        } elseif ($currentUser->isSupervisor()) {
            $query->where(function ($q) use ($currentUser) {
                $q->where('role', '!=', 'student')
                    ->orWhere(function ($q2) use ($currentUser) {
                        $q2->where('role', 'student')
                            ->where(function ($q3) use ($currentUser) {
                                $q3->where('company_id', $currentUser->company_id)
                                    ->orWhere('company', $currentUser->company);
                            });
                    });
            });
        }

        $requirementsByCollege = CollegeDocumentRequirement::where('is_active', true)
            ->orderBy('sort_order')->orderBy('id')->get()->groupBy('college_code');

        return $query->get()->map(function (User $u) use ($requirementsByCollege) {
            $data = [
                'id' => $u->id,
                'studentProfileId' => $u->student?->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'college' => $u->college_code,
                'college_code' => $u->college_code,
                'company' => $u->company,
                'company_id' => $u->company_id,
            ];

            if ($u->isStudent()) {
                $student = $u->student;
                $activePlacement = $student?->activePlacement;
                $pendingPreference = $student?->pendingPreference;
                if ($activePlacement && $pendingPreference && $pendingPreference->id < $activePlacement->id) {
                    $pendingPreference = null;
                }

                // A pending placement is not evidence of deployment, even when legacy
                // records also copied the preferred host into the user's company field.
                $assignedCompany = $activePlacement?->company?->name ?? ($pendingPreference ? null : $u->company);
                $assignedCompanyId = $activePlacement?->company_id ?? ($pendingPreference ? null : $u->company_id);
                $assignedRole = $activePlacement
                    ? $activePlacement->assigned_role
                    : ($assignedCompany ? $student?->assigned_role : null);
                $preferredCompany = $student?->preferredCompany?->name
                    ?? $student?->preferred_company
                    ?? $pendingPreference?->company?->name;
                $preferredRole = $student?->preferred_role
                    ?? ($pendingPreference?->company?->name === $preferredCompany
                        ? $pendingPreference?->assigned_role
                        : null);
                $placementStatus = $activePlacement || $assignedCompany
                    ? 'Approved & Deployed'
                    : ($pendingPreference?->status === 'Returned for Revision'
                        ? 'Returned for Revision'
                        : ($preferredCompany ? 'Pending Coordinator Endorsement' : 'Unplaced'));

                $data = array_merge($data, [
                    'studentNumber' => $student?->student_number,
                    'program' => $student?->program,
                    'enrollmentStatus' => $student?->enrollment_status ?? ($u->college_code ? 'APPROVED' : 'PENDING_ONBOARDING'),
                    'rejectionReason' => $student?->rejection_reason,
                    'verifiedAt' => $student?->verified_at?->toIso8601String(),
                    'gpa' => $student?->gpa,
                    'phone' => $student?->phone,
                    'company' => $assignedCompany,
                    'company_id' => $assignedCompanyId,
                    'placementStatus' => $placementStatus,
                    'preferredHte' => $preferredCompany,
                    'preferredRole' => $preferredRole,
                    'preferenceStatus' => $pendingPreference?->status,
                    'preferenceFeedback' => $pendingPreference?->status === 'Returned for Revision' ? $pendingPreference->reason : null,
                    'preferred_company' => $preferredCompany,
                    'assignedRole' => $assignedRole,
                    'disciplinaryClearance' => $student?->disciplinary_clearance,
                    'clearanceStatus' => $student?->clearance_status,
                    'portfolioData' => [
                        'bio' => $student?->bio ?? '',
                        'skills' => $student?->skills ?? [],
                        'coursework' => $student?->coursework ?? [],
                        'achievements' => $student?->achievements ?? [],
                    ],
                    'preDeploymentDocs' => $this->buildStudentDocumentChecklist($student, $requirementsByCollege->get($student?->college_code, collect())), 
                ]);
            }

            return $data;
        })->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildHtes(User $currentUser): array
    {
        $query = Company::query();

        if ($currentUser->isSupervisor() && $currentUser->company_id) {
            $query->where('id', $currentUser->company_id);
        } elseif ($currentUser->isCoordinator() && $currentUser->college_code) {
            $query->where(function ($q) use ($currentUser) {
                $q->whereNull('college_code')
                    ->orWhere('college_code', $currentUser->college_code);
            });
        }

        return $query->get()->map(function (Company $c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'college' => $c->college_code,
                'college_code' => $c->college_code,
                'location' => $c->location,
                'roleTitle' => $c->role_title,
                'description' => $c->description,
                'requiredSkills' => $c->required_skills ?? [],
                'maxSlots' => $c->max_slots,
                'filledSlots' => $c->filled_slots,
                'minGpa' => $c->min_gpa,
                'inviteToken' => $c->invite_token,
                'supervisorId' => $c->representative_user_id,
                'supervisorName' => $c->supervisor_name,
                'supervisorEmail' => $c->supervisor_email,
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildStudentDocumentChecklist(?Student $student, $requirements): array
    {
        if (! $student) return [];
        $documents = $student->documents ?? collect();
        $byCode = $documents->keyBy('doc_code');
        $rows = $requirements->map(function (CollegeDocumentRequirement $requirement) use ($byCode) {
            $document = $byCode->get($requirement->doc_code);
            return [
                'id' => $document?->id ?? 'requirement:'.$requirement->doc_code,
                'documentId' => $document?->id,
                'requirementId' => $requirement->id,
                'docCode' => $requirement->doc_code,
                'title' => $requirement->title,
                'description' => $requirement->description,
                'issuer' => $requirement->issuer ?? $document?->issuer,
                'fileName' => $document?->original_name,
                'fileSize' => $document?->file_size_bytes,
                'status' => $document?->status ?? 'Not Uploaded',
                'reviewer' => $document?->reviewer?->name,
                'remarks' => $document?->remarks,
                'required' => $requirement->is_required,
                'isConfigured' => true,
            ];
        });
        $configuredCodes = $requirements->pluck('doc_code')->all();
        $historical = $documents->reject(fn (Document $document) => in_array($document->doc_code, $configuredCodes, true))
            ->map(fn (Document $document) => [
                'id' => $document->id, 'documentId' => $document->id, 'requirementId' => null,
                'docCode' => $document->doc_code, 'title' => $document->title, 'description' => null,
                'issuer' => $document->issuer, 'fileName' => $document->original_name,
                'fileSize' => $document->file_size_bytes, 'status' => $document->status,
                'reviewer' => $document->reviewer?->name, 'remarks' => $document->remarks,
                'required' => false, 'isConfigured' => false,
            ]);
        return $rows->concat($historical)->values()->all();
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    protected function buildCollegeSettings(User $currentUser): array
    {
        $query = CollegeSetting::query();
        $requirementsQuery = CollegeDocumentRequirement::query();
        if (($currentUser->isCoordinator() || $currentUser->isStudent()) && $currentUser->college_code) {
            $query->where('college_code', $currentUser->college_code);
            $requirementsQuery->where('college_code', $currentUser->college_code);
        }

        $result = [];
        foreach ($requirementsQuery->orderBy('sort_order')->orderBy('id')->get()->groupBy('college_code') as $code => $requirements) {
            $result[$code] = ['documentRequirements' => $requirements->map(fn (CollegeDocumentRequirement $r) => [
                'id' => $r->id, 'docCode' => $r->doc_code, 'title' => $r->title,
                'description' => $r->description, 'issuer' => $r->issuer,
                'sortOrder' => $r->sort_order, 'isRequired' => $r->is_required, 'isActive' => $r->is_active,
            ])->values()->all()];
        }
        foreach ($query->get() as $s) {
            $result[$s->college_code] = array_merge($result[$s->college_code] ?? [], [
                'requiredHours' => $s->required_hours,
                'maxGpaCutoff' => $s->max_gpa_cutoff,
                'ruleAMaxConsecutiveAbsences' => $s->rule_a_max_consecutive_absences,
                'ruleAMaxDeficitPct' => $s->rule_a_max_deficit_pct,
                'ruleBConsecutiveWeeks' => $s->rule_b_consecutive_weeks,
                'ruleBClericalKeywords' => $s->rule_b_clerical_keywords ?? [],
            ]);
        }
        return $result;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildLogs(User $currentUser): array
    {
        $taskReportsQuery = TaskReport::with(['student.user']);
        $attendanceLogsQuery = AttendanceLog::with(['student.user', 'supervisor', 'coordinator']);

        if ($currentUser->isStudent()) {
            $studentId = $currentUser->student?->id;
            if (! $studentId) return [];
            $taskReportsQuery->where('student_id', $studentId);
            $attendanceLogsQuery->where('student_id', $studentId);
        } elseif ($currentUser->isSupervisor()) {
            $taskReportsQuery->whereHas('student.user', function ($q) use ($currentUser) {
                $q->where('company_id', $currentUser->company_id)
                    ->orWhere('company', $currentUser->company);
            });
            $attendanceLogsQuery->whereHas('student.user', function ($q) use ($currentUser) {
                $q->where('company_id', $currentUser->company_id)
                    ->orWhere('company', $currentUser->company);
            });
        } elseif ($currentUser->isCoordinator()) {
            $taskReportsQuery->whereHas('student', function ($q) use ($currentUser) {
                $q->where('college_code', $currentUser->college_code);
            });
            $attendanceLogsQuery->whereHas('student', function ($q) use ($currentUser) {
                $q->where('college_code', $currentUser->college_code);
            });
        }

        $items = [];

        foreach ($taskReportsQuery->get() as $tr) {
            $items[] = [
                'id' => $tr->id,
                'studentId' => $tr->student->user_id,
                'student' => $tr->student->user->name,
                'week' => $tr->week,
                'period' => $tr->period_start->format('Y-m-d').' to '.$tr->period_end->format('Y-m-d'),
                'hours' => $tr->hours,
                'summary' => $tr->summary,
                'status' => $tr->status,
                'supervisorNotes' => $tr->supervisor_notes,
                'coordinatorNotes' => $tr->coordinator_notes,
                'type' => 'weekly_report',
                'createdAt' => $tr->created_at?->toIso8601String(),
            ];
        }

        foreach ($attendanceLogsQuery->get() as $al) {
            $items[] = [
                'id' => 'dtr-'.$al->id,
                'apiId' => $al->id,
                'studentId' => $al->student->user_id,
                'student' => $al->student->user->name,
                'date' => $al->date->format('Y-m-d'),
                'amIn' => $al->am_in,
                'amOut' => $al->am_out,
                'pmIn' => $al->pm_in,
                'pmOut' => $al->pm_out,
                'amInPhoto' => (bool) $al->am_in_photo_path,
                'amOutPhoto' => (bool) $al->am_out_photo_path,
                'pmInPhoto' => (bool) $al->pm_in_photo_path,
                'pmOutPhoto' => (bool) $al->pm_out_photo_path,
                'hours' => $al->hours,
                'status' => $al->status,
                'supervisorNotes' => $al->supervisor_notes,
                'coordinatorNotes' => $al->coordinator_notes,
                'supervisorVerifiedBy' => $al->supervisor?->name,
                'coordinatorApprovedBy' => $al->coordinator?->name,
                'type' => 'daily_punch',
            ];
        }

        return $items;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildDtrDisputes(User $currentUser): array
    {
        $query = AttendanceAdjustment::with(['student.user']);

        if ($currentUser->isStudent()) {
            $studentId = $currentUser->student?->id;
            if (! $studentId) return [];
            $query->where('student_id', $studentId);
        } elseif ($currentUser->isSupervisor()) {
            $query->whereHas('student.user', function ($q) use ($currentUser) {
                $q->where('company_id', $currentUser->company_id)
                    ->orWhere('company', $currentUser->company);
            });
        } elseif ($currentUser->isCoordinator()) {
            $query->whereHas('student', function ($q) use ($currentUser) {
                $q->where('college_code', $currentUser->college_code);
            });
        }

        return $query->get()->map(function (AttendanceAdjustment $adj) {
            return [
                'id' => $adj->id,
                'studentId' => $adj->student->user_id,
                'student' => $adj->student->user->name,
                'date' => $adj->date->format('Y-m-d'),
                'requestedHours' => $adj->requested_hours,
                'reason' => $adj->reason,
                'notes' => $adj->notes,
                'amIn' => $adj->am_in,
                'amOut' => $adj->am_out,
                'pmIn' => $adj->pm_in,
                'pmOut' => $adj->pm_out,
                'status' => $adj->status,
                'reviewerNotes' => $adj->reviewer_notes,
                'createdAt' => $adj->created_at?->toIso8601String(),
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildEvaluations(User $currentUser): array
    {
        $query = Evaluation::with(['student.user', 'supervisor', 'company']);

        if ($currentUser->isStudent()) {
            $studentId = $currentUser->student?->id;
            if (! $studentId) return [];
            $query->where('student_id', $studentId);
        } elseif ($currentUser->isSupervisor()) {
            $query->where(function ($q) use ($currentUser) {
                $q->where('supervisor_id', $currentUser->id)
                    ->orWhere('company_id', $currentUser->company_id);
            });
        } elseif ($currentUser->isCoordinator()) {
            $query->whereHas('student', function ($q) use ($currentUser) {
                $q->where('college_code', $currentUser->college_code);
            });
        }

        return $query->get()->map(function (Evaluation $e) {
            return [
                'id' => $e->id,
                'studentId' => $e->student->user_id,
                'studentName' => $e->student->user->name,
                'supervisorId' => $e->supervisor_id,
                'supervisorName' => $e->supervisor?->name,
                'company' => $e->company?->name,
                'period' => $e->period,
                'academicYear' => $e->academic_year,
                'scores' => $e->scores,
                'totalScore' => $e->total_score,
                'averageScore' => $e->average_score,
                'percentage' => $e->percentage,
                'recommendation' => $e->recommendation,
                'feedback' => $e->feedback,
                'coordinatorClearanceStatus' => $e->coordinator_clearance_status,
                'certifiedAt' => $e->certified_at?->toIso8601String(),
                'createdAt' => $e->created_at?->toIso8601String(),
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildPolicyCorpus(User $currentUser): array
    {
        if (! $currentUser->isAdmin() && ! $currentUser->isCoordinator()) {
            return [];
        }

        return PolicyClause::query()->where('status', 'ACTIVE')->get()->map(function (PolicyClause $p) {
            return [
                'chunkId' => $p->chunk_id,
                'sourceDoc' => $p->source_doc,
                'sectionRef' => $p->section_ref,
                'title' => $p->title,
                'ruleCategory' => $p->rule_category,
                'verbatimText' => $p->verbatim_text,
                'status' => $p->status,
                'lastIndexed' => $p->last_indexed_at?->toIso8601String(),
            ];
        })->values()->all();
    }

    protected function buildMessages(User $currentUser): array
    {
        return Message::where('sender_id', $currentUser->id)
            ->orWhere('recipient_id', $currentUser->id)
            ->with(['sender', 'recipient'])
            ->get()->map(function (Message $m) {
                return [
                    'id' => $m->id,
                    'senderId' => $m->sender_id,
                    'senderName' => $m->sender?->name,
                    'recipientId' => $m->recipient_id,
                    'recipientName' => $m->recipient?->name,
                    'text' => $m->body,
                    'time' => $m->created_at?->toIso8601String(),
                    'readAt' => $m->read_at?->toIso8601String(),
                ];
            })->values()->all();
    }

    protected function buildAuditLogs(User $currentUser): array
    {
        if (! $currentUser->isAdmin()) return [];

        return AuditLog::latest()->get()->map(function (AuditLog $a) {
            return [
                'id' => $a->id,
                'timestamp' => $a->created_at?->toIso8601String(),
                'actorName' => $a->actor_name,
                'actorRole' => $a->actor_role,
                'college' => $a->college_code,
                'actionType' => $a->action_type,
                'targetStudent' => $a->target_student,
                'summary' => $a->summary,
                'source' => $a->source,
                'properties' => $a->properties,
            ];
        })->values()->all();
    }

    protected function buildAlerts(User $currentUser): array
    {
        if ($currentUser->isSupervisor()) {
            return [];
        }

        $query = RiskAlert::with(['student.user']);

        if ($currentUser->isStudent()) {
            $studentId = $currentUser->student?->id;
            if (! $studentId) return [];
            $query->where('student_id', $studentId)->where('status', 'DISPATCHED');
        } elseif ($currentUser->isCoordinator()) {
            $query->where('college_code', $currentUser->college_code);
        }

        return $query->get()->map(function (RiskAlert $a) {
            return [
                'id' => $a->id,
                'student' => $a->student->user->name,
                'studentId' => $a->student->user_id,
                'college' => $a->college_code,
                'company' => $a->student->user->company,
                'ruleLabel' => $a->rule_label,
                'ruleKey' => $a->rule_key,
                'triggers' => $a->triggers ?? [],
                'evidence' => $a->evidence ?? [],
                'status' => $a->status,
                'hitlStatus' => $a->status,
                'interventionStage' => $a->intervention_stage,
                'dispatchedMessage' => $a->dispatched_message,
                'dismissedReason' => $a->dismissed_reason,
                'createdAt' => $a->created_at?->toIso8601String(),
            ];
        })->values()->all();
    }
}
