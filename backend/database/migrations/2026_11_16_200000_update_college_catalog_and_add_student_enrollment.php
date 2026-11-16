<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add enrollment verification columns to students table
        Schema::table('students', function (Blueprint $table) {
            $table->string('enrollment_status')->default('APPROVED')->index();
            $table->text('rejection_reason')->nullable();
            $table->unsignedBigInteger('verified_by_user_id')->nullable()->index();
            $table->timestamp('verified_at')->nullable();
        });

        // 2. Migrate legacy college codes: CBA -> CBM, CED -> CTE across existing tables
        $mappings = [
            'CBA' => ['code' => 'CBM', 'name' => 'College of Business and Management'],
            'CED' => ['code' => 'CTE', 'name' => 'College of Teacher Education'],
        ];

        foreach ($mappings as $oldCode => $target) {
            DB::table('colleges')->where('code', $oldCode)->update([
                'code' => $target['code'],
                'name' => $target['name'],
            ]);
            DB::table('college_settings')->where('college_code', $oldCode)->update(['college_code' => $target['code']]);
            DB::table('users')->where('college_code', $oldCode)->update(['college_code' => $target['code']]);
            DB::table('students')->where('college_code', $oldCode)->update(['college_code' => $target['code']]);
            DB::table('companies')->where('college_code', $oldCode)->update(['college_code' => $target['code']]);
            DB::table('risk_alerts')->where('college_code', $oldCode)->update(['college_code' => $target['code']]);
            DB::table('audit_logs')->where('college_code', $oldCode)->update(['college_code' => $target['code']]);
        }

        // 3. Mark existing students without a college as PENDING_ONBOARDING
        DB::table('students')->whereNull('college_code')->update(['enrollment_status' => 'PENDING_ONBOARDING']);
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['enrollment_status', 'rejection_reason', 'verified_by_user_id', 'verified_at']);
        });
    }
};

