import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/views/Management.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/views/partners.css', import.meta.url), 'utf8');
const partnersSource = source.slice(source.indexOf('export function Partners'), source.indexOf('export function Staff'));

test('admin partner directory labels the university view and scopes the empty state to the selected college', () => {
  assert.match(partnersSource, /Manage host company records across all colleges/);
  assert.match(partnersSource, /No partner records in this college/);
  assert.match(partnersSource, /Select a different college scope/);
  assert.match(partnersSource, /No partner records yet/);
});

test('admin partner summary adds college coverage without changing coordinator metrics', () => {
  assert.match(partnersSource, /Colleges covered/);
  assert.match(partnersSource, /Host companies/);
  assert.match(partnersSource, /Invitations pending/);
  assert.match(css, /auto-fit/);
});

test('admin partner creation keeps institutional fields and invents no defaults', () => {
  assert.match(partnersSource, /Supervisor invitation token/);
  assert.match(partnersSource, /GPA cutoff/);
  assert.match(partnersSource, /Missing values will not be filled automatically/);
  assert.doesNotMatch(partnersSource, /partner@hte\.ph/);
});
test('partner and staff college selectors use catalog-backed options and guard empty catalogs', () => {
  assert.match(partnersSource, /collegeCodesForWorkspace\(db\)/);
  assert.match(partnersSource, /collegeOptions = colleges\.map/);
  assert.match(partnersSource, /disabled=\{admin && colleges\.length === 0\}/);
  const staffSource = source.slice(source.indexOf('export function Staff'), source.indexOf('function StaffAccountForm'));
  assert.match(staffSource, /College scope/);
  assert.match(staffSource, /collegeCodesForWorkspace\(db\)/);
  assert.match(staffSource, /college catalog/);
test('college catalog exposes only confirmed colleges to administrative selectors', () => {
  const catalog = readFileSync(new URL('../src/config/institution.js', import.meta.url), 'utf8');
  assert.match(catalog, /CITE: Object\.freeze/);
  assert.match(catalog, /CBM: Object\.freeze/);
  assert.match(catalog, /collegeCodesForWorkspace/);
  assert.match(source, /collegeOptions = colleges\.map/);
});


});


