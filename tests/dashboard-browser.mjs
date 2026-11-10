import { Browser } from 'file:///C:/Users/Berto/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { allowedRoutes } from '../src-react/services/routes.js';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5186'], { cwd: new URL('../', import.meta.url), stdio: 'ignore' });
const results = [];
let browser, page;
const wait = () => new Promise(resolve => setTimeout(resolve, 450));
const click = async selector => { await page.eval(selector => document.querySelector(selector).click(), selector); await wait(); };
try {
  await new Promise(resolve => setTimeout(resolve, 2000));
  browser = await Browser.launch();
  page = await browser.newPage({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:5186/#/login');
  await page.eval(() => { sessionStorage.setItem('internms_active_session_v2', 'student'); localStorage.removeItem('internms_sidebar_collapsed_v1'); });
  await page.goto('http://127.0.0.1:5186/#/student/dashboard');
  await page.send('Page.reload', { ignoreCache: true });
  for (let attempt = 0; attempt < 30; attempt++) { await wait(); if (await page.eval(() => document.body.innerText.includes('Student Dashboard'))) break; }
  assert.match(await page.eval(() => document.body.innerText), /Student Dashboard/);
  assert.match(await page.eval(() => document.body.innerText), /14.8% completed/);
  assert.match(await page.eval(() => document.body.innerText), /4 of 6 milestones/);
  results.push('Student values and milestone count');
  await click('[aria-label="Collapse sidebar"]');
  assert.equal(await page.eval(() => Math.round(document.querySelector('aside').getBoundingClientRect().width)), 76);
  assert.equal(await page.eval(() => getComputedStyle(document.querySelector('.workspace-body')).marginLeft), '76px');
  assert.equal(await page.eval(() => localStorage.getItem('internms_sidebar_collapsed_v1')), 'true');
  await click('[aria-label="Expand sidebar"]');
  results.push('Desktop collapse, content width, preference and expand');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewport({ width, height: 1000 }); await wait();
    assert.ok(await page.eval(() => document.documentElement.scrollWidth <= window.innerWidth), `Overflow at ${width}`);
    await page.screenshot({ path: `C:/projects/internms/browser-results/dashboard-${width}.png`, format: 'png' });
    results.push(`No horizontal overflow at ${width}px`);
  }
  await click('[aria-label="Open navigation"]');
  assert.equal(await page.eval(() => document.body.style.overflow), 'hidden');
  assert.ok(await page.eval(() => document.querySelector('.workspace-body').inert));
  assert.equal(await page.eval(() => document.activeElement.getAttribute('aria-label')), 'Close navigation');
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' }); await wait();
  assert.equal(await page.eval(() => document.body.style.overflow), '');
  await click('[aria-label="Open navigation"]'); await click('aside a[href="#/student/profile"]');
  assert.ok(await page.eval(() => !document.querySelector('.workspace-shell').classList.contains('drawer-open')));
  results.push('Mobile initial focus, background inertness, scroll lock, Escape and route close');
  await click('[aria-label="Open navigation"]');
  await page.eval(() => document.querySelector('aside [aria-label="Sign out"]').focus());
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' }); await wait();
  assert.equal(await page.eval(() => document.activeElement.getAttribute('aria-label')), 'Close navigation');
  await click('.workspace-backdrop');
  assert.ok(await page.eval(() => !document.querySelector('.workspace-shell').classList.contains('drawer-open')));
  results.push('Keyboard focus wraps inside drawer; backdrop closes');
  await page.eval(() => location.hash = '#/student/dashboard'); await wait();
  await page.eval(() => [...document.querySelectorAll('button')].find(item => item.textContent.includes('View Evaluation Rubric')).click()); await wait();
  assert.ok(await page.eval(() => !!document.querySelector('dialog[open]')));
  await click('[aria-label="Close dialog"]');
  await click('.advisory-details summary');
  assert.ok(await page.eval(() => document.querySelector('.notice-text').textContent.includes('48 hours')));
  results.push('Evaluation modal and complete advisory retained');
  await page.setViewport({ width: 1440, height: 1000 });
  for (const [role, id] of [['student','student'], ['coordinator','1234'], ['supervisor','supervisor'], ['admin','admin']]) {
    await page.eval(({role,id}) => { sessionStorage.setItem('internms_active_session_v2', id); location.hash = `#/${role}/dashboard`; }, {role,id});
    await page.send('Page.reload', { ignoreCache: true }); await wait();
    for (const route of allowedRoutes[role]) {
      await page.eval(hash => location.hash = hash, `#/${role}/${route}`); await wait();
      assert.ok(await page.eval(() => (document.querySelector('main')?.innerText.length || 0) > 20), `${role}/${route}`);
    }
    results.push(`All ${role} routes render`);
  }
  await click('[aria-label="Collapse sidebar"]');
  await page.send('Page.reload', { ignoreCache: true }); await wait();
  assert.equal(await page.eval(() => Math.round(document.querySelector('aside').getBoundingClientRect().width)), 76);
  await page.eval(() => location.hash = '#/student/dashboard'); await wait();
  assert.match(await page.eval(() => document.querySelector('main').innerText), /Page unavailable for your role/);
  await click('aside [aria-label="Sign out"]');
  assert.ok(await page.eval(() => !document.querySelector('aside')));
  results.push('Persistence across reload, role guard and sign-out');
  assert.equal(page.consoleErrors.length, 0, page.consoleErrors.join('\n'));
} catch (error) { results.push(`FAILED: ${error.stack}`); }
finally { writeFileSync(new URL('../browser-results/dashboard-browser.json', import.meta.url), JSON.stringify({ results, errors: page?.consoleErrors || [] }, null, 2)); if (browser) await browser.close(); server.kill(); }
