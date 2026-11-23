<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('college_document_requirements', function (Blueprint $table) {
            $table->id();
            $table->string('college_code')->index();
            $table->string('doc_code');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('issuer')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_required')->default(true);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['college_code', 'doc_code']);
        });

        $now = now();
        $defaults = [
            ['doc_code' => 'RESUME', 'title' => 'Résumé / CV', 'description' => 'Current résumé or curriculum vitae.', 'issuer' => 'Student', 'sort_order' => 1],
            ['doc_code' => 'MOA', 'title' => 'Memorandum of Agreement', 'description' => 'Required internship agreement record.', 'issuer' => 'OJT Office', 'sort_order' => 2],
            ['doc_code' => 'MEDICAL_CERT', 'title' => 'Medical Clearance Certificate', 'description' => 'Current medical clearance for internship deployment.', 'issuer' => 'University Health Office', 'sort_order' => 3],
            ['doc_code' => 'PARENT_CONSENT', 'title' => 'Parent / Guardian Consent Form', 'description' => 'Signed parent or guardian consent form.', 'issuer' => 'Parent / Guardian', 'sort_order' => 4],
            ['doc_code' => 'INSURANCE', 'title' => 'Student Internship Insurance Policy', 'description' => 'Evidence of required internship insurance coverage.', 'issuer' => 'Student Affairs Office', 'sort_order' => 5],
        ];

        foreach (['CAS', 'CBM', 'CET', 'CITE', 'CTE'] as $collegeCode) {
            foreach ($defaults as $default) {
                DB::table('college_document_requirements')->insertOrIgnore([
                    'college_code' => $collegeCode,
                    ...$default,
                    'is_required' => true,
                    'is_active' => true,
                    'created_by_user_id' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('college_document_requirements');
    }
};
