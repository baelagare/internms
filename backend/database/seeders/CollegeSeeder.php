<?php

namespace Database\Seeders;

use App\Models\College;
use App\Models\CollegeSetting;
use Illuminate\Database\Seeder;

class CollegeSeeder extends Seeder
{
    public function run(): void
    {
        $colleges = [
            ['code' => 'CAS', 'name' => 'College of Arts and Sciences', 'hours' => 350, 'gpa' => 2.50],
            ['code' => 'CBM', 'name' => 'College of Business and Management', 'hours' => 300, 'gpa' => 2.50],
            ['code' => 'CET', 'name' => 'College of Engineering and Technology', 'hours' => 500, 'gpa' => 2.50],
            ['code' => 'CITE', 'name' => 'College of Information Technology Education', 'hours' => 486, 'gpa' => 2.50],
            ['code' => 'CTE', 'name' => 'College of Teacher Education', 'hours' => 400, 'gpa' => 2.25],
        ];

        foreach ($colleges as $c) {
            College::firstOrCreate(
                ['code' => $c['code']],
                ['name' => $c['name']]
            );

            CollegeSetting::firstOrCreate(
                ['college_code' => $c['code']],
                [
                    'required_hours' => $c['hours'],
                    'max_gpa_cutoff' => $c['gpa'],
                    'rule_a_max_consecutive_absences' => 3,
                    'rule_a_max_deficit_pct' => 20,
                    'rule_b_consecutive_weeks' => 2,
                    'rule_b_clerical_keywords' => ['photocopying', 'filing', 'running errands', 'cleaning'],
                ]
            );
        }
    }
}
