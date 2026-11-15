<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewTaskReportRequest;
use App\Http\Requests\SubmitTaskReportRequest;
use App\Http\Requests\VerifyTaskReportRequest;
use App\Models\Student;
use App\Models\TaskReport;
use Illuminate\Http\JsonResponse;

class TaskReportController extends Controller
{
    public function store(SubmitTaskReportRequest $request): JsonResponse
    {
        $user = $request->user();
        $student = Student::firstOrCreate(
            ['user_id' => $user->id],
            ['college_code' => $user->college_code]
        );

        $evidencePath = null;
        if ($request->hasFile('evidence')) {
            $evidencePath = $request->file('evidence')->store("evidence/{$student->id}", 'local');
        }

        $report = TaskReport::create([
            'student_id' => $student->id,
            'week' => $request->validated('week'),
            'period_start' => $request->validated('period_start'),
            'period_end' => $request->validated('period_end'),
            'hours' => $request->validated('hours'),
            'summary' => $request->validated('summary'),
            'evidence_path' => $evidencePath,
            'status' => 'Submitted',
        ]);

        return response()->json([
            'message' => 'Weekly accomplishment report submitted.',
            'report' => $report,
        ], 201);
    }

    public function verify(int $id, VerifyTaskReportRequest $request): JsonResponse
    {
        $report = TaskReport::with('student.user')->findOrFail($id);
        $user = $request->user();

        // Supervisor can only verify interns placed with their company
        if ($user->isSupervisor()) {
            $internCompanyId = $report->student->user->company_id;
            $internCompany = $report->student->user->company;

            if ($internCompanyId !== $user->company_id && $internCompany !== $user->company) {
                abort(403, 'You cannot verify task reports for interns of another company.');
            }
        }

        $report->update([
            'status' => $request->validated('status'),
            'supervisor_id' => $user->id,
            'supervisor_notes' => $request->validated('supervisor_notes'),
        ]);

        return response()->json([
            'message' => 'Supervisor verification recorded.',
            'report' => $report->fresh(),
        ]);
    }

    public function review(int $id, ReviewTaskReportRequest $request): JsonResponse
    {
        $report = TaskReport::with('student')->findOrFail($id);
        $user = $request->user();

        // Coordinator can only approve for their college
        if ($user->isCoordinator() && $report->student->college_code !== $user->college_code) {
            abort(403, 'You cannot approve task reports for another college.');
        }

        $report->update([
            'status' => $request->validated('status'),
            'coordinator_id' => $user->id,
            'coordinator_notes' => $request->validated('coordinator_notes'),
        ]);

        return response()->json([
            'message' => 'Coordinator approval recorded.',
            'report' => $report->fresh(),
        ]);
    }
}
