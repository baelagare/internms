<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->string('am_in_photo_path')->nullable();
            $table->string('am_out_photo_path')->nullable();
            $table->string('pm_in_photo_path')->nullable();
            $table->string('pm_out_photo_path')->nullable();
            $table->text('supervisor_notes')->nullable();
            $table->text('coordinator_notes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->dropColumn(['am_in_photo_path', 'am_out_photo_path', 'pm_in_photo_path', 'pm_out_photo_path', 'supervisor_notes', 'coordinator_notes']);
        });
    }
};
