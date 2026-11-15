<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('college_code')->nullable()->index();
            $table->string('location')->nullable();
            $table->string('role_title')->nullable();
            $table->text('description')->nullable();
            $table->json('required_skills')->nullable();
            $table->integer('max_slots')->nullable();
            $table->integer('filled_slots')->default(0);
            $table->decimal('min_gpa', 3, 2)->nullable();
            $table->string('invite_token')->nullable()->unique()->index();
            $table->unsignedBigInteger('representative_user_id')->nullable()->index();
            $table->string('supervisor_name')->nullable();
            $table->string('supervisor_email')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
