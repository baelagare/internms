<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\College;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EnrollmentController extends Controller
{
    /**
     * Student self-onboarding: submit student number, college, program, and optional phone.
     */
    public function onboarding(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isStudent()) {
            abort(403, 'Only students can submit academic onboarding declarations.');
        }

        $student = Student::firstOrCreate(
            ['user_id' => $user->id],
            [
                'college_code' => $user->college_code,
                'enrollment_status' => 'PENDING_ONBOARDING',
                'skills' => [],
                'coursework' => [],
                'achievements' => [],
            ]
        );

        $validated = $request->validate([
            'student_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('students', 'student_number')->ignore($student->id),
            ],
            'college_code' => [
                'required',
                'string',
                Rule::exists('colleges', 'code'),
            ],
            'program' => ['required', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $student->update([
            'student_number' => $validated['student_number'],
            'college_code' => $validated['college_code'],
            'program' => $validated['program'],
            'phone' => $validated['phone'] ?? $student->phone,
            'enrollment_status' => 'PENDING_APPROVAL',
            'rejection_reason' => null,
        ]);

        $user->update([
            'college_code' => $validated['college_code'],
        ]);

        AuditService::record(
            $user,
            'ENROLLMENT_SUBMITTED',
            "Student {$user->name} submitted onboarding declaration for {$validated['college_code']} ({$validated['program']}).",
            $validated['college_code'],
            $student->id,
            $user->name
        );

        return response()->json([
            'message' => 'Onboarding declaration submitted successfully.',
            'student' => $student->fresh(),
        ]);
    }

    /**
     * Coordinator / Admin approves a student's enrollment into the college.
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();

        if (! $actor->isAdmin() && ! $actor->isCoordinator()) {
            abort(403, 'Only administrators and coordinators can approve student enrollments.');
        }

        $student = Student::with('user')->findOrFail($id);

        if ($actor->isCoordinator() && $student->college_code !== $actor->college_code) {
            abort(403, 'You can only approve enrollments for your assigned college.');
        }

        $student->update([
            'enrollment_status' => 'APPROVED',
            'verified_by_user_id' => $actor->id,
            'verified_at' => now(),
            'rejection_reason' => null,
        ]);

        if ($student->user) {
            $student->user->update([
                'college_code' => $student->college_code,
            ]);
        }

        AuditService::record(
            $actor,
            'ENROLLMENT_APPROVED',
            "Enrollment for '{$student->user?->name}' ({$student->student_number}) in {$student->college_code} was approved.",
            $student->college_code,
            $student->id,
            $student->user?->name
        );

        return response()->json([
            'message' => 'Student enrollment approved.',
            'student' => $student->fresh(),
        ]);
    }

    /**
     * Coordinator / Admin rejects a student's enrollment with a required reason.
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();

        if (! $actor->isAdmin() && ! $actor->isCoordinator()) {
            abort(403, 'Only administrators and coordinators can reject student enrollments.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $student = Student::with('user')->findOrFail($id);

        if ($actor->isCoordinator() && $student->college_code !== $actor->college_code) {
            abort(403, 'You can only review enrollments for your assigned college.');
        }

        $student->update([
            'enrollment_status' => 'REJECTED',
            'rejection_reason' => $validated['reason'],
            'verified_by_user_id' => $actor->id,
            'verified_at' => now(),
        ]);

        AuditService::record(
            $actor,
            'ENROLLMENT_REJECTED',
            "Enrollment for '{$student->user?->name}' was rejected: {$validated['reason']}",
            $student->college_code,
            $student->id,
            $student->user?->name
        );

        return response()->json([
            'message' => 'Student enrollment rejected.',
            'student' => $student->fresh(),
        ]);
    }

    /**
     * Admin / Coordinator directly assigns or updates a student's enrollment details.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();

        if (! $actor->isAdmin() && ! $actor->isCoordinator()) {
            abort(403, 'Only administrators and coordinators can update student enrollment records.');
        }

        $student = Student::with('user')->findOrFail($id);

        if ($actor->isCoordinator() && $student->college_code && $student->college_code !== $actor->college_code) {
            abort(403, 'You cannot modify students from another college.');
        }

        $validated = $request->validate([
            'college_code' => ['nullable', 'string', Rule::exists('colleges', 'code')],
            'program' => ['nullable', 'string', 'max:150'],
            'student_number' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('students', 'student_number')->ignore($student->id),
            ],
            'enrollment_status' => [
                'nullable',
                'string',
                Rule::in(['PENDING_ONBOARDING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']),
            ],
        ]);

        $targetCollege = $validated['college_code'] ?? $student->college_code;
        if ($actor->isCoordinator() && $targetCollege !== $actor->college_code) {
            abort(403, 'Coordinators cannot reassign students to other colleges.');
        }

        $data = array_filter($validated, fn ($val) => $val !== null);
        if (isset($validated['enrollment_status']) && $validated['enrollment_status'] === 'APPROVED') {
            $data['verified_by_user_id'] = $actor->id;
            $data['verified_at'] = now();
            $data['rejection_reason'] = null;
        }

        $student->update($data);

        if (isset($validated['college_code']) && $student->user) {
            $student->user->update(['college_code' => $validated['college_code']]);
        }

        AuditService::record(
            $actor,
            'ENROLLMENT_UPDATED',
            "Enrollment record for student '{$student->user?->name}' was updated by {$actor->name}.",
            $student->college_code,
            $student->id,
            $student->user?->name
        );

        return response()->json([
            'message' => 'Student enrollment updated successfully.',
            'student' => $student->fresh(),
        ]);
    }
}


