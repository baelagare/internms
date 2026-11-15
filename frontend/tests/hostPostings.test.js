import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/views/Management.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/views/partners.css', import.meta.url), 'utf8');

test('supervisor posting editor exposes role details and not institutional capacity/GPA controls', () => {
  const fields = source.match(/const fields = supervisor\s*\n\s*\?([\s\S]*?)\n\s*:\s*\[/);
  assert.ok(fields);
  assert.match(fields[1], /roleTitle/);
  assert.match(fields[1], /description/);
  assert.match(fields[1], /requiredSkills/);
  assert.doesNotMatch(fields[1], /maxSlots|minGpa/);
});

test('posting screen explains ownership and unavailable-record state without inventing a role', () => {
  assert.match(source, /Capacity, eligibility rules, and placement decisions are managed separately by the college/);
  assert.match(source, /No job posting record is available for this company yet/);
  assert.match(source, /No partner records/);
});

test('posting support notice uses responsive design tokens', () => {
  assert.match(styles, /job-posting-context/);
  assert.match(styles, /job-posting-unavailable/);
  assert.match(styles, /var\(--color-warning-surface\)/);
});
