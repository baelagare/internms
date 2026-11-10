import { Browser } from 'file:///C:/Users/Berto/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { allowedRoutes } from '../src-react/services/routes.js';

const output = new URL('../browser-results/basic-results.json', import.meta.url);
mkdirSync(new URL('../browser-results/', import.meta.url), { recursive: true });
const results = [];
let browser;
let page;
try {
  browser = await Browser.launch({ extraArgs: ['--disable-software-rasterizer'] });
  page = await browser.newPage({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5173/#/login', { settleMs: 500 });
  assert.match(await page.eval(() => document.body.innerText), /Sign in to InternMS/);
  results.push('login screen rendered');
  await page.eval(() => sessionStorage.clear());
  const setInput = async (selector, value) => page.eval(({ selector, value }) => { const input = document.querySelector(selector); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }, { selector, value });
  await setInput('form input:not([type="password"])', 'student');
  await setInput('form input[type="password"]', 'student123');
  await page.eval(() => document.querySelector('#auth-form').requestSubmit());
  await new Promise(resolve => setTimeout(resolve, 900));
  assert.ok(await page.eval(() => Boolean(document.querySelector('aside[aria-hidden="false"], aside nav'))));
  results.push('student login completed');
  for (const route of allowedRoutes.student) {
    await page.eval(route => { window.location.hash = `#/student/${route}`; }, route);
    await new Promise(resolve => setTimeout(resolve, 250));
    const text = await page.eval(() => document.querySelector('main')?.innerText || '');
    assert.ok(text.length > 20, `empty route: ${route}`);
    assert.doesNotMatch(text, /Migration-ready surface|A clear place for the next action|Unknown destination/);
    results.push(`student/${route} rendered`);
  }
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await page.eval(() => { window.location.hash = '#/student/dashboard'; });
  await new Promise(resolve => setTimeout(resolve, 250));
  await page.screenshot({ path: new URL('../browser-results/basic-mobile.png', import.meta.url).pathname.replace(/^\//, ''), format: 'png' });
  const unlabeled = await page.eval(() => [...document.querySelectorAll('main input, main select, main textarea')].filter(input => !input.labels?.length && !input.getAttribute('aria-label')).length);
  assert.equal(unlabeled, 0);
  results.push('mobile screenshot and labels checked');
} catch (error) {
  results.push(`FAILED: ${error.stack || error}`);
  process.exitCode = 1;
} finally {
  writeFileSync(output, JSON.stringify({ results, consoleErrors: page?.consoleErrors || [], generatedAt: new Date().toISOString() }, null, 2));
  if (browser) await browser.close();
}