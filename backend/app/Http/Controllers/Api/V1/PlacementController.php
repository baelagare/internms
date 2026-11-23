<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PlacementDecisionRequest;
use App\Models\CollegeSetting;
use App\Models\Company;
use App\Models\Placement;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;

class PlacementController extends Controller
{
    public function returnPreference(int $id, Request $request): JsonResponse
    {
        $actor = $request->user();
        if (! $actor->isCoordinator() && ! $actor->isAdmin()) {
            abort(403, 'Only coordinators and administrators may return placement preferences.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);
        $student = Student::findOrFail($id);

        if ($actor->isCoordinator() && $student->college_code !== $actor->college_code) {
            abort(403, 'You can only review placement preferences for students in your college.');
        }

        $preference = Placement::where('student_id', $student->id)
            ->where('status', 'Pending Coordinator Endorsement')
            ->latest('id')
            ->first();

        if (! $preference) {
            throw ValidationException::withMessages([
                'preference' => ['There is no pending placement preference to return.'],
            ]);
        }

        $preference->update([
            'status' => 'Returned for Revision',
            'reason' => $validated['reason'],
            'endorsed_by_user_id' => $actor->id,
        ]);

        return response()->json([
            'message' => 'Placement preference returned to the student for revision.',
            'placement' => $preference->fresh(),
        ]);
    }

    public function store(int $id, PlacementDecisionRequest $request): JsonResponse
    {
        $user = $request->user();
        $student = Student::with('user')->findOrFail($id);
        $company = Company::findOrFail($request->validated('company_id'));

        if ($user->isStudent()) {
            if ($student->user_id !== $user->id) {
                abort(403, 'You can only request placements for your own profile.');
            }
        } elseif (! $user->isCoordinator() && ! $user->isAdmin()) {
            abort(403, 'Only students, coordinators, and administrators may submit placement decisions.');
        }

        if ($user->isCoordinator() && $student->college_code !== $user->college_code) {
            abort(403, 'You can only assign students in your college.');
        }

        if ($company->college_code !== null && $student->college_code !== $company->college_code) {
            abort(403, 'The host company is not affiliated with the student’s college.');
        }

        $this->ensurePlacementEligibility($student, $company);

        if ($user->isStudent()) {
            $student->update([
                'preferred_company_id' => $company->id,
                'preferred_company' => $company->name,
                'preferred_role' => $request->validated('preferred_role'),
            ]);

            $existingPreference = Placement::where('student_id', $student->id)
                ->whereIn('status', ['Pending Coordinator Endorsement', 'Returned for Revision'])
                ->latest('id')
                ->first();

            if ($existingPreference) {
                $existingPreference->update([
                    'company_id' => $company->id,
                    'status' => 'Pending Coordinator Endorsement',
                    'assigned_role' => null,
                    'reason' => $request->validated('reason'),
                    'endorsed_by_user_id' => null,
                ]);
            } else {
                Placement::create([
                    'student_id' => $student->id,
                    'company_id' => $company->id,
                    'status' => 'Pending Coordinator Endorsement',
                    'assigned_role' => null,
                    'reason' => $request->validated('reason'),
                    'endorsed_by_user_id' => null,
                ]);
            }

            return response()->json([
                'message' => 'Placement preference saved for coordinator review.',
                'student' => $student->fresh(),
            ]);
        }

        // Coordinator or Admin decision. Re-read and lock the relevant records so capacity
        // cannot be consumed twice by concurrent requests and every write can roll back.
        $placement = DB::transaction(function () use ($student, $company, $request, $user): Placement {
            $lockedStudent = Student::with('user')->lockForUpdate()->findOrFail($student->id);
            $deployedPlacements = Placement::where('student_id', $lockedStudent->id)
                ->where('status', 'Approved & Deployed')
                ->lockForUpdate()
                ->get();

            $companyIds = $deployedPlacements->pluck('company_id')->push($company->id)->unique()->sort()->values();
            $lockedCompanies = Company::whereIn('id', $companyIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $lockedCompany = $lockedCompanies->get($company->id);

            if (! $lockedCompany) {
                abort(404, 'The host company could not be found.');
            }

            $this->ensurePlacementEligibility($lockedStudent, $lockedCompany);

            $role = $request->validated('assigned_role') ?? $lockedCompany->role_title;
            $matchingDeployment = $deployedPlacements->firstWhere('company_id', $lockedCompany->id);

            foreach ($deployedPlacements as $oldPlacement) {
                if ($oldPlacement->company_id === $lockedCompany->id) {
                    continue;
                }

                $oldPlacement->update(['status' => 'Reassigned']);
                $oldCompany = $lockedCompanies->get($oldPlacement->company_id);
                if ($oldCompany && $oldCompany->filled_slots > 0) {
                    $oldCompany->decrement('filled_slots');
                    $oldCompany->filled_slots--;
                }
            }

            if ($matchingDeployment) {
                $matchingDeployment->update([
                    'assigned_role' => $role,
                    'reason' => $request->validated('reason'),
                    'endorsed_by_user_id' => $user->id,
                ]);
                $placement = $matchingDeployment->fresh();
            } else {
                $placement = Placement::create([
                    'student_id' => $lockedStudent->id,
                    'company_id' => $lockedCompany->id,
                    'status' => 'Approved & Deployed',
                    'assigned_role' => $role,
                    'reason' => $request->validated('reason'),
                    'endorsed_by_user_id' => $user->id,
                ]);
                $lockedCompany->increment('filled_slots');
            }

            $lockedStudent->user->update([
                'company' => $lockedCompany->name,
                'company_id' => $lockedCompany->id,
            ]);
            $lockedStudent->update([
                'assigned_role' => $placement->assigned_role,
                'preferred_company' => null,
                'preferred_company_id' => null,
                'preferred_role' => null,
            ]);

            return $placement;
        });

        return response()->json([
            'message' => 'Student placement approved and deployed.',
            'placement' => $placement,
        ]);
    }

    private function ensurePlacementEligibility(Student $student, Company $company): void
    {
        $cutoff = $company->min_gpa;
        if ($cutoff === null && $student->college_code !== null) {
            $cutoff = CollegeSetting::where('college_code', $student->college_code)->value('max_gpa_cutoff');
        }

        if ($student->gpa === null || (float) $student->gpa <= 0 || $cutoff === null || (float) $cutoff <= 0) {
            throw ValidationException::withMessages([
                'eligibility' => ['Placement eligibility cannot be confirmed because the student GPA or applicable GPA cutoff is missing.'],
            ]);
        }

        if ((float) $student->gpa > (float) $cutoff) {
            throw ValidationException::withMessages([
                'eligibility' => ['The student does not meet the GPA requirement for this host company.'],
            ]);
        }

        if ($student->disciplinary_clearance !== 'Cleared & Certified') {
            throw ValidationException::withMessages([
                'eligibility' => ['The student must have certified disciplinary clearance before requesting or receiving placement.'],
            ]);
        }

        $alreadyAssignedToCompany = $student->user?->company_id === $company->id
            || $student->user?->company === $company->name;
        $capacityIsKnown = $company->max_slots !== null
            && $company->filled_slots !== null
            && $company->max_slots > 0
            && $company->filled_slots >= 0;

        if (! $capacityIsKnown) {
            throw ValidationException::withMessages([
                'capacity' => ['Host company capacity is not configured; confirm availability with your coordinator.'],
            ]);
        }

        if (! $alreadyAssignedToCompany && $company->filled_slots >= $company->max_slots) {
            throw ValidationException::withMessages([
                'capacity' => ['The host company has no placement slots available.'],
            ]);
        }
    }
}
