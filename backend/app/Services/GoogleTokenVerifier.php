<?php

namespace App\Services;

use Google\Auth\AccessToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleTokenVerifier
{
    /**
     * Verify a Google ID token and return its payload, or null if invalid.
     *
     * @param string $idToken
     * @return array<string, mixed>|null
     */
    public function verify(string $idToken): ?array
    {
        $clientId = config('services.google.client_id');

        // Do not accept identity tokens unless the expected OAuth audience is configured.
        if (! is_string($clientId) || trim($clientId) === '') {
            Log::error('Google authentication is unavailable because GOOGLE_CLIENT_ID is not configured.');

            return null;
        }

        // Verify with Google's official tokeninfo endpoint
        try {
            $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $idToken,
            ]);

            if ($response->successful()) {
                $payload = $response->json();

                if (is_array($payload) && ! empty($payload['email'])) {
                    // Check audience if configured
                    if (($payload['aud'] ?? null) !== $clientId) {
                        Log::warning('Google token audience mismatch', [
                            'expected' => $clientId,
                            'received' => $payload['aud'] ?? null,
                        ]);

                        return null;
                    }

                    // Check issuer (Google returns accounts.google.com or https://accounts.google.com)
                    $iss = $payload['iss'] ?? '';
                    if (! in_array($iss, ['accounts.google.com', 'https://accounts.google.com'], true)) {
                        return null;
                    }

                    // Check email_verified (Google returns boolean true or string "true")
                    $verified = $payload['email_verified'] ?? null;
                    if ($verified !== true && $verified !== 'true') {
                        return null;
                    }

                    return $payload;
                }
            }
        } catch (\Throwable $e) {
            Log::error('Google tokeninfo verification failed: '.$e->getMessage());
        }

        // Fallback: local AccessToken if phpseclib is present
        try {
            if (class_exists(\phpseclib3\Crypt\RSA::class)) {
                $verifier = new AccessToken();
                $options = [];
                $options['audience'] = $clientId;
                $payload = $verifier->verify($idToken, $options);

                if (
                    is_array($payload)
                    && ($payload['aud'] ?? null) === $clientId
                    && in_array($payload['iss'] ?? null, ['accounts.google.com', 'https://accounts.google.com'], true)
                    && (($payload['email_verified'] ?? null) === true || ($payload['email_verified'] ?? null) === 'true')
                ) {
                    return $payload;
                }
            }
        } catch (\Throwable) {
            // fallback failed
        }

        return null;
    }
}

