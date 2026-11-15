<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollegeSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'college_code',
        'required_hours',
        'max_gpa_cutoff',
        'rule_a_max_consecutive_absences',
        'rule_a_max_deficit_pct',
        'rule_b_consecutive_weeks',
        'rule_b_clerical_keywords',
    ];

    protected function casts(): array
    {
        return [
            'required_hours' => 'integer',
            'max_gpa_cutoff' => 'float',
            'rule_a_max_consecutive_absences' => 'integer',
            'rule_a_max_deficit_pct' => 'integer',
            'rule_b_consecutive_weeks' => 'integer',
            'rule_b_clerical_keywords' => 'array',
        ];
    }

    public function college(): BelongsTo
    {
        return $this->belongsTo(College::class, 'college_code', 'code');
    }
}
