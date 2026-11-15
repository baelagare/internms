<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePartnerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $user = $this->user();

        if ($user->isSupervisor()) {
            // Supervisors can only edit their own company's role details
            return [
                'role_title' => ['nullable', 'string', 'max:150'],
                'description' => ['nullable', 'string', 'max:5000'],
                'required_skills' => ['nullable'],
            ];
        }

        return [
            'name' => ['nullable', 'string', 'max:255'],
            'college_code' => ['nullable', 'string', 'max:50'],
            'location' => ['nullable', 'string', 'max:255'],
            'role_title' => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:5000'],
            'required_skills' => ['nullable'],
            'max_slots' => ['nullable', 'integer', 'min:1', 'max:100'],
            'min_gpa' => ['nullable', 'numeric', 'min:1.0', 'max:3.0'],
            'supervisor_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
