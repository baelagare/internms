<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewAlertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isCoordinator() || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'action' => ['required', 'string', 'in:approve,edit,dismiss'],
            'stage' => ['nullable', 'string', 'in:warning_1,warning_2,case_conference,remedial_plan'],
            'message' => ['nullable', 'string', 'max:2000'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
