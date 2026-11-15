import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '.validation');
fs.mkdirSync(output, { recursive: true });
const checks = {};
for (const [name, args] of [
  ['tests', ['--test', 'tests/empty-state.test.js', 'tests/design-system.test.js', 'tests/shell.test.js', 'tests/dashboard.test.js', 'tests/profile.test.js', 'tests/checklist.test.js', 'tests/placement.test.js', 'tests/attendance.test.js', 'tests/taskLogs.test.js', 'tests/messages.test.js', 'tests/coordinatorDashboard.test.js', 'tests/approvals.test.js', 'tests/partners.test.js', 'tests/alerts.test.js', 'tests/interns.test.js', 'tests/settings.test.js', 'tests/hostDashboard.test.js', 'tests/hostInterns.test.js', 'tests/hostPostings.test.js', 'tests/evaluations.test.js', 'tests/adminDashboard.test.js', 'tests/corpus.test.js', 'tests/audit.test.js', 'tests/adminPartners.test.js', 'tests/adminInterns.test.js', 'tests/adminSettings.test.js', 'tests/adminStaff.test.js', 'tests/transport.test.js']],
  ['build', ['node_modules/vite/bin/vite.js', 'build']],
  ['smoke', ['scripts/smoke.mjs']]
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  fs.writeFileSync(path.join(output, `${name}.log`), (result.stdout || '') + (result.stderr || ''));
  checks[name] = { code: result.status, error: result.error?.message || null };
}
const lint = spawnSync('npm.cmd', ['run', 'lint'], { cwd: root, encoding: 'utf8', shell: true, timeout: 30000, env: { ...process.env, npm_config_cache: path.join(output, 'npm-cache'), npm_config_logs_max: '0' } });
fs.writeFileSync(path.join(output, 'lint.log'), (lint.stdout || '') + (lint.stderr || ''));
checks.lint = { code: lint.status, error: lint.error?.message || null };
fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(checks, null, 2));
console.log(checks);
