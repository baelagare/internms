<?php
// Exercise the actual Laravel HTTP kernel inside a rolled-back database transaction.
// No test account or token is retained in the user's backend database.
require 'C:/xampp/htdocs/internms-api/vendor/autoload.php';
$app = require 'C:/xampp/htdocs/internms-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();
Illuminate\Support\Facades\DB::beginTransaction();
$results = [];
function callAuth($kernel, $path, $method, $body = [], $token = null) {
    $headers = ['HTTP_ACCEPT' => 'application/json', 'CONTENT_TYPE' => 'application/json'];
    if ($token) $headers['HTTP_AUTHORIZATION'] = 'Bearer '.$token;
    $request = Illuminate\Http\Request::create('/api/v1/auth/'.$path, $method, [], [], [], $headers, json_encode($body));
    app('auth')->forgetGuards();
    $response = $kernel->handle($request);
    return [$response->getStatusCode(), json_decode($response->getContent(), true)];
}
try {
    $id = 'migration-test-'.bin2hex(random_bytes(5));
    [$status, $payload] = callAuth($kernel, 'register', 'POST', ['identifier_id' => $id, 'name' => 'Migration Test Student', 'email' => $id.'@example.test', 'password' => 'TestPassword123!', 'password_confirmation' => 'TestPassword123!', 'role' => 'student', 'college' => 'CITE']);
    if ($status !== 201) throw new Exception('Registration failed: '.$status.' '.json_encode($payload));
    $results[] = 'Registration 201';
    $token = $payload['data']['token'];
    [$status, $payload] = callAuth($kernel, 'me', 'GET', [], $token);
    if ($status !== 200 || $payload['data']['identifier_id'] !== $id) throw new Exception('Me failed');
    $results[] = 'Bearer /me 200';
    [$status] = callAuth($kernel, 'logout', 'POST', [], $token);
    if ($status !== 200) throw new Exception('Logout failed');
    $results[] = 'Logout 200';
    [$status] = callAuth($kernel, 'me', 'GET', [], $token);
    if ($status !== 401) throw new Exception('Revoked token accepted: '.$status);
    $results[] = 'Revoked token rejected 401';
    [$status] = callAuth($kernel, 'login', 'POST', ['login' => $id, 'password' => 'TestPassword123!', 'device_name' => 'migration-test']);
    if ($status !== 200) throw new Exception('Login failed');
    $results[] = 'Identifier login 200';
    [$status] = callAuth($kernel, 'login', 'POST', ['login' => $id, 'password' => 'wrong']);
    if ($status !== 422) throw new Exception('Wrong password not rejected');
    $results[] = 'Wrong password 422';
    echo json_encode(['passed' => true, 'checks' => $results, 'persistence' => 'Rolled back'], JSON_PRETTY_PRINT);
} catch (Throwable $error) {
    echo json_encode(['passed' => false, 'checks' => $results, 'error' => $error->getMessage()], JSON_PRETTY_PRINT);
    $failed = true;
} finally {
    Illuminate\Support\Facades\DB::rollBack();
}
if (isset($failed)) exit(1);