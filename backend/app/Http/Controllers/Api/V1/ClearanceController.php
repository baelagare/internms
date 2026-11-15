<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Evaluation;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ClearanceController extends Controller
{
    public function certify(int $id, Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isCoordinator() && ! $user->isAdmin()) {
            abort(403, 'Only college coordinators and administrators can certify clearance.');
        }

        $student = Student::with('evaluations')->findOrFail($id);

        if ($user->isCoordinator() && $student->college_code !== $user->college_code) {
            abort(403, 'You can only certify clearance for students in your college.');
        }

        // An evaluation must be completed before clearance can be granted
        $evaluation = $student->evaluations()->latest()->first();

        if (! $evaluation) {
            throw ValidationException::withMessages([
                'clearance' => ['Cannot certify clearance: student has no completed performance evaluation.'],
            ]);
        }

        $student->update([
            'disciplinary_clearance' => 'Cleared & Certified',
            'clearance_status' => 'Cleared & Certified',
        ]);

        $evaluation->update([
            'coordinator_clearance_status' => 'Cleared & Certified',
            'certified_by_user_id' => $user->id,
            'certified_at' => now(),
        ]);

        \App\Services\AuditService::record(
            $user,
            'CLEARANCE_GRANTED',
            "OJT clearance certified for student '{$student->user?->name}' ({$student->student_number}) by {$user->name}.",
            $student->college_code,
            $student->id,
            $student->user?->name
        );

        return response()->json([
            'message' => 'Student clearance certified successfully.',
            'student' => $student->fresh(),
        ]);
    }
}
