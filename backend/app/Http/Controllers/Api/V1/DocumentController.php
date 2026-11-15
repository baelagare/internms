<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewDocumentRequest;
use App\Http\Requests\UploadDocumentRequest;
use App\Models\Document;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function upload(UploadDocumentRequest $request): JsonResponse
    {
        $user = $request->user();
        $student = Student::firstOrCreate(
            ['user_id' => $user->id],
            ['college_code' => $user->college_code]
        );

        $file = $request->file('file');
        $path = $file->store("documents/{$student->id}", 'local');

        $document = Document::create([
            'student_id' => $student->id,
            'doc_code' => $request->validated('docCode'),
            'title' => $request->validated('title'),
            'issuer' => $request->validated('issuer'),
            'original_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'status' => 'Pending',
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully.',
            'document' => [
                'id' => $document->id,
                'docCode' => $document->doc_code,
                'title' => $document->title,
                'issuer' => $document->issuer,
                'fileName' => $document->original_name,
                'fileSize' => $document->file_size_bytes,
                'status' => $document->status,
                'uploadedAt' => $document->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function download(int $id, Request $request): StreamedResponse
    {
        $document = Document::findOrFail($id);
        $user = $request->user();

        // Authorization check: student can only download own document
        if ($user->isStudent() && $document->student->user_id !== $user->id) {
            abort(403, 'You are not authorized to view this document.');
        }

        // Coordinator check: must belong to their college
        if ($user->isCoordinator() && $document->student->college_code !== $user->college_code) {
            abort(403, 'You are not authorized to view this document.');
        }

        if (! Storage::disk('local')->exists($document->file_path)) {
            abort(404, 'The requested document file was not found.');
        }

        return Storage::disk('local')->download($document->file_path, $document->original_name);
    }

    public function review(int $id, ReviewDocumentRequest $request): JsonResponse
    {
        $document = Document::findOrFail($id);
        $user = $request->user();

        if ($user->isCoordinator() && $document->student->college_code !== $user->college_code) {
            abort(403, 'You cannot review documents for another college.');
        }

        $document->update([
            'status' => $request->validated('status'),
            'reviewer_id' => $user->id,
            'remarks' => $request->validated('remarks'),
        ]);

        return response()->json([
            'message' => 'Document review recorded.',
            'document' => [
                'id' => $document->id,
                'status' => $document->status,
                'remarks' => $document->remarks,
            ],
        ]);
    }
}
