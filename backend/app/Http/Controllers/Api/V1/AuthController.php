<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\GoogleAuthRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\SupervisorInviteRequest;
use App\Http\Resources\UserResource;
use App\Models\Company;
use App\Models\User;
use App\Services\GoogleTokenVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        protected GoogleTokenVerifier $tokenVerifier
    ) {}

    public function google(GoogleAuthRequest $request): JsonResponse
    {
        $payload = $this->tokenVerifier->verify($request->validated('idToken'));

        if (! $payload || empty($payload['email'])) {
            throw ValidationException::withMessages([
                'idToken' => ['Invalid Google authentication token.'],
            ]);
        }

        $email = strtolower($payload['email']);
        $institutionDomain = strtolower(config('services.institution.email_domain', 'nemsu.edu.ph'));

        if (! str_ends_with($email, '@'.$institutionDomain)) {
            throw ValidationException::withMessages([
                'email' => ["Institutional email required. Please sign in with an @{$institutionDomain} account."],
            ]);
        }

        $user = User::where('email', $email)->first();

        if ($user) {
            // Update google_sub if not yet set
            if (empty($user->google_sub) && ! empty($payload['sub'])) {
                $user->update(['google_sub' => $payload['sub']]);
            }
        } else {
            // Self-provision student user
            $user = User::create([
                'name' => $payload['name'] ?? explode('@', $email)[0],
                'email' => $email,
                'role' => 'student',
                'google_sub' => $payload['sub'] ?? null,
                'email_verified_at' => now(),
            ]);
        }

        $token = $user->createToken('web-session')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $email = strtolower($request->validated('email'));
        $user = User::where('email', $email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if ($user->role !== 'supervisor') {
            throw ValidationException::withMessages([
                'email' => ['Institutional accounts must sign in using their Google Workspace account.'],
            ]);
        }

        if (! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        $token = $user->createToken('web-session')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function supervisorInvite(SupervisorInviteRequest $request): JsonResponse
    {
        $inviteToken = $request->validated('inviteToken');

        return DB::transaction(function () use ($request, $inviteToken) {
            $company = Company::where('invite_token', $inviteToken)->lockForUpdate()->first();

            if (! $company || $company->representative_user_id !== null) {
                throw ValidationException::withMessages([
                    'inviteToken' => ['Invalid or already used supervisor invitation token.'],
                ]);
            }

            $user = User::create([
                'name' => $request->validated('name'),
                'email' => strtolower($request->validated('email')),
                'role' => 'supervisor',
                'company' => $company->name,
                'company_id' => $company->id,
                'password' => Hash::make($request->validated('password')),
                'email_verified_at' => now(),
            ]);

            $company->update([
                'representative_user_id' => $user->id,
                'supervisor_name' => $user->name,
                'supervisor_email' => $user->email,
                'invite_token' => null, // Consume the token
            ]);

            $token = $user->createToken('web-session')->plainTextToken;

            return response()->json([
                'user' => new UserResource($user),
                'token' => $token,
            ], 201);
        });
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Successfully logged out.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }
}
