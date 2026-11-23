<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'student_number',
        'college_code',
        'program',
        'enrollment_status',
        'rejection_reason',
        'verified_by_user_id',
        'verified_at',
        'gpa',
        'phone',
        'bio',
        'skills',
        'coursework',
        'achievements',
        'preferred_company',
        'preferred_company_id',
        'preferred_role',
        'assigned_role',
        'disciplinary_clearance',
        'clearance_status',
    ];

    protected function casts(): array
    {
        return [
            'gpa' => 'float',
            'skills' => 'array',
            'coursework' => 'array',
            'achievements' => 'array',
            'verified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }

    public function college(): BelongsTo
    {
        return $this->belongsTo(College::class, 'college_code', 'code');
    }

    public function preferredCompany(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'preferred_company_id');
    }

    public function placements(): HasMany
    {
        return $this->hasMany(Placement::class);
    }

    public function activePlacement(): HasOne
    {
        return $this->hasOne(Placement::class)->ofMany(['id' => 'max'], function ($query) {
            $query->where('status', 'Approved & Deployed');
        });
    }

    public function pendingPreference(): HasOne
    {
        return $this->hasOne(Placement::class)->ofMany(['id' => 'max'], function ($query) {
            $query->whereIn('status', ['Pending Coordinator Endorsement', 'Returned for Revision']);
        });
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function taskReports(): HasMany
    {
        return $this->hasMany(TaskReport::class);
    }

    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class);
    }

    public function attendanceAdjustments(): HasMany
    {
        return $this->hasMany(AttendanceAdjustment::class);
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }

    public function latestEvaluation(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Evaluation::class)->latestOfMany();
    }

    public function riskAlerts(): HasMany
    {
        return $this->hasMany(RiskAlert::class);
    }
}
