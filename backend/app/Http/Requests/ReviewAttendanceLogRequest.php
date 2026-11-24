<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewAttendanceLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isCoordinator() || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:Coordinator Approved,Returned for Revision'],
            'coordinator_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
