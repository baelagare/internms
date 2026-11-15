<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'role' => ['required', 'string', 'in:coordinator,supervisor'],
            'name' => ['required', 'string', 'max:255'],
            'id' => ['required', 'string', 'max:255', 'unique:users,email'],
            'pass' => ['nullable', 'string', 'min:8', 'required_if:role,supervisor'],
            'scope' => ['required', 'string', 'max:255'],
        ];
    }
}
