import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { kitFiles, kitPublic } from './vite-public.js';

const ICONS = ['/favicon.ico', '/favicon-16.png', '/favicon-32.png', '/apple-touch-icon.png'];

test('every app gets the worker and the brand marks at their old URLs', () => {
  const files = kitFiles();
  for (const path of ['/sw.js', '/brand/mark.png', '/brand/mark-small.png']) {
    assert.ok(files.has(path), path);
  }
  assert.equal(files.has('/favicon.ico'), false);
});

test('each app gets its own icon set at the root, the family one with a maskable icon', () => {
  const staff = kitFiles('staff');
  const family = kitFiles('family');
  for (const path of [...ICONS, '/icon-192.png', '/icon-512.png']) {
    assert.match(staff.get(path) ?? '', /icons[/\\]staff/);
    assert.match(family.get(path) ?? '', /icons[/\\]family/);
  }
  assert.ok(family.has('/icon-maskable-512.png'));
});

test('the build emits each file at its URL path without the leading slash', () => {
  const emitted = [];
  kitPublic('family').generateBundle.call({ emitFile: (file) => emitted.push(file.fileName) });
  assert.ok(emitted.includes('sw.js'));
  assert.ok(emitted.includes('brand/mark.png'));
  assert.ok(emitted.includes('icon-maskable-512.png'));
});

test('the dev server answers a kit file with its type and passes the rest on', () => {
  const plugin = kitPublic('staff');
  let handler = () => undefined;
  plugin.configureServer({ middlewares: { use: (fn) => { handler = fn; } } });
  const headers = {};
  const res = { setHeader: (k, v) => { headers[k] = v; }, end: () => undefined };
  handler({ url: '/favicon.ico?v=2' }, res, () => assert.fail('served'));
  assert.equal(headers['Content-Type'], 'image/x-icon');
  let passed = false;
  handler({ url: '/src/main.tsx' }, res, () => { passed = true; });
  assert.ok(passed);
});

test('no web app keeps a copy of a kit file in its own public folder', () => {
  for (const app of ['staff', 'family']) {
    for (const path of kitFiles(app).keys()) {
      const copy = new URL(`../../apps/${app}-web/public${path}`, import.meta.url);
      assert.equal(existsSync(copy), false, `apps/${app}-web/public${path}`);
    }
  }
});
