<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('supervisor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('period')->default('Final'); // Midterm, Final
            $table->string('academic_year')->nullable();
            $table->json('scores'); // q1 through q19
            $table->unsignedInteger('total_score'); // max 95
            $table->decimal('average_score', 3, 2); // max 5.00
            $table->decimal('percentage', 4, 1); // max 100.0%
            $table->string('recommendation'); // Outstanding, Very Satisfactory, Satisfactory, Fair, Needs Improvement
            $table->text('feedback')->nullable();
            $table->string('coordinator_clearance_status')->default('Pending Coordinator Review')->index();
            $table->unsignedBigInteger('certified_by_user_id')->nullable()->index();
            $table->timestamp('certified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};
