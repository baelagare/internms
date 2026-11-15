<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('policy_corpus', function (Blueprint $table) {
            $table->id();
            $table->string('chunk_id')->unique()->index();
            $table->string('source_doc');
            $table->string('section_ref')->nullable();
            $table->string('title');
            $table->string('rule_category')->index(); // RULE_A_ATTENDANCE, RULE_B_MISALIGNMENT, RULE_C_DOCS
            $table->text('verbatim_text');
            $table->string('status')->default('ACTIVE');
            $table->timestamp('last_indexed_at')->nullable();
            $table->unsignedBigInteger('created_by_user_id')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('policy_corpus');
    }
};
