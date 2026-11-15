<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStudent() ?? false;
    }

    public function rules(): array
    {
        return [
            'docCode' => ['required', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:255'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:pdf,png,jpg,jpeg', 'max:10240'], // 10MB max
        ];
    }
}
