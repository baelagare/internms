<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendancePunchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStudent() ?? false;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:am_in,am_out,pm_in,pm_out'],
            'date' => ['nullable', 'date'],
            'time' => ['nullable', 'date_format:H:i,H:i:s'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:4096'],
        ];
    }
}
