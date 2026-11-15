<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'week',
        'period_start',
        'period_end',
        'hours',
        'summary',
        'evidence_path',
        'status',
        'supervisor_id',
        'supervisor_notes',
        'coordinator_id',
        'coordinator_notes',
    ];

    protected function casts(): array
    {
        return [
            'week' => 'integer',
            'period_start' => 'date',
            'period_end' => 'date',
            'hours' => 'float',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }
}
