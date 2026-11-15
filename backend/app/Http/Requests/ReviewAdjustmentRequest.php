<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isCoordinator() || $this->user()?->isSupervisor() || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:Approved,Rejected'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
