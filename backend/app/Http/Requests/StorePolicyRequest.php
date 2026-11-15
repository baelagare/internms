<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'chunkId' => ['required', 'string', 'max:50', 'unique:policy_corpus,chunk_id'],
            'sourceDoc' => ['required', 'string', 'max:255'],
            'sectionRef' => ['nullable', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:255'],
            'ruleCategory' => ['required', 'string', 'in:RULE_A_ATTENDANCE,RULE_B_MISALIGNMENT,RULE_C_DOCS'],
            'verbatimText' => ['required', 'string', 'min:10', 'max:10000'],
        ];
    }
}
