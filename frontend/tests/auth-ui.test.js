import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth = readFileSync(new URL('../src/components/Auth.jsx', import.meta.url), 'utf8');

test('Google sign-in button fits its slot, adapts to resize, and is not clipped by the wrapper', () => {
  assert.match(auth, /const availableWidth = Math\.floor\(container\.getBoundingClientRect\(\)\.width\)/);
  assert.match(auth, /width: Math\.min\(360, availableWidth\)/);
  assert.match(auth, /new ResizeObserver\(renderGoogleButton\)/);
  assert.match(auth, /google-signin-slot[^\n]*overflow-visible/);
  assert.doesNotMatch(auth, /googleButtonRef[^\n]*overflow-hidden/);
});
