<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('actor_id')->nullable()->index();
            $table->string('actor_name');
            $table->string('actor_role');
            $table->string('college_code')->nullable()->index();
            $table->string('action_type')->index();
            $table->unsignedBigInteger('target_student_id')->nullable()->index();
            $table->string('target_student')->nullable();
            $table->string('summary');
            $table->string('source')->default('web_api');
            $table->json('properties')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
