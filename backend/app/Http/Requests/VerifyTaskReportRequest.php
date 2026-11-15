<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyTaskReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSupervisor() || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:Supervisor Verified,Returned for Revision'],
            'supervisor_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
