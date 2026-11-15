<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->unsignedInteger('week')->index();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('hours', 5, 1)->default(0.0);
            $table->text('summary');
            $table->string('evidence_path')->nullable();
            $table->string('status')->default('Submitted')->index(); // Submitted, Supervisor Verified, Coordinator Approved, Returned for Revision
            $table->unsignedBigInteger('supervisor_id')->nullable()->index();
            $table->text('supervisor_notes')->nullable();
            $table->unsignedBigInteger('coordinator_id')->nullable()->index();
            $table->text('coordinator_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_reports');
    }
};
