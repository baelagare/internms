<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttendancePunchRequest;
use App\Http\Requests\ReviewAdjustmentRequest;
use App\Http\Requests\SubmitAdjustmentRequest;
use App\Models\AttendanceAdjustment;
use App\Models\AttendanceLog;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AttendanceController extends Controller
{
    /**
     * Calculate session hours with a 4.0h maximum cap per session.
     */
    protected function calculateSessionHours(?string $in, ?string $out): float
    {
        if (! $in || ! $out) return 0.0;

        try {
            $inTime = Carbon::createFromFormat('H:i:s', strlen($in) === 5 ? "$in:00" : $in);
            $outTime = Carbon::createFromFormat('H:i:s', strlen($out) === 5 ? "$out:00" : $out);

            if ($outTime->lessThanOrEqualTo($inTime)) {
                return 0.0;
            }

            $diffMinutes = $inTime->diffInMinutes($outTime);
            $hours = round($diffMinutes / 60, 1);

            // Cap individual session at 4.0 hours
            return min(4.0, (float) $hours);
        } catch (\Throwable) {
            return 0.0;
        }
    }

    public function punch(AttendancePunchRequest $request): JsonResponse
    {
        $user = $request->user();
        $student = Student::firstOrCreate(
            ['user_id' => $user->id],
            ['college_code' => $user->college_code]
        );

        $date = $request->validated('date') ?? now()->toDateString();
        $type = $request->validated('type');
        $time = $request->validated('time') ?? now()->format('H:i:s');

        $log = AttendanceLog::where('student_id', $student->id)
            ->whereDate('date', $date)
            ->first();

        if (! $log) {
            $log = new AttendanceLog([
                'student_id' => $student->id,
                'date' => $date,
                'hours' => 0.0,
                'status' => 'Submitted',
            ]);
        }

        $log->$type = $time;

        // Recalculate daily hours with 4.0h per session cap (max 8.0h daily total)
        $amHours = $this->calculateSessionHours($log->am_in, $log->am_out);
        $pmHours = $this->calculateSessionHours($log->pm_in, $log->pm_out);
        $log->hours = min(8.0, $amHours + $pmHours);

        $log->save();

        return response()->json([
            'message' => 'Attendance punch recorded.',
            'log' => $log,
        ]);
    }

    public function adjust(SubmitAdjustmentRequest $request): JsonResponse
    {
        $user = $request->user();
        $student = Student::firstOrCreate(
            ['user_id' => $user->id],
            ['college_code' => $user->college_code]
        );

        $existingLog = AttendanceLog::where('student_id', $student->id)
            ->where('date', $request->validated('date'))
            ->first();

        $adjustment = AttendanceAdjustment::create([
            'student_id' => $student->id,
            'attendance_log_id' => $existingLog?->id,
            'date' => $request->validated('date'),
            'requested_hours' => $request->validated('requested_hours'),
            'reason' => $request->validated('reason'),
            'notes' => $request->validated('notes'),
            'am_in' => $request->validated('am_in'),
            'am_out' => $request->validated('am_out'),
            'pm_in' => $request->validated('pm_in'),
            'pm_out' => $request->validated('pm_out'),
            'status' => 'Pending',
        ]);

        return response()->json([
            'message' => 'Attendance adjustment request submitted.',
            'adjustment' => $adjustment,
        ], 201);
    }

    public function reviewAdjustment(int $id, ReviewAdjustmentRequest $request): JsonResponse
    {
        $adjustment = AttendanceAdjustment::with('student')->findOrFail($id);
        $user = $request->user();

        if ($user->isCoordinator() && $adjustment->student->college_code !== $user->college_code) {
            abort(403, 'You cannot review adjustments for another college.');
        }

        $status = $request->validated('status');

        $adjustment->update([
            'status' => $status,
            'reviewer_id' => $user->id,
            'reviewer_notes' => $request->validated('notes'),
        ]);

        // If approved, update or create the corresponding AttendanceLog
        if ($status === 'Approved') {
            $log = AttendanceLog::where('student_id', $adjustment->student_id)
                ->whereDate('date', $adjustment->date)
                ->first();

            if (! $log) {
                $log = new AttendanceLog([
                    'student_id' => $adjustment->student_id,
                    'date' => $adjustment->date,
                ]);
            }

            $log->hours = $adjustment->requested_hours;
            $log->status = $user->isSupervisor() ? 'Supervisor Verified' : 'Coordinator Approved';
            if ($adjustment->am_in) $log->am_in = $adjustment->am_in;
            if ($adjustment->am_out) $log->am_out = $adjustment->am_out;
            if ($adjustment->pm_in) $log->pm_in = $adjustment->pm_in;
            if ($adjustment->pm_out) $log->pm_out = $adjustment->pm_out;
            $log->save();
        }

        return response()->json([
            'message' => 'Attendance adjustment review recorded.',
            'adjustment' => $adjustment->fresh(),
        ]);
    }
}
