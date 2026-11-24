<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttendancePunchRequest;
use App\Http\Requests\ReviewAdjustmentRequest;
use App\Http\Requests\SubmitAdjustmentRequest;
use App\Http\Requests\VerifyAttendanceLogRequest;
use App\Http\Requests\ReviewAttendanceLogRequest;
use App\Models\AttendanceAdjustment;
use App\Models\AttendanceLog;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

        // Store the timestamped camera snapshot as audit evidence for this punch.
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store("attendance/{$student->id}/{$date}", 'local');
            $log->{$type.'_photo_path'} = $path;
        }

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

    /**
     * Supervisor stage: verify the daily punch record (records verification only, no credit).
     */
    public function verifyLog(int $id, VerifyAttendanceLogRequest $request): JsonResponse
    {
        $log = AttendanceLog::with(['student.user'])->findOrFail($id);
        $user = $request->user();

        if ($user->isSupervisor()) {
            $internCompanyId = $log->student->user->company_id;
            $internCompany = $log->student->user->company;
            if ($internCompanyId !== $user->company_id && $internCompany !== $user->company) {
                abort(403, 'You cannot verify attendance records for interns of another company.');
            }
        }

        $log->update([
            'status' => $request->validated('status'),
            'supervisor_id' => $user->id,
            'supervisor_notes' => $request->validated('supervisor_notes'),
        ]);

        return response()->json([
            'message' => 'Supervisor DTR verification recorded.',
            'log' => $log->fresh(),
        ]);
    }

    /**
     * Coordinator stage: approve the DTR for official OJT credit.
     */
    public function reviewLog(int $id, ReviewAttendanceLogRequest $request): JsonResponse
    {
        $log = AttendanceLog::with(['student.user'])->findOrFail($id);
        $user = $request->user();

        if ($user->isCoordinator() && $log->student->college_code !== $user->college_code) {
            abort(403, 'You cannot approve attendance records for another college.');
        }

        $log->update([
            'status' => $request->validated('status'),
            'coordinator_id' => $user->id,
            'coordinator_notes' => $request->validated('coordinator_notes'),
        ]);

        return response()->json([
            'message' => 'Coordinator DTR approval recorded.',
            'log' => $log->fresh(),
        ]);
    }

    /**
     * Stream a captured punch photo to an authorized student, host supervisor, or college coordinator.
     */
    public function photo(int $id, string $type, Request $request): StreamedResponse
    {
        $log = AttendanceLog::with(['student.user'])->findOrFail($id);
        $user = $request->user();

        $column = $type.'_photo_path';
        $path = $log->{$column} ?? null;
        if (! $path) {
            abort(404, 'This punch photo is not available.');
        }

        if ($user->isStudent() && $log->student->user_id !== $user->id) {
            abort(403, 'You are not authorized to view this attendance photo.');
        }
        if ($user->isSupervisor()) {
            $internCompanyId = $log->student->user->company_id;
            $internCompany = $log->student->user->company;
            if ($internCompanyId !== $user->company_id && $internCompany !== $user->company) {
                abort(403, 'You are not authorized to view this attendance photo.');
            }
        }
        if ($user->isCoordinator() && $log->student->college_code !== $user->college_code) {
            abort(403, 'You are not authorized to view this attendance photo.');
        }

        if (! Storage::disk('local')->exists($path)) {
            abort(404, 'This punch photo file could not be found.');
        }

        return Storage::disk('local')->download($path, "attendance-{$log->date}-{$type}.jpg");
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
