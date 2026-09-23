import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { verifyUI } from '../scripts/verify-ui.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(await readFile(resolve(root, 'scripts/ui-profile.json'), 'utf8'));
const original = await readFile(resolve(root, profile.page), 'utf8');

async function mutated(html, check) {
  const directory = await mkdtemp(resolve(tmpdir(), 'static-ui-negative-'));
  const pageFile = resolve(directory, 'document.html');
  try { await writeFile(pageFile, html); await check(() => verifyUI({ pageFile })); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test('real document renders at desktop and mobile widths', async () => {
  const result = await verifyUI();
  assert.deepEqual(result.viewports, [1280, 390]);
  assert.deepEqual(result.cleanup, { browserClosed: true, serverClosed: true });
});

test('missing rendered primary heading fails', async () => {
  await mutated(original.replace(/<h1[\s>][\s\S]*?<\/h1>/, ''), run => assert.rejects(run, /primary heading/));
});

test('hidden content fails even though static text remains present', async () => {
  await mutated(`${original}<style>h1 { display: none !important; }</style>`, run => assert.rejects(run, /primary heading must render/));
});

test('broken document fragment fails', async () => {
  await mutated(`${original}<a href="#missing-regression-anchor">Broken</a>`, run => assert.rejects(run, /rendered fragments resolve/));
});

test('off-origin request is blocked before any connection reaches canary server', async () => {
  let requests = 0;
  const canary = createServer((_request, response) => { requests++; response.writeHead(200); response.end('unexpected'); });
  await new Promise(accept => canary.listen(0, '127.0.0.1', accept));
  try {
    const url = `http://127.0.0.1:${canary.address().port}/must-not-connect.png`;
    await mutated(`${original}<img src="${url}">`, run => assert.rejects(run, /offline page must load without errors or unexpected requests/));
    assert.equal(requests, 0, 'request interception must prevent network traffic');
  } finally {
    canary.closeAllConnections();
    await new Promise(accept => canary.close(accept));
  }
});
