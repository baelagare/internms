<?php

use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CollegeSettingController;
use App\Http\Controllers\Api\V1\CollegeDocumentRequirementController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\MessageController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PolicyController;
use App\Http\Controllers\Api\V1\StaffController;
use App\Http\Controllers\Api\V1\StudentProfileController;
use App\Http\Controllers\Api\V1\TaskReportController;
use App\Http\Controllers\Api\V1\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class);

    // Authentication
    Route::prefix('auth')->middleware('throttle:10,1')->group(function (): void {
        Route::post('/google', [AuthController::class, 'google']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/supervisor-invite', [AuthController::class, 'supervisorInvite']);
    });

    // Protected endpoints
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/workspace', [WorkspaceController::class, 'show']);

        // Student Profile & Portfolio
        Route::patch('/students/me', [StudentProfileController::class, 'update']);
        Route::post('/students/me/portfolio', [StudentProfileController::class, 'addPortfolio']);
        Route::delete('/students/me/portfolio', [StudentProfileController::class, 'removePortfolio']);
        Route::post('/students/me/onboarding', [\App\Http\Controllers\Api\V1\EnrollmentController::class, 'onboarding']);
        Route::post('/students/{id}/enrollment/approve', [\App\Http\Controllers\Api\V1\EnrollmentController::class, 'approve']);
        Route::post('/students/{id}/enrollment/reject', [\App\Http\Controllers\Api\V1\EnrollmentController::class, 'reject']);
        Route::patch('/students/{id}/enrollment', [\App\Http\Controllers\Api\V1\EnrollmentController::class, 'update']);

        // Documents
        Route::post('/students/me/documents', [DocumentController::class, 'upload']);
        Route::get('/documents/{id}/download', [DocumentController::class, 'download']);
        Route::patch('/documents/{id}/review', [DocumentController::class, 'review']);

        // Weekly Task Reports
        Route::post('/task-reports', [TaskReportController::class, 'store']);
        Route::post('/task-reports/{id}/verify', [TaskReportController::class, 'verify']);
        Route::post('/task-reports/{id}/review', [TaskReportController::class, 'review']);

        // Attendance & DTR
        Route::post('/attendance/punches', [AttendanceController::class, 'punch']);
        Route::post('/attendance/adjustments', [AttendanceController::class, 'adjust']);
        Route::post('/attendance/adjustments/{id}/review', [AttendanceController::class, 'reviewAdjustment']);
        Route::post('/attendance-logs/{id}/verify', [AttendanceController::class, 'verifyLog']);
        Route::post('/attendance-logs/{id}/review', [AttendanceController::class, 'reviewLog']);
        Route::get('/attendance-logs/{id}/photo/{type}', [AttendanceController::class, 'photo'])->where('type', 'am_in|am_out|pm_in|pm_out');

        // Decision Support & Evaluations
        Route::post('/evaluations', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'store']);
        Route::post('/students/{id}/placement', [\App\Http\Controllers\Api\V1\PlacementController::class, 'store']);
        Route::post('/students/{id}/placement/return', [\App\Http\Controllers\Api\V1\PlacementController::class, 'returnPreference']);
        Route::post('/students/{id}/clearance', [\App\Http\Controllers\Api\V1\ClearanceController::class, 'certify']);
        Route::post('/alerts/{id}/review', [\App\Http\Controllers\Api\V1\AlertController::class, 'review']);

        // Governance & Communications
        Route::post('/partners', [CompanyController::class, 'store']);
        Route::patch('/partners/{id}', [CompanyController::class, 'update']);
        Route::post('/staff', [StaffController::class, 'store']);
        Route::put('/colleges/{code}/settings', [CollegeSettingController::class, 'update']);
        Route::get('/colleges/{code}/document-requirements', [CollegeDocumentRequirementController::class, 'index']);
        Route::post('/colleges/{code}/document-requirements', [CollegeDocumentRequirementController::class, 'store']);
        Route::patch('/college-document-requirements/{id}', [CollegeDocumentRequirementController::class, 'update']);
        Route::delete('/college-document-requirements/{id}', [CollegeDocumentRequirementController::class, 'deactivate']);
        Route::post('/policy-corpus', [PolicyController::class, 'store']);
        Route::get('/messages', [MessageController::class, 'index']);
        Route::post('/messages', [MessageController::class, 'store']);
        Route::get('/audit-logs', [\App\Http\Controllers\Api\V1\AuditController::class, 'index']);
    });
});


