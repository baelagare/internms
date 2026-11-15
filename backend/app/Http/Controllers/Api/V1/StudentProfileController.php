<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddPortfolioItemRequest;
use App\Http\Requests\RemovePortfolioItemRequest;
use App\Http\Requests\UpdateStudentProfileRequest;
use App\Models\Student;
use Illuminate\Http\JsonResponse;

class StudentProfileController extends Controller
{
    protected function getOrCreateStudent(): Student
    {
        $user = auth()->user();

        return Student::firstOrCreate(
            ['user_id' => $user->id],
            [
                'college_code' => $user->college_code,
                'skills' => [],
                'coursework' => [],
                'achievements' => [],
            ]
        );
    }

    public function update(UpdateStudentProfileRequest $request): JsonResponse
    {
        $student = $this->getOrCreateStudent();

        $data = [];
        if ($request->has('phone')) $data['phone'] = $request->validated('phone');
        if ($request->has('bio')) $data['bio'] = $request->validated('bio');
        if ($request->has('gpa')) $data['gpa'] = $request->validated('gpa');
        if ($request->has('studentNumber')) $data['student_number'] = $request->validated('studentNumber');
        if ($request->has('program')) $data['program'] = $request->validated('program');

        $student->update($data);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'student' => $student->fresh(),
        ]);
    }

    public function addPortfolio(AddPortfolioItemRequest $request): JsonResponse
    {
        $student = $this->getOrCreateStudent();
        $type = $request->validated('type');
        $item = $request->validated('item');

        $current = $student->$type ?? [];

        if (in_array($type, ['skills', 'coursework'], true)) {
            $value = is_string($item) ? trim($item) : ($item['title'] ?? $item['name'] ?? '');
            if (! in_array($value, $current, true) && $value !== '') {
                $current[] = $value;
            }
        } else {
            // achievements
            $current[] = $item;
        }

        $student->update([$type => array_values($current)]);

        return response()->json([
            'message' => 'Portfolio item added.',
            'items' => $student->$type,
        ]);
    }

    public function removePortfolio(RemovePortfolioItemRequest $request): JsonResponse
    {
        $student = $this->getOrCreateStudent();
        $type = $request->validated('type');
        $item = $request->validated('item');

        $current = $student->$type ?? [];

        if (in_array($type, ['skills', 'coursework'], true)) {
            $value = is_string($item) ? trim($item) : ($item['title'] ?? $item['name'] ?? '');
            $current = array_filter($current, fn ($existing) => $existing !== $value);
        } else {
            // achievements: compare by title or index
            $targetTitle = is_array($item) ? ($item['title'] ?? '') : (string) $item;
            $current = array_filter($current, function ($existing) use ($targetTitle) {
                $existingTitle = is_array($existing) ? ($existing['title'] ?? '') : (string) $existing;
                return $existingTitle !== $targetTitle;
            });
        }

        $student->update([$type => array_values($current)]);

        return response()->json([
            'message' => 'Portfolio item removed.',
            'items' => $student->$type,
        ]);
    }
}
