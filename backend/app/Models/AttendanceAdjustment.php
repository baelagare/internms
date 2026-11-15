<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'attendance_log_id',
        'date',
        'requested_hours',
        'reason',
        'notes',
        'am_in',
        'am_out',
        'pm_in',
        'pm_out',
        'status',
        'reviewer_id',
        'reviewer_notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'requested_hours' => 'float',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function log(): BelongsTo
    {
        return $this->belongsTo(AttendanceLog::class, 'attendance_log_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
