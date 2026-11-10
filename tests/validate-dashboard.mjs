import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const cwd = new URL('../', import.meta.url);
const checks = {};
for (const [name, args] of [['build', ['node_modules/vite/bin/vite.js', 'build']], ['unit', ['--test', 'tests/localRepository.test.js', 'tests/workflows.test.js', 'tests/studentDashboard.test.js']]]) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120000 });
  writeFileSync(new URL(`../browser-results/dashboard-${name}.log`, import.meta.url), (result.stdout || '') + (result.stderr || ''));
  checks[name] = { code: result.status, error: result.error?.message };
}
writeFileSync(new URL('../browser-results/dashboard-validation.json', import.meta.url), JSON.stringify(checks, null, 2));
if (checks.build.code === 0 && checks.unit.code === 0) spawnSync(process.execPath, ['tests/dashboard-browser.mjs'], { cwd, encoding: 'utf8', timeout: 180000 });
