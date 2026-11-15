<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePartnerRequest;
use App\Http\Requests\UpdatePartnerRequest;
use App\Models\Company;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    public function store(StorePartnerRequest $request): JsonResponse
    {
        $user = $request->user();
        $college = $user->isCoordinator() ? $user->college_code : $request->validated('college_code');

        $requiredSkills = $request->validated('required_skills');
        if (is_string($requiredSkills)) {
            $requiredSkills = array_values(array_filter(array_map('trim', explode(',', $requiredSkills))));
        }

        $company = Company::create([
            'name' => $request->validated('name'),
            'college_code' => $college,
            'location' => $request->validated('location'),
            'role_title' => $request->validated('role_title'),
            'description' => $request->validated('description'),
            'required_skills' => $requiredSkills ?? [],
            'max_slots' => $request->validated('max_slots') ?? 5,
            'filled_slots' => 0,
            'min_gpa' => $request->validated('min_gpa'),
            'invite_token' => Str::random(32),
            'supervisor_name' => $request->validated('supervisor_name'),
        ]);

        AuditService::record(
            $user,
            'PARTNER_CREATED',
            "Partner company '{$company->name}' was added to the institutional directory.",
            $college
        );

        return response()->json([
            'message' => 'Partner company added successfully.',
            'company' => $company,
        ], 201);
    }

    public function update(int $id, UpdatePartnerRequest $request): JsonResponse
    {
        $user = $request->user();
        $company = Company::findOrFail($id);

        if ($user->isSupervisor()) {
            if ($user->company_id !== $company->id && $user->company !== $company->name) {
                abort(403, 'You can only edit job postings for your own company.');
            }

            $data = [];
            if ($request->has('role_title')) $data['role_title'] = $request->validated('role_title');
            if ($request->has('description')) $data['description'] = $request->validated('description');
            if ($request->has('required_skills')) {
                $skills = $request->validated('required_skills');
                $data['required_skills'] = is_string($skills) ? array_values(array_filter(array_map('trim', explode(',', $skills)))) : $skills;
            }

            $company->update($data);

            return response()->json([
                'message' => 'Job posting updated successfully.',
                'company' => $company->fresh(),
            ]);
        }

        if ($user->isCoordinator() && $company->college_code && $company->college_code !== $user->college_code) {
            abort(403, 'You can only edit partners affiliated with your college.');
        }

        $data = $request->validated();
        if (isset($data['required_skills']) && is_string($data['required_skills'])) {
            $data['required_skills'] = array_values(array_filter(array_map('trim', explode(',', $data['required_skills']))));
        }

        $company->update($data);

        AuditService::record(
            $user,
            'PARTNER_UPDATED',
            "Partner company '{$company->name}' profile details were updated.",
            $company->college_code
        );

        return response()->json([
            'message' => 'Partner company updated successfully.',
            'company' => $company->fresh(),
        ]);
    }
}
