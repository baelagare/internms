<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCollegeDocumentRequirementRequest;
use App\Http\Requests\UpdateCollegeDocumentRequirementRequest;
use App\Models\College;
use App\Models\CollegeDocumentRequirement;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollegeDocumentRequirementController extends Controller
{
    public function index(string $code, Request $request): JsonResponse
    {
        $this->authorizeCollege($code, $request);
        $requirements = CollegeDocumentRequirement::where('college_code', $code)
            ->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['requirements' => $requirements->map(fn ($item) => $this->present($item))->values()]);
    }

    public function store(string $code, StoreCollegeDocumentRequirementRequest $request): JsonResponse
    {
        College::firstOrCreate(['code' => $code], ['name' => $code]);
        $values = $request->validated();
        $requirement = CollegeDocumentRequirement::create([
            'college_code' => $code,
            'doc_code' => $values['docCode'],
            'title' => $values['title'],
            'description' => $values['description'] ?? null,
            'issuer' => $values['issuer'] ?? null,
            'sort_order' => $values['sortOrder'] ?? 0,
            'is_required' => $values['isRequired'] ?? true,
            'is_active' => true,
            'created_by_user_id' => $request->user()->id,
        ]);

        AuditService::record($request->user(), 'DOCUMENT_REQUIREMENT_CREATED', "Added {$requirement->title} ({$requirement->doc_code}) to {$code} pre-deployment requirements.", $code);
        return response()->json(['message' => 'Document requirement created.', 'requirement' => $this->present($requirement)], 201);
    }

    public function update(int $id, UpdateCollegeDocumentRequirementRequest $request): JsonResponse
    {
        $requirement = CollegeDocumentRequirement::findOrFail($id);
        $values = $request->validated();
        $mapping = [
            'docCode' => 'doc_code', 'title' => 'title', 'description' => 'description',
            'issuer' => 'issuer', 'sortOrder' => 'sort_order', 'isRequired' => 'is_required', 'isActive' => 'is_active',
        ];
        $requirement->update(collect($mapping)->filter(fn ($column, $key) => array_key_exists($key, $values))
            ->mapWithKeys(fn ($column, $key) => [$column => $values[$key]])->all());

        AuditService::record($request->user(), 'DOCUMENT_REQUIREMENT_UPDATED', "Updated {$requirement->title} ({$requirement->doc_code}) in {$requirement->college_code}.", $requirement->college_code);
        return response()->json(['message' => 'Document requirement updated.', 'requirement' => $this->present($requirement->fresh())]);
    }

    public function deactivate(int $id, Request $request): JsonResponse
    {
        $requirement = CollegeDocumentRequirement::findOrFail($id);
        $user = $request->user();
        if (! $user->isAdmin() && (! $user->isCoordinator() || $requirement->college_code !== $user->college_code)) {
            abort(403, 'You can only manage requirements for your own college.');
        }

        $requirement->update(['is_active' => false]);
        AuditService::record($user, 'DOCUMENT_REQUIREMENT_DEACTIVATED', "Deactivated {$requirement->title} ({$requirement->doc_code}) in {$requirement->college_code}.", $requirement->college_code);
        return response()->json(['message' => 'Document requirement deactivated.', 'requirement' => $this->present($requirement->fresh())]);
    }

    private function authorizeCollege(string $code, Request $request): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && (! $user->isCoordinator() || $user->college_code !== $code)) {
            abort(403, 'You can only view requirements for your own college.');
        }
    }

    private function present(CollegeDocumentRequirement $requirement): array
    {
        return [
            'id' => $requirement->id,
            'collegeCode' => $requirement->college_code,
            'docCode' => $requirement->doc_code,
            'title' => $requirement->title,
            'description' => $requirement->description,
            'issuer' => $requirement->issuer,
            'sortOrder' => $requirement->sort_order,
            'isRequired' => $requirement->is_required,
            'isActive' => $requirement->is_active,
        ];
    }
}
