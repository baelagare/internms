import { Browser } from 'file:///C:/Users/Berto/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { allowedRoutes } from '../src-react/services/routes.js';
const results = [], failedRequests = [];
const outputDir = new URL('../browser-results/', import.meta.url);
mkdirSync(outputDir, { recursive: true });
let browser = null;
let page = null;
const wait = () => new Promise(resolve => setTimeout(resolve, 350));
async function click(text) { await page.eval(text => { const buttons = [...document.querySelectorAll('button')]; const element = buttons.find(button => button.textContent.trim() === text) || buttons.find(button => button.textContent.includes(text)); if (!element) throw new Error(`Missing button: ${text}`); element.click(); }, text); await wait(); }
async function fill(label, value) { await page.eval(({ label, value }) => { const node = [...document.querySelectorAll('label')].find(node => node.textContent.trim().startsWith(label)); const input = node?.querySelector('input,textarea,select') || document.getElementById(node?.htmlFor); if (!input) throw new Error(`Missing field: ${label}`); const proto = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value); input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }, { label, value }); await wait(); }
async function route(role, destination) { await page.eval(hash => { location.hash = hash; }, `#/${role}/${destination}`); await wait(); }
async function login(id, password) {
  await page.goto('http://127.0.0.1:5173/');
  await page.eval(() => { sessionStorage.removeItem('internms_active_session_v2'); location.hash = '#/login'; });
  await page.send('Page.reload', { ignoreCache: true });
  await new Promise(resolve => setTimeout(resolve, 1200));
  await page.eval(({ id, password }) => { const inputs = document.querySelectorAll('form input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(inputs[0], id); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); const pass = document.querySelector('form input[type="password"]'); setter.call(pass, password); pass.dispatchEvent(new Event('input', { bubbles: true })); }, { id, password });
  await wait(); await page.eval(() => document.querySelector('form').requestSubmit()); await new Promise(resolve => setTimeout(resolve, 750));
  assert.ok(await page.eval(() => Boolean(document.querySelector('aside nav'))), `Login failed: ${id}`);
}
try {
  browser = await Browser.launch();
  page = await browser.newPage();
  await page.send('Network.enable');
  browser.on(page.sessionId, 'Network.responseReceived', event => { if (event.response.status >= 400) failedRequests.push({ url: event.response.url, status: event.response.status }); });
  for (const [role, id, password] of [['student', 'student', 'student123'], ['coordinator', '1234', '123456'], ['supervisor', 'supervisor', 'super123'], ['admin', 'admin', 'admin123']]) {
    await login(id, password);
    for (const destination of allowedRoutes[role]) {
      await route(role, destination);
      const text = await page.eval(() => document.querySelector('main')?.innerText || '');
      assert.ok(text.length > 20, `${role}/${destination} empty`);
      assert.ok(!/Migration-ready surface|A clear place for the next action|Unknown destination/.test(text), `${role}/${destination} placeholder`);
      results.push({ test: `Route ${role}/${destination}`, status: 'passed' });
    }
    await route(role, 'dashboard');
    await page.screenshot({ path: new URL(`../browser-results/${role}-desktop.png`, import.meta.url).pathname.replace(/^\//, ''), format: 'png' });
  }
  await login('student', 'student123');
  await route('student', 'attendance');
  await fill('Work summary', 'Browser verified attendance'); await click('Log attendance locally');
  assert.ok(await page.eval(() => document.querySelector('main').innerText.includes('Browser verified attendance')));
  await click('Request adjustment'); await fill('Reason', 'Browser adjustment request'); await click('Submit request locally');
  await route('student', 'tasks'); await fill('Accomplishment title', 'Browser weekly report'); await fill('Summary of work', 'Integration test deliverable'); await click('Submit weekly report locally');
  assert.ok(await page.eval(() => document.querySelector('main').innerText.includes('Browser weekly report')));
  await click('Preview & print narrative'); assert.ok(await page.eval(() => Boolean(document.querySelector('dialog[open] .print-report')))); await click('Close');
  await route('student', 'messages'); await fill('Message to', 'Browser message'); await click('Send locally');
  assert.ok(await page.eval(() => document.querySelector('[role="log"]').innerText.includes('Browser message')));
  results.push({ test: 'Student attendance, adjustment, weekly report, narrative modal and messaging', status: 'passed' });
  await login('supervisor', 'super123'); await route('supervisor', 'approvals'); await fill('Search submissions', 'Browser weekly report'); await click('Review'); await click('Verify');
  await route('supervisor', 'evaluations'); await fill('Observed strengths', 'Browser tested strengths'); await fill('Areas for improvement', 'Browser tested feedback'); await click('evaluation locally');
  results.push({ test: 'Supervisor verification and evaluation submission', status: 'passed' });
  await login('1234', '123456'); await route('coordinator', 'approvals'); await fill('Submission category', 'log'); await fill('Search submissions', 'Browser weekly report'); await click('Review'); await click('Approve & credit');
  assert.ok(await page.eval(() => document.querySelector('main').innerText.includes('Coordinator Approved')));
  results.push({ test: 'Coordinator approval after supervisor verification', status: 'passed' });
  await page.setViewport({ width: 390, height: 844, mobile: true }); await route('coordinator', 'dashboard');
  await page.screenshot({ path: new URL('../browser-results/mobile.png', import.meta.url).pathname.replace(/^\//, ''), format: 'png' });
  const unlabeled = await page.eval(() => [...document.querySelectorAll('main input,main select,main textarea')].filter(input => !input.labels?.length && !input.getAttribute('aria-label')).length);
  assert.equal(unlabeled, 0);
  results.push({ test: 'Mobile rendering and form label inspection', status: 'passed' });
  assert.equal(page.consoleErrors.length, 0, page.consoleErrors.join('\n'));
} catch (error) { results.push({ test: 'Browser run', status: 'failed', error: error.stack || String(error) }); process.exitCode = 1; }
finally {
  writeFileSync(new URL('../browser-results/results.json', import.meta.url), JSON.stringify({ results, consoleErrors: page?.consoleErrors || [], failedRequests }, null, 2));
  if (browser) await browser.close();
}