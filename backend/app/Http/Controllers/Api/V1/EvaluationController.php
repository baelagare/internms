<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEvaluationRequest;
use App\Models\Company;
use App\Models\Evaluation;
use App\Models\Student;
use Illuminate\Http\JsonResponse;

class EvaluationController extends Controller
{
    protected function calculateRecommendation(float $percentage): string
    {
        if ($percentage >= 90.0) return 'Outstanding';
        if ($percentage >= 80.0) return 'Very Satisfactory';
        if ($percentage >= 70.0) return 'Satisfactory';
        if ($percentage >= 60.0) return 'Fair';
        return 'Needs Improvement';
    }

    public function store(StoreEvaluationRequest $request): JsonResponse
    {
        $user = $request->user();
        $student = Student::with('user')->findOrFail($request->validated('student_id'));

        // Supervisor can only evaluate their assigned interns
        if ($user->isSupervisor()) {
            if ($student->user->company_id !== $user->company_id && $student->user->company !== $user->company) {
                abort(403, 'You can only evaluate interns placed at your company.');
            }
            $companyId = $user->company_id ?? $student->user->company_id;
        } else {
            $companyId = $student->user->company_id ?? Company::first()?->id;
        }

        $scores = $request->validated('scores');
        $totalScore = array_sum($scores);
        $averageScore = round($totalScore / 19, 2);
        $percentage = round(($totalScore / 95) * 100, 1);
        $recommendation = $this->calculateRecommendation($percentage);

        $evaluation = Evaluation::create([
            'student_id' => $student->id,
            'supervisor_id' => $user->id,
            'company_id' => $companyId,
            'period' => $request->validated('period') ?? 'Final',
            'academic_year' => config('app.academic_year', 'A.Y. 2026–2027'),
            'scores' => $scores,
            'total_score' => $totalScore,
            'average_score' => $averageScore,
            'percentage' => $percentage,
            'recommendation' => $recommendation,
            'feedback' => $request->validated('feedback'),
            'coordinator_clearance_status' => 'Pending Coordinator Review',
        ]);

        $student->update(['clearance_status' => 'Evaluation Completed']);

        return response()->json([
            'message' => 'Evaluation submitted successfully.',
            'evaluation' => $evaluation,
        ], 201);
    }
}
