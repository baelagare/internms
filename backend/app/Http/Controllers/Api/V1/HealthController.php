<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HealthController
{
    public function __invoke(): JsonResponse
    {
        $database = 'ok';
        $tables = [];

        try {
            DB::connection()->getPdo();
            $tables = [
                'users' => Schema::hasTable('users'),
                'sessions' => Schema::hasTable('sessions'),
                'cache' => Schema::hasTable('cache'),
            ];
        } catch (\Throwable $e) {
            $database = 'disconnected: '.$e->getMessage();
        }

        return response()->json([
            'status' => 'ok',
            'service' => 'internms-api',
            'version' => 'v1',
            'timestamp' => now()->toIso8601String(),
            'database' => $database,
            'tables' => $tables,
        ]);
    }
}
