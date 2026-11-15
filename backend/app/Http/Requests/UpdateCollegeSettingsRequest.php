<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCollegeSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isCoordinator() || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'requiredHours' => ['required', 'integer', 'min:100', 'max:1200'],
            'maxGpaCutoff' => ['required', 'numeric', 'min:1.0', 'max:3.0'],
            'ruleAMaxConsecutiveAbsences' => ['required', 'integer', 'min:1', 'max:15'],
            'ruleAMaxDeficitPct' => ['required', 'integer', 'min:5', 'max:50'],
            'ruleBConsecutiveWeeks' => ['required', 'integer', 'min:1', 'max:8'],
            'ruleBClericalKeywords' => ['nullable'],
        ];
    }
}
