<?php

namespace App\Http\Requests;

use App\Models\CollegeDocumentRequirement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCollegeDocumentRequirementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $requirementId = $this->route('id');
        $requirement = CollegeDocumentRequirement::find($requirementId);

        return $user?->isAdmin() || ($user?->isCoordinator() && $requirement?->college_code === $user->college_code);
    }

    public function rules(): array
    {
        $requirement = CollegeDocumentRequirement::find($this->route('id'));

        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'sortOrder' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'isRequired' => ['sometimes', 'boolean'],
            'isActive' => ['sometimes', 'boolean'],
            'docCode' => [
                'sometimes', 'required', 'string', 'max:50', 'regex:/^[A-Z0-9_-]+$/',
                Rule::unique('college_document_requirements', 'doc_code')
                    ->where('college_code', $requirement?->college_code)
                    ->ignore($requirement?->id),
            ],
        ];
    }
}
