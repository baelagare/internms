<?php

namespace Tests\Feature\Api\V1;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_check_returns_ok_envelope(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertOk()
            ->assertJson([
                'status' => 'ok',
                'service' => 'internms-api',
                'version' => 'v1',
            ])
            ->assertJsonStructure(['status', 'service', 'version', 'timestamp']);
    }

    public function test_api_not_found_returns_consistent_json_error_envelope(): void
    {
        $response = $this->getJson('/api/v1/nonexistent-route');

        $response->assertNotFound()
            ->assertJson([
                'message' => 'The requested resource was not found.',
                'errors' => [],
            ]);
    }

    public function test_cors_preflight_allows_configured_frontend_origin(): void
    {
        $response = $this->options('/api/v1/health', [], [
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'GET',
        ]);

        $response->assertStatus(204);
        $this->assertEquals('http://localhost:5173', $response->headers->get('Access-Control-Allow-Origin'));
    }
}
