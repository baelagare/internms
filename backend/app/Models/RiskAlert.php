<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiskAlert extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'college_code',
        'rule_key',
        'rule_label',
        'triggers',
        'evidence',
        'status',
        'intervention_stage',
        'dispatched_message',
        'dismissed_reason',
        'reviewed_by_user_id',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'triggers' => 'array',
            'evidence' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function college(): BelongsTo
    {
        return $this->belongsTo(College::class, 'college_code', 'code');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }
}
