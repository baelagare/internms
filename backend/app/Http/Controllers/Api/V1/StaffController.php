<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStaffRequest;
use App\Http\Resources\UserResource;
use App\Models\Company;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StaffController extends Controller
{
    public function store(StoreStaffRequest $request): JsonResponse
    {
        $admin = $request->user();
        $role = $request->validated('role');
        $email = strtolower($request->validated('id'));
        $scope = $request->validated('scope');

        if ($role === 'coordinator') {
            $institutionDomain = strtolower(config('services.institution.email_domain', 'nemsu.edu.ph'));
            if (! str_ends_with($email, '@'.$institutionDomain)) {
                throw ValidationException::withMessages([
                    'id' => ["Coordinator accounts must use an institutional email (@{$institutionDomain})."],
                ]);
            }

            $user = User::create([
                'name' => $request->validated('name'),
                'email' => $email,
                'role' => 'coordinator',
                'college_code' => $scope,
                'email_verified_at' => now(),
            ]);

            AuditService::record(
                $admin,
                'STAFF_CREATED',
                "Coordinator account for '{$user->name}' was provisioned under college {$scope}.",
                $scope
            );
        } else {
            // supervisor
            $company = Company::where('id', $scope)
                ->orWhere('name', $scope)
                ->first();

            if (! $company) {
                throw ValidationException::withMessages([
                    'scope' => ['Selected partner company was not found in the directory.'],
                ]);
            }

            $user = User::create([
                'name' => $request->validated('name'),
                'email' => $email,
                'role' => 'supervisor',
                'company' => $company->name,
                'company_id' => $company->id,
                'password' => Hash::make($request->validated('pass')),
                'email_verified_at' => now(),
            ]);

            $company->update([
                'representative_user_id' => $user->id,
                'supervisor_name' => $user->name,
                'supervisor_email' => $user->email,
                'invite_token' => null,
            ]);

            AuditService::record(
                $admin,
                'STAFF_CREATED',
                "Host representative account for '{$user->name}' was created for {$company->name}.",
                $company->college_code
            );
        }

        return response()->json([
            'message' => 'Staff account provisioned successfully.',
            'user' => new UserResource($user),
        ], 201);
    }
}
