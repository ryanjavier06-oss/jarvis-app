#!/usr/bin/env node
// Static-site integrity check for the single-page Jarvis compliance artifact.
// It does not validate HTML5 semantics or whether factual claims match personal-os.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const page = process.argv[2] ?? 'index.html';
let html;
try {
  html = readFileSync(page, 'utf8');
} catch (error) {
  console.error(`FAIL cannot read ${page}: ${error.message}`);
  process.exit(1);
}

const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));
const brokenFragments = [...html.matchAll(/\bhref=["']#([^"']+)["']/g)]
  .map((m) => m[1]).filter((id) => !ids.has(id));
const missingLocal = [];
for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
  const ref = match[1];
  if (/^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue;
  const localPath = ref.split(/[?#]/, 1)[0];
  if (localPath && !existsSync(resolve(dirname(page), localPath))) missingLocal.push(ref);
}
const hasDocument = /<!doctype\s+html\s*>/i.test(html)
  && /<html\b/i.test(html) && /<\/html\s*>/i.test(html);
const hasExternalStylesheet = /<link\b[^>]*\brel=["']stylesheet["']/i.test(html);
const hasScript = /<script\b/i.test(html);

if (!hasDocument) console.error(`FAIL ${page} is missing the HTML document shell`);
if (hasExternalStylesheet) console.error(`FAIL ${page} adds an external stylesheet`);
if (hasScript) console.error(`FAIL ${page} adds a script dependency`);
if (brokenFragments.length) console.error(`FAIL broken local fragments: ${[...new Set(brokenFragments)].join(', ')}`);
if (missingLocal.length) console.error(`FAIL missing local resources: ${[...new Set(missingLocal)].join(', ')}`);

if (!hasDocument || hasExternalStylesheet || hasScript || brokenFragments.length || missingLocal.length) process.exit(1);
console.log(`PASS ${page}: self-contained document shell; local fragments and resources resolve`);
