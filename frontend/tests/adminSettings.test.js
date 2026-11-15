import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/views/Management.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/views/settings.css', import.meta.url), 'utf8');
const settingsSource = source.slice(source.indexOf('export function Settings'));

test('admin settings labels the university view and reports settings coverage', () => {
  assert.match(settingsSource, /Review approved quotas and alert thresholds across all colleges/);
  assert.match(settingsSource, /Colleges with saved settings/);
  assert.match(settingsSource, /Colleges in institution directory/);
});

test('admin settings assigns provisioning responsibility instead of asking admins to ask themselves', () => {
  assert.match(settingsSource, /Provision approved values once they are confirmed by the institution/);
  assert.match(settingsSource, /Ask an administrator to confirm and provision approved values/);
});

test('admin settings coverage summary has responsive styles', () => {
  assert.match(css, /settings-summary/);
  assert.match(css, /@media \(min-width: 640px\)/);
});
test('college settings selector lists catalog colleges and distinguishes those without saved policy settings', () => {
  assert.match(settingsSource, /collegeCodesForWorkspace\(db\)/);
  assert.match(settingsSource, /Settings not configured/);
  assert.match(settingsSource, /approved settings not configured/i);
  assert.match(settingsSource, /no quotas or thresholds are assumed/);
  assert.match(settingsSource, /No college settings have been provisioned/);
});


