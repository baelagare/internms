import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const old = /nemsu-seal(?:-512)?\.png|favicon-96x96\.png|nemsu-sis-logo\.png/;
function scan(dir) { for (const item of readdirSync(dir, { withFileTypes: true })) { const path = new URL(item.name + (item.isDirectory() ? '/' : ''), dir); if (item.isDirectory()) scan(path); else if (/\.(js|jsx|css|html)$/.test(item.name)) assert.ok(!old.test(readFileSync(path, 'utf8')), `Old asset reference: ${path}`); } }
let result;
try {
  scan(new URL('src/', root)); scan(new URL('src-react/', root));
  for (const file of ['index.html', 'vite.config.js']) assert.ok(!old.test(readFileSync(new URL(file, root), 'utf8')));
  const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: root, encoding: 'utf8', timeout: 120000 });
  writeFileSync(new URL('browser-results/logo-build.log', root), (build.stdout || '') + (build.stderr || ''));
  assert.equal(build.status, 0);
  assert.ok(existsSync(new URL('dist/internms-logo.svg', root)));
  assert.match(readFileSync(new URL('dist/index.html', root), 'utf8'), /type="image\/svg\+xml"/);
  result = { passed: true, checks: ['No old logo references in application source', 'Vite production build', 'SVG logo emitted in dist', 'SVG favicon MIME type'] };
} catch (error) { result = { passed: false, error: error.stack }; }
writeFileSync(new URL('browser-results/logo-validation.json', root), JSON.stringify(result, null, 2));
