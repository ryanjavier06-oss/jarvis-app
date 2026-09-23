import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '..');
const checker = resolve(project, 'scripts/verify-page.mjs');
const fixture = (name) => resolve(here, 'fixtures', name);

function run(name) {
  return spawnSync(process.execPath, [checker, fixture(name)], {
    cwd: project,
    encoding: 'utf8',
  });
}

test('accepts a self-contained static page and existing fragments', () => {
  const result = run('valid.html');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS/);
});

test('rejects a broken local fragment', () => {
  const result = run('broken-local-fragment.html');
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /broken local fragments/);
});

test('rejects a missing local resource', () => {
  const result = run('broken-local-resource.html');
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /missing local resources/);
});

test('rejects an injected script dependency', () => {
  const result = run('injected-script.html');
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /adds a script dependency/);
});
