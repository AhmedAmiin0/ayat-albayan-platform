import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { kitFiles, kitPublic } from './vite-public.js';

const ICONS = ['/favicon.ico', '/favicon-16.png', '/favicon-32.png', '/apple-touch-icon.png'];
const REPO = fileURLToPath(new URL('../../', import.meta.url));
const REAL = {
  kitDir: join(REPO, 'packages/web-kit'),
  brandDir: join(REPO, 'packages/catalog/brand'),
};

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'kit-public-'));
  const kitDir = join(root, 'kit');
  const brandDir = join(root, 'brand');
  const files = ['kit/public/sw.js', 'kit/icons/staff/favicon.ico', 'kit/icons/family/icon.png',
    'brand/mark.png', 'brand/mark-small.png', 'outside.png'];
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), file);
  }
  return { kitDir, brandDir };
}

const inside = (file, dirs) => dirs.some((dir) => file.startsWith(dir + sep));

test('the marks come from brandDir, the worker from kitDir/public, icons from kitDir/icons', () => {
  const dirs = fixture();
  const files = kitFiles({ ...dirs, icons: 'staff' });
  assert.equal(files.get('/brand/mark.png'), join(dirs.brandDir, 'mark.png'));
  assert.equal(files.get('/brand/mark-small.png'), join(dirs.brandDir, 'mark-small.png'));
  assert.equal(files.get('/sw.js'), join(dirs.kitDir, 'public', 'sw.js'));
  assert.equal(files.get('/favicon.ico'), join(dirs.kitDir, 'icons', 'staff', 'favicon.ico'));
  assert.equal(files.has('/icon.png'), false);
});

test('no served file lies outside the given folders', () => {
  const dirs = fixture();
  const files = [...kitFiles({ ...dirs, icons: 'family' }).values()];
  assert.ok(files.every((file) => inside(file, [dirs.kitDir, dirs.brandDir])), files.join());
  assert.equal(files.length, 4);
});

test('every app gets the worker and the brand marks at their old URLs', () => {
  const files = kitFiles(REAL);
  for (const path of ['/sw.js', '/brand/mark.png', '/brand/mark-small.png']) {
    assert.ok(files.has(path), path);
  }
  assert.equal(files.has('/favicon.ico'), false);
});

test('each app gets its own icon set at the root, the family one with a maskable icon', () => {
  const staff = kitFiles({ ...REAL, icons: 'staff' });
  const family = kitFiles({ ...REAL, icons: 'family' });
  for (const path of [...ICONS, '/icon-192.png', '/icon-512.png']) {
    assert.match(staff.get(path) ?? '', /icons[/\\]staff/);
    assert.match(family.get(path) ?? '', /icons[/\\]family/);
  }
  assert.ok(family.has('/icon-maskable-512.png'));
});

test('the build emits each file at its URL path without the leading slash', () => {
  const emitted = [];
  const plugin = kitPublic({ ...fixture(), icons: 'family' });
  plugin.generateBundle.call({ emitFile: (file) => emitted.push(file.fileName) });
  assert.deepEqual(emitted.sort(), ['brand/mark-small.png', 'brand/mark.png', 'icon.png', 'sw.js']);
});

test('the dev server answers a kit file with its type and passes the rest on', () => {
  const plugin = kitPublic({ ...REAL, icons: 'staff' });
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
    for (const path of kitFiles({ ...REAL, icons: app }).keys()) {
      const copy = new URL(`../../apps/${app}-web/public${path}`, import.meta.url);
      assert.equal(existsSync(copy), false, `apps/${app}-web/public${path}`);
    }
  }
});
