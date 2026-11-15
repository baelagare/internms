<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStudent() ?? false;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'requested_hours' => ['required', 'numeric', 'min:0.5', 'max:8.0'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'am_in' => ['nullable', 'date_format:H:i,H:i:s'],
            'am_out' => ['nullable', 'date_format:H:i,H:i:s'],
            'pm_in' => ['nullable', 'date_format:H:i,H:i:s'],
            'pm_out' => ['nullable', 'date_format:H:i,H:i:s'],
        ];
    }
}
