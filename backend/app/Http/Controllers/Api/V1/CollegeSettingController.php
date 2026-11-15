<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCollegeSettingsRequest;
use App\Models\College;
use App\Models\CollegeSetting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;

class CollegeSettingController extends Controller
{
    public function update(string $code, UpdateCollegeSettingsRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isCoordinator() && $user->college_code !== $code) {
            abort(403, 'You can only update settings for your own college.');
        }

        $college = College::firstOrCreate(['code' => $code], ['name' => $code]);

        $keywords = $request->validated('ruleBClericalKeywords');
        if (is_string($keywords)) {
            $keywords = array_values(array_filter(array_map('trim', explode(',', $keywords))));
        }

        $setting = CollegeSetting::updateOrCreate(
            ['college_code' => $code],
            [
                'required_hours' => $request->validated('requiredHours'),
                'max_gpa_cutoff' => $request->validated('maxGpaCutoff'),
                'rule_a_max_consecutive_absences' => $request->validated('ruleAMaxConsecutiveAbsences'),
                'rule_a_max_deficit_pct' => $request->validated('ruleAMaxDeficitPct'),
                'rule_b_consecutive_weeks' => $request->validated('ruleBConsecutiveWeeks'),
                'rule_b_clerical_keywords' => $keywords ?? [],
            ]
        );

        AuditService::record(
            $user,
            'SETTINGS_UPDATED',
            "Approved quotas and alert thresholds updated for {$code} (Required: {$setting->required_hours}h, GPA: {$setting->max_gpa_cutoff}).",
            $code
        );

        return response()->json([
            'message' => 'College settings updated successfully.',
            'settings' => $setting,
        ]);
    }
}
