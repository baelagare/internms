<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;

class HealthController
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'service' => 'internms-api',
            'version' => 'v1',
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
