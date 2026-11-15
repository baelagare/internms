<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'college_code',
        'location',
        'role_title',
        'description',
        'required_skills',
        'max_slots',
        'filled_slots',
        'min_gpa',
        'invite_token',
        'representative_user_id',
        'supervisor_name',
        'supervisor_email',
    ];

    protected function casts(): array
    {
        return [
            'required_skills' => 'array',
            'max_slots' => 'integer',
            'filled_slots' => 'integer',
            'min_gpa' => 'float',
        ];
    }

    public function representative(): BelongsTo
    {
        return $this->belongsTo(User::class, 'representative_user_id');
    }
}
