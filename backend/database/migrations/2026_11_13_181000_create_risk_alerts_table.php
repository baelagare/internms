<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('risk_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('college_code')->index();
            $table->string('rule_key')->index(); // RULE_A_ATTENDANCE, RULE_B_MISALIGNMENT, RULE_C_DOCS
            $table->string('rule_label');
            $table->json('triggers')->nullable();
            $table->json('evidence')->nullable();
            $table->string('status')->default('PENDING')->index(); // PENDING, DISPATCHED, DISMISSED
            $table->string('intervention_stage')->nullable(); // warning_1, warning_2, case_conference, remedial_plan
            $table->text('dispatched_message')->nullable();
            $table->text('dismissed_reason')->nullable();
            $table->unsignedBigInteger('reviewed_by_user_id')->nullable()->index();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('risk_alerts');
    }
};
