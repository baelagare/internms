<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddPortfolioItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStudent() ?? false;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:skills,coursework,achievements'],
            'item' => ['required'],
        ];
    }
}
