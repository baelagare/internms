<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCollegeDocumentRequirementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user?->isAdmin() || ($user?->isCoordinator() && $user->college_code === $this->route('code'));
    }

    public function rules(): array
    {
        $code = (string) $this->route('code');

        return [
            'docCode' => ['required', 'string', 'max:50', 'regex:/^[A-Z0-9_-]+$/', Rule::unique('college_document_requirements', 'doc_code')->where('college_code', $code)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'sortOrder' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'isRequired' => ['sometimes', 'boolean'],
        ];
    }
}
