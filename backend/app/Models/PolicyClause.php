<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PolicyClause extends Model
{
    use HasFactory;

    protected $table = 'policy_corpus';

    protected $fillable = [
        'chunk_id',
        'source_doc',
        'section_ref',
        'title',
        'rule_category',
        'verbatim_text',
        'status',
        'last_indexed_at',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'last_indexed_at' => 'datetime',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
