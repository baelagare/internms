<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitTaskReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStudent() ?? false;
    }

    public function rules(): array
    {
        return [
            'week' => ['required', 'integer', 'min:1', 'max:52'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'hours' => ['required', 'numeric', 'min:0.5', 'max:60.0'],
            'summary' => ['required', 'string', 'min:10', 'max:5000'],
            'evidence' => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf', 'max:10240'],
        ];
    }
}
