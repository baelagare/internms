<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditService
{
    /**
     * Record an audit event for governance and accountability.
     */
    public static function record(
        ?User $actor,
        string $actionType,
        string $summary,
        ?string $collegeCode = null,
        ?int $targetStudentId = null,
        ?string $targetStudent = null,
        ?array $properties = null
    ): AuditLog {
        return AuditLog::create([
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'System',
            'actor_role' => $actor?->role ?? 'system',
            'college_code' => $collegeCode ?? $actor?->college_code ?? 'ALL',
            'action_type' => $actionType,
            'target_student_id' => $targetStudentId,
            'target_student' => $targetStudent,
            'summary' => $summary,
            'source' => 'web_api',
            'properties' => $properties,
        ]);
    }
}
