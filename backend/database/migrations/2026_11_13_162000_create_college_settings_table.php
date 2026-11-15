<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('college_settings', function (Blueprint $table) {
            $table->id();
            $table->string('college_code')->unique()->index();
            $table->integer('required_hours')->default(300);
            $table->decimal('max_gpa_cutoff', 3, 2)->default(2.50);
            $table->integer('rule_a_max_consecutive_absences')->default(3);
            $table->integer('rule_a_max_deficit_pct')->default(20);
            $table->integer('rule_b_consecutive_weeks')->default(2);
            $table->json('rule_b_clerical_keywords')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('college_settings');
    }
};
