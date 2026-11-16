<?php

namespace Tests\Feature\Api\V1;

use App\Models\Company;
use App\Models\User;
use App\Services\GoogleTokenVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Mockery\MockInterface;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_auth_provisions_new_student_with_valid_nemsu_domain(): void
    {
        $this->mock(GoogleTokenVerifier::class, function (MockInterface $mock) {
            $mock->shouldReceive('verify')
                ->with('valid-google-id-token')
                ->once()
                ->andReturn([
                    'email' => 'juan.delacruz@nemsu.edu.ph',
                    'name' => 'Juan Dela Cruz',
                    'sub' => 'google-sub-12345',
                ]);
        });

        $response = $this->postJson('/api/v1/auth/google', [
            'idToken' => 'valid-google-id-token',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role', 'college', 'company'],
                'token',
            ])
            ->assertJson([
                'user' => [
                    'name' => 'Juan Dela Cruz',
                    'email' => 'juan.delacruz@nemsu.edu.ph',
                    'role' => 'student',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'juan.delacruz@nemsu.edu.ph',
            'role' => 'student',
            'google_sub' => 'google-sub-12345',
        ]);
    }

    public function test_google_auth_rejects_non_institutional_email(): void
    {
        $this->mock(GoogleTokenVerifier::class, function (MockInterface $mock) {
            $mock->shouldReceive('verify')
                ->with('personal-gmail-token')
                ->once()
                ->andReturn([
                    'email' => 'user@gmail.com',
                    'name' => 'External User',
                    'sub' => 'google-sub-99999',
                ]);
        });

        $response = $this->postJson('/api/v1/auth/google', [
            'idToken' => 'personal-gmail-token',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_google_auth_rejects_invalid_token(): void
    {
        $this->mock(GoogleTokenVerifier::class, function (MockInterface $mock) {
            $mock->shouldReceive('verify')
                ->with('invalid-token')
                ->once()
                ->andReturn(null);
        });

        $response = $this->postJson('/api/v1/auth/google', [
            'idToken' => 'invalid-token',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['idToken']);
    }

    public function test_google_auth_signs_in_existing_coordinator(): void
    {
        $coordinator = User::create([
            'name' => 'Engr. Maria Santos',
            'email' => 'm.santos@nemsu.edu.ph',
            'role' => 'coordinator',
            'college_code' => 'CITE',
            'email_verified_at' => now(),
        ]);

        $this->mock(GoogleTokenVerifier::class, function (MockInterface $mock) use ($coordinator) {
            $mock->shouldReceive('verify')
                ->with('coordinator-google-token')
                ->once()
                ->andReturn([
                    'email' => $coordinator->email,
                    'name' => $coordinator->name,
                    'sub' => 'google-coord-sub-101',
                ]);
        });

        $response = $this->postJson('/api/v1/auth/google', [
            'idToken' => 'coordinator-google-token',
        ]);

        $response->assertOk()
            ->assertJson([
                'user' => [
                    'id' => $coordinator->id,
                    'name' => 'Engr. Maria Santos',
                    'role' => 'coordinator',
                    'college' => 'CITE',
                ],
            ]);
    }

    public function test_authentication_rate_limiter_uses_its_dedicated_cache_store(): void
    {
        $limiterStore = cache()->store(config('cache.limiter'))->getStore();

        $this->assertSame('array', config('cache.limiter'));
        $this->assertInstanceOf(\Illuminate\Cache\ArrayStore::class, $limiterStore);
    }

    public function test_supervisor_login_succeeds_with_valid_credentials(): void
    {
        $supervisor = User::create([
            'name' => 'Alex Rivera',
            'email' => 'alex@techcorp.ph',
            'role' => 'supervisor',
            'company' => 'TechCorp Solutions',
            'password' => Hash::make('SecretPass123!'),
            'email_verified_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'alex@techcorp.ph',
            'password' => 'SecretPass123!',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role', 'company'],
                'token',
            ])
            ->assertJson([
                'user' => [
                    'id' => $supervisor->id,
                    'email' => 'alex@techcorp.ph',
                    'role' => 'supervisor',
                    'company' => 'TechCorp Solutions',
                ],
            ]);
    }

    public function test_institutional_accounts_cannot_use_password_login(): void
    {
        User::create([
            'name' => 'Student User',
            'email' => 'student@nemsu.edu.ph',
            'role' => 'student',
            'password' => Hash::make('SecretPass123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'student@nemsu.edu.ph',
            'password' => 'SecretPass123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_supervisor_login_fails_with_invalid_password(): void
    {
        User::create([
            'name' => 'Alex Rivera',
            'email' => 'alex@techcorp.ph',
            'role' => 'supervisor',
            'password' => Hash::make('SecretPass123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'alex@techcorp.ph',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_supervisor_invite_onboards_representative_and_consumes_token(): void
    {
        $company = Company::create([
            'name' => 'Apex Cloud Systems',
            'college_code' => 'CITE',
            'invite_token' => 'apex-invite-token-789',
        ]);

        $response = $this->postJson('/api/v1/auth/supervisor-invite', [
            'inviteToken' => 'apex-invite-token-789',
            'name' => 'Sarah Connor',
            'email' => 'sarah@apexcloud.ph',
            'password' => 'StrongPassword123!',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'user' => [
                    'name' => 'Sarah Connor',
                    'email' => 'sarah@apexcloud.ph',
                    'role' => 'supervisor',
                    'company' => 'Apex Cloud Systems',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'sarah@apexcloud.ph',
            'role' => 'supervisor',
            'company' => 'Apex Cloud Systems',
        ]);

        $company->refresh();
        $this->assertNull($company->invite_token);
        $this->assertNotNull($company->representative_user_id);
        $this->assertEquals('Sarah Connor', $company->supervisor_name);
        $this->assertEquals('sarah@apexcloud.ph', $company->supervisor_email);
    }

    public function test_supervisor_invite_rejects_used_or_invalid_token(): void
    {
        $response = $this->postJson('/api/v1/auth/supervisor-invite', [
            'inviteToken' => 'nonexistent-token',
            'name' => 'Sarah Connor',
            'email' => 'sarah@apexcloud.ph',
            'password' => 'StrongPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['inviteToken']);
    }

    public function test_me_endpoint_returns_authenticated_user(): void
    {
        $user = User::create([
            'name' => 'Dr. Admin',
            'email' => 'admin@nemsu.edu.ph',
            'role' => 'admin',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/me');

        $response->assertOk()
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'name' => 'Dr. Admin',
                    'email' => 'admin@nemsu.edu.ph',
                    'role' => 'admin',
                ],
            ]);
    }

    public function test_unauthenticated_request_to_me_returns_401_json_error(): void
    {
        $response = $this->getJson('/api/v1/me');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
                'errors' => [],
            ]);
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@nemsu.edu.ph',
            'role' => 'student',
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/logout');

        $response->assertOk()
            ->assertJson(['message' => 'Successfully logged out.']);

        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/me')
            ->assertStatus(401);
    }
}
