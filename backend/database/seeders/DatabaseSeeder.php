<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with institutional foundation data.
     */
    public function run(): void
    {
        $this->call(CollegeSeeder::class);
        $this->call(InstitutionalDataSeeder::class);
    }
}
