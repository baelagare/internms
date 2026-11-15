import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { settingsFields } from '../src/services/management.js';

const view = readFileSync(new URL('../src/views/Management.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/views/settings.css', import.meta.url), 'utf8');

test('settings screen exposes the existing institutional fields without inserting defaults', () => {
  for (const [key] of settingsFields) assert.ok(readFileSync(new URL('../src/services/management.js', import.meta.url), 'utf8').includes(key));
  assert.match(view, /No saved policy settings exist for \{college\}/);
  assert.match(view, /Approved settings not configured|approved settings not configured/i);
  assert.match(view, /settings\?\.ruleBClericalKeywords/);
});

test('settings form validates field bounds before calling save service', () => {
  assert.match(view, /Number\(value\) < min \|\| Number\(value\) > max/);
  assert.match(view, /if \(!validate\(\)\) return/);
  assert.match(readFileSync(new URL('../src/services/applicationService.js', import.meta.url), 'utf8'), /saveSettings/);
});

test('settings form groups are responsive and warn that changes require approved policy values', () => {
  assert.match(view, /Academic requirements/);
  assert.match(view, /Attendance thresholds/);
  assert.match(view, /Task review threshold/);
  assert.match(view, /Confirm values against approved institutional policy/);
  assert.match(css, /@media \(min-width: 768px\)/);
});
