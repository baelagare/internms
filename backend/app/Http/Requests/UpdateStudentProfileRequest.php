<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStudentProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStudent() ?? false;
    }

    public function rules(): array
    {
        return [
            'phone' => ['nullable', 'string', 'max:50'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'gpa' => ['nullable', 'numeric', 'min:1.0', 'max:5.0'],
            'studentNumber' => ['nullable', 'string', 'max:50'],
            'program' => ['nullable', 'string', 'max:100'],
        ];
    }
}
