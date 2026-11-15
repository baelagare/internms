import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bindNavigationDrawer, DRAWER_QUERY } from '../src/hooks/navigationDrawer.js';

// Minimal DOM contract, not a browser or a fabricated account/session.
function setup(matches = true) {
  const listeners = new Map();
  const doc = { body: { style: { overflow: 'auto' } }, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  function node() {
    const attrs = new Map();
    return { inert: false, tabIndex: 0, isConnected: true, disabled: false,
      getAttribute: key => attrs.get(key) ?? null,
      setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key),
      getClientRects: () => [1], focus() { doc.activeElement = this; } };
  }
  const opener = node(), first = node(), last = node(), sidebar = node(), content = node(), bottom = node();
  doc.activeElement = opener;
  sidebar.querySelectorAll = () => [first, last];
  sidebar.contains = target => [first, last, sidebar].includes(target);
  let change;
  const media = { matches, addEventListener: (_, fn) => { change = fn; }, removeEventListener: () => { change = null; } };
  let closed = 0;
  const bind = open => bindNavigationDrawer({ open, sidebar, background: [content, bottom], onClose: () => { closed++; }, document: doc, media });
  return { doc, opener, first, last, sidebar, content, bottom, media, bind, closed: () => closed,
    resize(value) { media.matches = value; change?.(); },
    key(key, shiftKey = false) { const event = { key, shiftKey, prevented: false, preventDefault() { this.prevented = true; } }; listeners.get('keydown')?.(event); return event; }, listeners };
}

test('drawer uses the same approved 1024px breakpoint as the stylesheet', () => {
  assert.equal(DRAWER_QUERY, '(max-width: 1023px)');
  const css = readFileSync(new URL('../src/components/shell.css', import.meta.url), 'utf8');
  assert.match(css, /min-width: 1024px/);
  assert.match(css, /max-width: 1023px/);
  assert.doesNotMatch(css, /767px|768px/);
  assert.match(css, /--rail-width: 248px/);
  assert.match(css, /--rail-width: 72px/);
  assert.match(css, /visibility: hidden/);
});

test('closed drawer is inert only below the desktop breakpoint', () => {
  const s = setup(); const cleanup = s.bind(false);
  assert.equal(s.sidebar.inert, true);
  assert.equal(s.sidebar.getAttribute('aria-hidden'), 'true');
  assert.equal(s.content.inert, false);
  assert.equal(s.bottom.inert, false);
  s.resize(false);
  assert.equal(s.sidebar.inert, false);
  assert.equal(s.sidebar.getAttribute('aria-hidden'), null);
  cleanup();
  assert.equal(s.listeners.size, 0);
});

test('open drawer contains focus, locks scroll and makes both background navigation regions inert', () => {
  const s = setup(); const cleanup = s.bind(true);
  assert.equal(s.doc.activeElement, s.first);
  assert.equal(s.sidebar.getAttribute('role'), 'dialog');
  assert.equal(s.sidebar.getAttribute('aria-modal'), 'true');
  assert.equal(s.doc.body.style.overflow, 'hidden');
  assert.equal(s.content.inert, true);
  assert.equal(s.bottom.inert, true);
  s.last.focus(); assert.equal(s.key('Tab').prevented, true); assert.equal(s.doc.activeElement, s.first);
  assert.equal(s.key('Tab', true).prevented, true); assert.equal(s.doc.activeElement, s.last);
  s.opener.focus(); s.key('Tab'); assert.equal(s.doc.activeElement, s.first);
  assert.equal(s.key('Escape').prevented, true); assert.equal(s.closed(), 1);
  cleanup();
  assert.equal(s.doc.activeElement, s.opener);
  assert.equal(s.doc.body.style.overflow, 'auto');
  assert.equal(s.content.inert, false); assert.equal(s.bottom.inert, false);
  assert.equal(s.sidebar.getAttribute('aria-modal'), null);
});

test('resize to desktop clears modality and closes without focusing the hidden mobile opener', () => {
  const s = setup(); const cleanup = s.bind(true);
  s.resize(false);
  assert.equal(s.closed(), 1);
  assert.equal(s.content.inert, false); assert.equal(s.bottom.inert, false);
  assert.equal(s.doc.body.style.overflow, 'auto');
  assert.equal(s.sidebar.getAttribute('role'), null);
  cleanup();
  assert.notEqual(s.doc.activeElement, s.opener);
});

test('cleanup preserves preexisting inertness and detached opener is never focused', () => {
  const s = setup(); s.content.inert = true;
  const cleanup = s.bind(true);
  s.opener.isConnected = false;
  cleanup();
  assert.equal(s.content.inert, true);
  assert.notEqual(s.doc.activeElement, s.opener);
});

test('resizing a closed shell preserves an already inert background', () => {
  const s = setup(false); s.content.inert = true;
  const cleanup = s.bind(false);
  s.resize(true);
  assert.equal(s.content.inert, true);
  cleanup();
});

test('drawer with no controls prevents Tab from escaping', () => {
  const s = setup(); s.sidebar.querySelectorAll = () => [];
  const cleanup = s.bind(true);
  assert.equal(s.key('Tab').prevented, true);
  assert.equal(s.doc.activeElement, s.sidebar);
  cleanup();
});
