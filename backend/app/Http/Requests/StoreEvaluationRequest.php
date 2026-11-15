<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSupervisor() || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        $rules = [
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'period' => ['nullable', 'string', 'in:Midterm,Final'],
            'feedback' => ['nullable', 'string', 'max:2000'],
            'scores' => ['required', 'array'],
        ];

        // Ensure all 19 rubric criteria are rated between 1 and 5
        for ($i = 1; $i <= 19; $i++) {
            $rules["scores.q{$i}"] = ['required', 'integer', 'min:1', 'max:5'];
        }

        return $rules;
    }
}
