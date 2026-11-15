<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin()) {
            abort(403, 'Only administrators can access the governance audit trail.');
        }

        $query = AuditLog::query()->latest();

        if ($request->has('college') && $request->college !== 'ALL') {
            $query->where(function ($q) use ($request) {
                $q->where('college_code', $request->college)
                    ->orWhere('college_code', 'ALL');
            });
        }

        if ($request->has('category') && $request->category !== 'ALL') {
            $query->where('action_type', $request->category);
        }

        return response()->json([
            'auditLogs' => $query->get(),
        ]);
    }
}
