<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Reassign any remaining records from CBA to CBM
        DB::table('users')->where('college_code', 'CBA')->update(['college_code' => 'CBM']);
        DB::table('students')->where('college_code', 'CBA')->update(['college_code' => 'CBM']);
        DB::table('companies')->where('college_code', 'CBA')->update(['college_code' => 'CBM']);
        DB::table('risk_alerts')->where('college_code', 'CBA')->update(['college_code' => 'CBM']);
        DB::table('audit_logs')->where('college_code', 'CBA')->update(['college_code' => 'CBM']);

        // 2. Reassign any remaining records from CED to CTE
        DB::table('users')->where('college_code', 'CED')->update(['college_code' => 'CTE']);
        DB::table('students')->where('college_code', 'CED')->update(['college_code' => 'CTE']);
        DB::table('companies')->where('college_code', 'CED')->update(['college_code' => 'CTE']);
        DB::table('risk_alerts')->where('college_code', 'CED')->update(['college_code' => 'CTE']);
        DB::table('audit_logs')->where('college_code', 'CED')->update(['college_code' => 'CTE']);

        // 3. Purge legacy college settings
        DB::table('college_settings')->whereIn('college_code', ['CBA', 'CED'])->delete();

        // 4. Purge legacy colleges
        DB::table('colleges')->whereIn('code', ['CBA', 'CED'])->delete();
    }

    public function down(): void
    {
    }
};
