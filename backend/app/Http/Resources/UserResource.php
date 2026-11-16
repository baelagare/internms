<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'college' => $this->college_code,
            'college_code' => $this->college_code,
            'company' => $this->company,
            'company_id' => $this->company_id,
            'enrollment_status' => $this->isStudent() ? ($this->student?->enrollment_status ?? ($this->college_code ? 'APPROVED' : 'PENDING_ONBOARDING')) : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
