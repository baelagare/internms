import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth = readFileSync(new URL('../src/components/Auth.jsx', import.meta.url), 'utf8');

const registration = readFileSync(new URL('../src/components/Registration.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('Google sign-in button fits its slot, adapts to resize, and is not clipped by the wrapper', () => {
  assert.match(auth, /const availableWidth = Math\.floor\(container\.getBoundingClientRect\(\)\.width\)/);
  assert.match(auth, /width: Math\.min\(360, availableWidth\)/);
  assert.match(auth, /new ResizeObserver\(renderGoogleButton\)/);
  assert.match(auth, /google-signin-slot[^\n]*overflow-visible/);
  assert.doesNotMatch(auth, /googleButtonRef[^\n]*overflow-hidden/);
});

test('login page clearly separates supervisor password login from university Google sign-in', () => {
  assert.match(auth, /aria-label="Choose Account Type"/);
  assert.match(auth, />Company<\/button>/);
  assert.match(auth, />University<\/button>/);
  assert.match(auth, /onLogin\?\.\(form\.email, form\.password, rememberMe\)/);
  assert.match(auth, /Host company supervisors sign in with the email and password/);
  assert.match(auth, /NEMSU Google Workspace account/);
});

test('supervisor invitation registration submits required details through the app onboarding handler', () => {
  for (const label of ['Invitation token', 'Full name', 'Email address', 'Create password']) assert.ok(registration.includes(label));
  assert.match(registration, /onSupervisorRegister\?\.\(form\)/);
  assert.match(registration, /minLength=\{8\}/);
  assert.match(app, /route\.role === 'supervisor-register'/);
  assert.match(app, /onSupervisorRegister=\{handleSupervisor\}/);
  assert.match(app, /onboardSupervisor\(form\)/);
});
