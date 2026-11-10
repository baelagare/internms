import { Browser } from 'file:///C:/Users/Berto/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const seed = JSON.parse(readFileSync(new URL('../database.json', import.meta.url)));
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5197', '--strictPort'],
  { cwd: rootDir, stdio: 'pipe', env: { ...process.env, VITE_USE_MOCK_API: 'true' } }
);
server.stderr.on('data', d => console.error('Vite err:', d.toString()));
server.stdout.on('data', d => console.log('Vite out:', d.toString()));

const results = [];
let browser, page;
const wait = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

const until = async predicate => {
  for (let i = 0; i < 60; i++) {
    try {
      if (await page.eval(predicate)) return;
    } catch {}
    await wait();
  }
  throw new Error(`Timed out: ${predicate}`);
};

const button = async text => {
  await page.eval(text => {
    const target = [...document.querySelectorAll('button')].find(item => item.textContent.trim().includes(text));
    if (!target) throw new Error(`Missing button with text: ${text}`);
    target.focus();
    target.click();
  }, text);
  await wait();
};

const reload = async () => {
  await page.send('Page.reload', { ignoreCache: true });
  await until(() => !!document.querySelector('.student-attendance'));
};

try {
  mkdirSync(new URL('../browser-results', import.meta.url), { recursive: true });
  console.log('Starting browser test on port 5197...');
  await wait(3000);
  browser = await Browser.launch();
  console.log('Browser launched successfully');
  page = await browser.newPage({ width: 1440, height: 1000 });

  console.log('Navigating to login...');
  await page.goto('http://127.0.0.1:5197/#/login');
  await page.eval(seed => {
    sessionStorage.setItem('internms_active_session_v2', 'student');
    sessionStorage.setItem('internms_mock_database', JSON.stringify(seed));
    localStorage.removeItem('internms_sidebar_collapsed_v1');
  }, seed);

  console.log('Navigating to student attendance...');
  await page.goto('http://127.0.0.1:5197/#/student/attendance');
  await reload();
  console.log('Loaded student attendance page');

  const heading = await page.eval(() => document.querySelector('h1').textContent);
  assert.equal(heading, 'Attendance & DTR');
  results.push('Page title is Attendance & DTR');

  const noticesCount = await page.eval(() => document.querySelectorAll('.workspace-notice').length);
  assert.equal(noticesCount, 1);
  results.push('Single workspace notice (no duplicate notice in view)');

  const approvedText = await page.eval(() => document.querySelector('.attendance-kpi-value').textContent);
  assert.match(approvedText, /48/);
  assert.match(approvedText, /324/);
  results.push('Overview displays 48 / 324 hours');

  assert.ok(await page.eval(() => !!document.querySelector('.camera-preview-container')));
  assert.ok(await page.eval(() => !!document.querySelector('.attendance-clock-time')));
  assert.ok(await page.eval(() => !!document.querySelector('.daily-sequence-tracker')));
  results.push('Live Camera Attendance section and tracker rendered');

  const dtrRowsCount = await page.eval(() => document.querySelectorAll('.dtr-table tbody tr').length);
  assert.ok(dtrRowsCount >= 3);
  results.push(`DTR logs table rendered with ${dtrRowsCount} rows`);

  const weeklyRecordTimes = await page.eval(() => {
    const rows = [...document.querySelectorAll('.dtr-table tbody tr')];
    const weeklyRow = rows.find(r => r.innerText.includes('Competency Log'));
    if (!weeklyRow) return null;
    const cells = [...weeklyRow.querySelectorAll('td')];
    return cells.slice(1, 5).map(c => c.textContent.trim());
  });
  if (weeklyRecordTimes) {
    assert.deepEqual(weeklyRecordTimes, ['—', '—', '—', '—']);
    results.push('Competency accomplishment has dashes for punch times without fake times');
  }

  await button('Details');
  assert.ok(await page.eval(() => !!document.querySelector('.dtr-expanded-row')));
  results.push('Row details expansion functions properly');

  await button('Export DTR (PDF)');
  assert.ok(await page.eval(() => !!document.querySelector('.dtr-print-modal-content')));
  assert.ok(await page.eval(() => !!document.querySelector('.print-letterhead')));
  assert.ok(await page.eval(() => !!document.querySelector('.print-signatures')));
  results.push('DTR Export modal renders letterhead and signatures');

  await button('Close');
  assert.ok(await page.eval(() => !document.querySelector('.dtr-print-modal-content')));

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewport({ width, height: 1000 });
    await wait(200);
    await page.eval(() => {
      document.activeElement?.blur();
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await wait(200);

    const sw = await page.eval(() => document.documentElement.scrollWidth);
    const iw = await page.eval(() => window.innerWidth);
    if (sw > iw) {
      const culprits = await page.eval(() => {
        return [...document.querySelectorAll('*')]
          .filter(el => el.scrollWidth > window.innerWidth || el.getBoundingClientRect().right > window.innerWidth)
          .map(el => ({ tag: el.tagName, class: el.className, sw: el.scrollWidth, right: Math.round(el.getBoundingClientRect().right) }));
      });
      results.push(`CULPRITS AT ${width}px (sw: ${sw}, iw: ${iw}): ` + JSON.stringify(culprits.slice(0, 10)));
    }

    assert.ok(
      await page.eval(() => document.documentElement.scrollWidth <= innerWidth),
      `Horizontal overflow at ${width}px`
    );

    await page.screenshot({
      path: new URL(`../browser-results/attendance-${width}.png`, import.meta.url).pathname.replace(/^\/(.:)/, '$1'),
      format: 'png',
      fullPage: true
    });
  }
  results.push('Tested 1440, 1024, 768, 390, 320px viewports without horizontal overflow; captured screenshots');

  console.log('ALL BROWSER ATTENDANCE CHECKS PASSED:');
  results.forEach(r => console.log('  - ' + r));
} catch (err) {
  results.push(`FAILED: ${err.stack || err.message}`);
  process.exitCode = 1;
} finally {
  writeFileSync(
    new URL('../browser-results/attendance-browser.json', import.meta.url),
    JSON.stringify({ results, errors: page?.consoleErrors || [] }, null, 2)
  );
  if (browser) await browser.close();
  server.kill();
}