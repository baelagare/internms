<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PlacementDecisionRequest;
use App\Models\Company;
use App\Models\Placement;
use App\Models\Student;
use Illuminate\Http\JsonResponse;

class PlacementController extends Controller
{
    public function store(int $id, PlacementDecisionRequest $request): JsonResponse
    {
        $user = $request->user();
        $student = Student::with('user')->findOrFail($id);
        $company = Company::findOrFail($request->validated('company_id'));

        if ($user->isStudent()) {
            if ($student->user_id !== $user->id) {
                abort(403, 'You can only request placements for your own profile.');
            }

            $student->update([
                'preferred_company_id' => $company->id,
                'preferred_company' => $company->name,
                'assigned_role' => $request->validated('assigned_role') ?? $company->role_title,
            ]);

            return response()->json([
                'message' => 'Placement preference saved for coordinator review.',
                'student' => $student->fresh(),
            ]);
        }

        // Coordinator or Admin decision
        if ($user->isCoordinator() && $student->college_code !== $user->college_code) {
            abort(403, 'You can only assign students in your college.');
        }

        $placement = Placement::create([
            'student_id' => $student->id,
            'company_id' => $company->id,
            'status' => 'Approved & Deployed',
            'assigned_role' => $request->validated('assigned_role') ?? $company->role_title,
            'reason' => $request->validated('reason'),
            'endorsed_by_user_id' => $user->id,
        ]);

        $student->user->update([
            'company' => $company->name,
            'company_id' => $company->id,
        ]);

        $student->update([
            'assigned_role' => $placement->assigned_role,
        ]);

        // Increment company filled slots
        $company->increment('filled_slots');

        return response()->json([
            'message' => 'Student placement approved and deployed.',
            'placement' => $placement,
        ]);
    }
}
