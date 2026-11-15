<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('student_number')->nullable()->unique()->index();
            $table->string('college_code')->nullable()->index();
            $table->string('program')->nullable();
            $table->decimal('gpa', 3, 2)->nullable();
            $table->string('phone')->nullable();
            $table->text('bio')->nullable();
            $table->json('skills')->nullable();
            $table->json('coursework')->nullable();
            $table->json('achievements')->nullable();
            $table->string('preferred_company')->nullable();
            $table->unsignedBigInteger('preferred_company_id')->nullable()->index();
            $table->string('assigned_role')->nullable();
            $table->string('disciplinary_clearance')->nullable();
            $table->string('clearance_status')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
