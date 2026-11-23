<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PlacementDecisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $isStudent = $this->user()?->isStudent() ?? false;

        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'preferred_role' => $isStudent ? ['nullable', 'string', 'max:150'] : ['prohibited'],
            'assigned_role' => $isStudent ? ['prohibited'] : ['nullable', 'string', 'max:150'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
