// End to end on a scratch git repo: the staff app moves apps/mobile → apps/staff-mobile and the
// family app apps/family → apps/family-mobile (its icons now ../staff-mobile/assets): no native
// change, so the OTA goes.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../native-changes.mjs', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'native-rename-'));
const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
const put = (path, text) => {
  mkdirSync(join(dir, path, '..'), { recursive: true });
  writeFileSync(join(dir, path), text);
};
const familyJson = (to) =>
  JSON.stringify({ expo: { name: 'f', icon: `../${to}/assets/icon.png` } });
const guard = (env) => {
  const opts = { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } };
  return spawnSync('node', [SCRIPT, first, 'preview'], opts);
};
const pkg = (name) => JSON.stringify({ name, dependencies: { expo: '57' } });
let first = '';

before(() => {
  git('init', '-q');
  git('config', 'user.email', 'ci@example.invalid');
  git('config', 'user.name', 'ci');
  const staff = { name: 's', version: '1.0.0', plugins: ['expo-router'] };
  put('apps/mobile/app.json', JSON.stringify({ expo: staff }));
  put('apps/mobile/package.json', pkg('mobile'));
  put('apps/mobile/eas.json', JSON.stringify({ build: { preview: { channel: 'preview' } } }));
  put('apps/mobile/assets/icon.png', 'png');
  put('apps/mobile/plugins/p.ts', 'export {}');
  put('apps/family/app.json', familyJson('mobile'));
  put('apps/family/package.json', pkg('family'));
  git('add', '-A');
  git('commit', '-qm', 'build');
  first = git('rev-parse', 'HEAD');
  git('mv', 'apps/mobile', 'apps/staff-mobile');
  git('mv', 'apps/family', 'apps/family-mobile');
  put('apps/family-mobile/app.json', familyJson('staff-mobile'));
  put('apps/staff-mobile/package.json', pkg('staff-mobile'));
  put('apps/family-mobile/package.json', pkg('family-mobile'));
  git('add', '-A');
  git('commit', '-qm', 'rename');
});
after(() => rmSync(dir, { recursive: true, force: true }));

test('the staff app folder move is no native change', () => {
  const run = guard({ APP_DIR: '' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

test('the family app folder move (and its renamed icon paths) is no native change', () => {
  const run = guard({ APP_DIR: 'apps/family-mobile' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

test('a real change after the move is still found', () => {
  put('apps/staff-mobile/plugins/p.ts', 'export const x = 1;');
  git('commit', '-qam', 'plugin');
  const run = guard({ APP_DIR: '' });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /apps\/staff-mobile\/plugins\/p\.ts changed/);
});
