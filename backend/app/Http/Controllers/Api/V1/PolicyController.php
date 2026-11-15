<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePolicyRequest;
use App\Models\PolicyClause;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;

class PolicyController extends Controller
{
    public function store(StorePolicyRequest $request): JsonResponse
    {
        $admin = $request->user();

        $clause = PolicyClause::create([
            'chunk_id' => $request->validated('chunkId'),
            'source_doc' => $request->validated('sourceDoc'),
            'section_ref' => $request->validated('sectionRef'),
            'title' => $request->validated('title'),
            'rule_category' => $request->validated('ruleCategory'),
            'verbatim_text' => $request->validated('verbatimText'),
            'status' => 'ACTIVE',
            'last_indexed_at' => now(),
            'created_by_user_id' => $admin->id,
        ]);

        AuditService::record(
            $admin,
            'POLICY_CREATED',
            "Approved policy clause '{$clause->title}' ({$clause->chunk_id}) was added to the institutional corpus.",
            'ALL'
        );

        return response()->json([
            'message' => 'Policy clause added to corpus.',
            'clause' => $clause,
        ], 201);
    }
}
