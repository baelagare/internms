<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewAlertRequest;
use App\Models\RiskAlert;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertController extends Controller
{
    public function review(int $id, ReviewAlertRequest $request): JsonResponse
    {
        $user = $request->user();
        $alert = RiskAlert::findOrFail($id);

        if ($user->isCoordinator() && $alert->college_code !== $user->college_code) {
            abort(403, 'You can only review alerts for your college.');
        }

        $action = $request->validated('action');

        if ($action === 'dismiss') {
            $alert->update([
                'status' => 'DISMISSED',
                'dismissed_reason' => $request->validated('reason') ?? 'Reviewed and dismissed by coordinator.',
                'reviewed_by_user_id' => $user->id,
                'reviewed_at' => now(),
            ]);

            \App\Services\AuditService::record(
                $user,
                'ALERT_DISMISSED',
                "Risk indicator '{$alert->rule_label}' for student #{$alert->student_id} was dismissed.",
                $alert->college_code,
                $alert->student_id,
                $alert->student?->user?->name
            );
        } else {
            // approve or edit
            $alert->update([
                'status' => 'DISPATCHED',
                'intervention_stage' => $request->validated('stage') ?? 'warning_1',
                'dispatched_message' => $request->validated('message'),
                'reviewed_by_user_id' => $user->id,
                'reviewed_at' => now(),
            ]);

            \App\Services\AuditService::record(
                $user,
                'ALERT_DISPATCHED',
                "Advisory for '{$alert->rule_label}' (stage: {$alert->intervention_stage}) dispatched to student #{$alert->student_id}.",
                $alert->college_code,
                $alert->student_id,
                $alert->student?->user?->name
            );
        }

        return response()->json([
            'message' => 'Risk alert review recorded.',
            'alert' => $alert->fresh(),
        ]);
    }
}
