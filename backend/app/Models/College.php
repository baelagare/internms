<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class College extends Model
{
    use HasFactory;

    protected $primaryKey = 'code';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'code',
        'name',
    ];

    public function setting(): HasOne
    {
        return $this->hasOne(CollegeSetting::class, 'college_code', 'code');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'college_code', 'code');
    }

    public function companies(): HasMany
    {
        return $this->hasMany(Company::class, 'college_code', 'code');
    }
}
