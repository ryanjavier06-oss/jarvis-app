#!/usr/bin/env node
// Offline rendering acceptance only; this does not certify factual claims.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(await readFile(resolve(root, 'scripts/ui-profile.json'), 'utf8'));

function playwright() {
  // Local dev dependency is canonical. Explicit override reuses an existing install.
  const base = process.env.CLAUDE_PLAYWRIGHT_ROOT
    ? resolve(process.env.CLAUDE_PLAYWRIGHT_ROOT, 'package.json')
    : resolve(root, 'package.json');
  try { return createRequire(base)('playwright'); }
  catch { throw new Error('Playwright unavailable. Run npm ci and npx playwright install chromium, or set CLAUDE_PLAYWRIGHT_ROOT to an existing installation.'); }
}

export async function verifyUI({ pageFile = resolve(root, profile.page) } = {}) {
  const html = await readFile(pageFile);
  const failures = [];
  const server = createServer((request, response) => {
    if (request.url === '/' || request.url === '/index.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(html);
    } else if (request.url === '/favicon.ico') { response.writeHead(204); response.end(); }
    else { response.writeHead(404); response.end('Not found'); }
  });
  let browser;
  let context;
  const cleanup = { browserClosed: false, serverClosed: false };
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', accept);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    browser = await playwright().chromium.launch({ headless: true });
    context = await browser.newContext({ serviceWorkers: 'block' });
    // Register before creating a page. All non-document network requests fail closed.
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin && ['/', '/index.html', '/favicon.ico'].includes(url.pathname)) {
        await route.continue();
      } else {
        failures.push(`blocked unexpected request: ${url.origin}${url.pathname}`);
        await route.abort('blockedbyclient');
      }
    });
    await context.routeWebSocket('**/*', (socket) => {
      failures.push('blocked WebSocket request');
      socket.close();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on('pageerror', error => failures.push(`page error: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') failures.push(`console error: ${message.text()}`); });
    page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}`); });
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const response = await page.goto(origin, { waitUntil: 'networkidle', timeout: 15000 });
      assert.equal(response.status(), 200, 'document response');
      assert.equal(await page.title(), profile.title, 'document title');
      const heading = page.getByRole('heading', { level: 1, name: profile.heading, exact: true, includeHidden: true });
      assert.equal(await heading.count(), 1, 'one expected primary heading');
      assert.equal(await heading.isVisible(), true, 'primary heading must render');
      for (const name of profile.sections) {
        const section = page.getByRole('heading', { level: 2, name, exact: true });
        assert.equal(await section.count(), 1, `required heading: ${name}`);
        assert.equal(await section.isVisible(), true, `visible heading: ${name}`);
      }
      const dom = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
        return {
          duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
          broken: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(id => id && !document.getElementById(decodeURIComponent(id))),
          scripts: document.scripts.length,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      assert.deepEqual(dom.duplicates, [], 'unique rendered anchors');
      assert.deepEqual(dom.broken, [], 'rendered fragments resolve');
      assert.equal(dom.scripts, 0, 'static artifact has no scripts');
      assert.equal(dom.overflow, false, `page fits ${viewport.width}px viewport`);
      for (const id of profile.anchors) {
        await page.goto(`${origin}/#${id}`, { waitUntil: 'load' });
        const target = page.locator(`#${id}`);
        assert.equal(await target.isVisible(), true, `rendered anchor: ${id}`);
        const box = await target.boundingBox();
        assert.ok(box && box.y < viewport.height && box.y + box.height > 0, `fragment navigation reaches ${id}`);
      }
      assert.deepEqual(failures, [], 'offline page must load without errors or unexpected requests');
    }
    return { project: profile.heading, viewports: [1280, 390], externalRequestsAllowed: 0, cleanup };
  } finally {
    try { if (context) await context.close(); }
    finally {
      try { if (browser) await browser.close(); }
      finally {
        server.closeAllConnections();
        await new Promise((accept, reject) => server.close(error => error ? reject(error) : accept()));
        cleanup.browserClosed = !browser || !browser.isConnected();
        cleanup.serverClosed = !server.listening;
        assert.equal(cleanup.browserClosed, true, 'owned browser closes');
        assert.equal(cleanup.serverClosed, true, 'owned listener closes');
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(`PASS offline browser acceptance ${JSON.stringify(await verifyUI())}`); }
  catch (error) { console.error(`FAIL offline browser acceptance: ${error.message}`); process.exitCode = 1; }
}
