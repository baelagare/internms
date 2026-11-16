<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $trustedProxies = env('APP_TRUSTED_PROXIES');

        if ($trustedProxies) {
            $middleware->trustProxies(
                at: $trustedProxies === '*' ? '*' : array_map('trim', explode(',', $trustedProxies))
            );
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->wantsJson());

        $exceptions->render(function (\Throwable $exception, \Illuminate\Http\Request $request) {
            if (! $request->is('api/*') && ! $request->wantsJson()) {
                return null;
            }

            $status = method_exists($exception, 'getStatusCode') && $exception->getStatusCode() ? $exception->getStatusCode() : 500;
            $message = $exception->getMessage() ?: 'Something went wrong.';

            if ($exception instanceof \Illuminate\Validation\ValidationException) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => $exception->errors(),
                ], 422);
            }

            if ($exception instanceof \Illuminate\Auth\AuthenticationException) {
                return response()->json(['message' => 'Unauthenticated.', 'errors' => []], 401);
            }

            if ($exception instanceof \Illuminate\Auth\Access\AuthorizationException) {
                return response()->json(['message' => 'You are not authorized to perform this action.', 'errors' => []], 403);
            }

            if ($exception instanceof \Symfony\Component\HttpKernel\Exception\HttpException) {
                $message = match ($exception->getStatusCode()) {
                    404 => 'The requested resource was not found.',
                    409 => 'The request conflicts with the current state of the resource.',
                    422 => 'The given data was invalid.',
                    default => $exception->getMessage() ?: 'Request failed.',
                };

                return response()->json(['message' => $message, 'errors' => []], $exception->getStatusCode());
            }

            if ($exception instanceof \Illuminate\Database\UniqueConstraintViolationException) {
                return response()->json(['message' => 'The resource already exists.', 'errors' => []], 409);
            }

            $safeMessage = $status === 500 ? 'An unexpected error occurred.' : $message;

            return response()->json(['message' => $safeMessage, 'errors' => []], $status);
        });
    })->create();
