<?php

namespace Database\Seeders;

use App\Models\CollegeDocumentRequirement;
use App\Models\Document;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class GerraldDemoDocumentsSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'jcjuntilla@nemsu.edu.ph')->first();
        $student = $user?->student;

        if (! $student || $student->college_code !== 'CITE') {
            return;
        }

        $reviewerId = User::where('role', 'coordinator')
            ->where('college_code', 'CITE')
            ->value('id');

        $requirements = CollegeDocumentRequirement::where('college_code', 'CITE')
            ->where('is_active', true)
            ->where('is_required', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        foreach ($requirements as $requirement) {
            $document = Document::where('student_id', $student->id)
                ->where('doc_code', $requirement->doc_code)
                ->first();

            $filePath = "documents/{$student->id}/demo-{$requirement->doc_code}.pdf";
            if ($document) {
                // Preserve submitted documents and review decisions. Repair only the known
                // metadata-only documents created by the institutional demo seeder.
                $legacySeedPath = 'documents/'.$student->id.'/'.strtolower($requirement->doc_code).'.pdf';
                $legacySeedName = strtolower($requirement->doc_code).'-'.$student->student_number.'.pdf';
                $resumeDemoName = $requirement->doc_code === 'RESUME'
                    && $student->user->email === 'jcjuntilla@nemsu.edu.ph'
                    ? 'JUNTILLA_GERRALD_RESUME.pdf'
                    : null;
                $isKnownDemoRecord = ($document->file_path === $legacySeedPath
                    && $document->original_name === $legacySeedName)
                    || ($requirement->doc_code === 'RESUME'
                        && $document->original_name === $resumeDemoName);

                if (! $isKnownDemoRecord) {
                    continue;
                }

                // The pre-existing résumé row is part of this named demo fixture. Keep
                // its uploaded bytes and metadata, but mark the fixture record complete.
                if ($requirement->doc_code === 'RESUME' && Storage::disk('local')->exists($document->file_path)) {
                    $document->update([
                        'status' => 'Verified',
                        'reviewer_id' => $reviewerId,
                        'remarks' => 'Verified for the designated placement walkthrough.',
                    ]);
                    continue;
                }

                // Never replace an existing file. Repair only a known seeded placeholder
                // that lacks its corresponding stored file.
                if (Storage::disk('local')->exists($document->file_path)) {
                    $document->update(['status' => 'Verified']);
                    continue;
                }
            }

            if (! Storage::disk('local')->exists($filePath)) {
                Storage::disk('local')->put($filePath, $this->samplePdf($requirement->title));
            }

            $values = [
                'title' => $requirement->title,
                'issuer' => $requirement->issuer ?? 'NEMSU OJT Office',
                'original_name' => strtolower($requirement->doc_code).'-'.$student->student_number.'.pdf',
                'file_path' => $filePath,
                'file_size_bytes' => Storage::disk('local')->size($filePath),
                'mime_type' => 'application/pdf',
                'status' => 'Verified',
                'reviewer_id' => $reviewerId,
                'remarks' => 'Seeded sample document record for the designated placement walkthrough.',
            ];

            if ($document) {
                $document->update($values);
            } else {
                Document::create([
                    ...$values,
                    'student_id' => $student->id,
                    'doc_code' => $requirement->doc_code,
                ]);
            }
        }
    }

    private function samplePdf(string $title): string
    {
        $lines = [
            'BT',
            '/F1 18 Tf',
            '72 740 Td',
            '(Sample document record) Tj',
            '/F1 12 Tf',
            '0 -28 Td',
            '('.$this->escapePdf($title).') Tj',
            '0 -22 Td',
            '(Generated for a placement walkthrough.) Tj',
            'ET',
        ];
        $stream = implode("\n", $lines);
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            "<< /Length ".strlen($stream)." >>\nstream\n{$stream}\nendstream",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n{$object}\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach (array_slice($offsets, 1) as $offset) {
            $pdf .= sprintf('%010d 00000 n ', $offset)."\n";
        }
        $pdf .= 'trailer << /Size '.(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF\n";

        return $pdf;
    }

    private function escapePdf(string $value): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], preg_replace('/[^\x20-\x7E]/', ' ', $value) ?? 'Sample document');
    }
}
