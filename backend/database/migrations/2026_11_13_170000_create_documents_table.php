<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('doc_code')->index(); // e.g. MOA, MEDICAL_CERT, PARENT_CONSENT, RESUME
            $table->string('title');
            $table->string('issuer')->nullable();
            $table->string('original_name');
            $table->string('file_path');
            $table->unsignedInteger('file_size_bytes');
            $table->string('mime_type');
            $table->string('status')->default('Pending')->index(); // Pending, Verified, Returned for Revision
            $table->unsignedBigInteger('reviewer_id')->nullable()->index();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
