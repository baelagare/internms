<?php

namespace App\Console\Commands;

use App\Models\College;
use App\Models\User;
use Illuminate\Console\Command;

class AssignUserRole extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:assign-role
                            {email : The user\'s institutional @nemsu.edu.ph email}
                            {role : The role to assign: admin, coordinator, or student}
                            {--college= : The college code for coordinator (e.g., CITE, CBA)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign or pre-provision a user role (admin, coordinator, student) for institutional Google sign-in';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = strtolower(trim($this->argument('email')));
        $role = strtolower(trim($this->argument('role')));
        $college = $this->option('college') ? strtoupper(trim($this->option('college'))) : null;

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Provide a valid email address.');

            return 1;
        }

        if (! str_ends_with($email, '@'.strtolower(config('services.institution.email_domain', 'nemsu.edu.ph')))) {
            $this->error('Only institutional email addresses can be provisioned with this command.');

            return 1;
        }

        if (! in_array($role, ['admin', 'coordinator', 'student'], true)) {
            $this->error("Invalid role '{$role}'. Allowed roles: admin, coordinator, student.");
            return 1;
        }

        if ($role === 'coordinator' && empty($college)) {
            $this->error("A college code is required when assigning the coordinator role. Example: --college=CITE");
            return 1;
        }

        $user = User::where('email', $email)->first();

        if ($user) {
            $user->update([
                'role' => $role,
                'college_code' => $role === 'coordinator' ? $college : ($role === 'admin' ? null : $user->college_code),
            ]);

            $this->info("User '{$user->name}' ({$email}) updated to role '{$role}'" . ($college ? " in {$college}" : "") . ".");
        } else {
            $user = User::create([
                'name' => explode('@', $email)[0],
                'email' => $email,
                'role' => $role,
                'college_code' => $college,
                'email_verified_at' => now(),
            ]);

            $this->info("Pre-provisioned user ({$email}) as '{$role}'" . ($college ? " in {$college}" : "") . ". When they sign in with Google, they will enter with this role.");
        }

        return 0;
    }
}
