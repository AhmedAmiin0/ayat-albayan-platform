// roll.sh's modes and its .api.sha marker (deploy-staging «Roll mode»): only a build builds, every
// mode still rolls each container healthy-first, and .api.sha names the image's commit only after a
// roll that ended well. Runs the real scripts against the fake docker of roll-fake.mjs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, run } from '../roll-fake.mjs';

const COPIES = ['ayat-api-a', 'ayat-api-b', 'ayat-api-c', 'ayat-api-d'];
const UP = ['ayat-worker', 'ayat-pdf', ...COPIES, 'ayat-lb'];
const SHA = `${'b'.repeat(40)}\n`;
const files = { 'src/.release-sha': SHA, '.api.sha': `${'a'.repeat(40)}\n` };
const ups = (log) => log.filter((l) => l.includes(' up -d --no-deps ayat-'));

test('build (no argument): one build, then the roll; .api.sha = the shipped commit', () => {
  const r = run('roll.sh', { up: UP, files });
  assert.equal(r.code, 0, r.out);
  assert.ok(at(r.log, ' build ayat-worker') >= 0 && at(r.log, ' build ') < at(r.log, 'up -d'));
  assert.equal(r.text('.api.sha'), SHA);
});

test('--no-build: no build, the same roll without forcing a recreate; .api.sha kept current', () => {
  const r = run('roll.sh', { args: ['--no-build'], up: UP, files });
  assert.equal(r.code, 0, r.out);
  assert.ok(at(r.log, ' build') < 0, r.log.join('\n'));
  assert.deepEqual(ups(r.log).map((l) => l.split(' ').at(-1)), ['ayat-redis', ...UP]);
  assert.ok(ups(r.log).every((l) => !l.includes('--force-recreate')));
  assert.equal(r.text('.api.sha'), SHA);
});

test('--env-only: no build, every API container recreated to read the new .env', () => {
  const r = run('roll.sh', { args: ['--env-only'], up: UP, files });
  assert.equal(r.code, 0, r.out);
  assert.ok(at(r.log, ' build') < 0);
  for (const svc of ['ayat-worker', 'ayat-pdf', ...COPIES])
    assert.ok(at(r.log, `up -d --no-deps --force-recreate ${svc}`) >= 0, svc);
});

test('an unknown mode refuses before any docker call and changes nothing', () => {
  const r = run('roll.sh', { args: ['--fast'], up: UP, files });
  assert.equal(r.code, 2);
  assert.match(r.out, /roll\.sh: unknown mode --fast/);
  assert.deepEqual(r.log, []);
  assert.equal(r.text('.api.sha'), files['.api.sha']);
});

test('a failed roll leaves the image commit unknown, so the next deploy builds', () => {
  const r = run('roll.sh', { args: ['--no-build'], up: UP, files, fail: ['up -d --no-deps ayat-api-a'] });
  assert.notEqual(r.code, 0);
  assert.equal(r.has('.api.sha'), false);
});

test('src without .release-sha (shipped before the marker): no .api.sha after a good roll', () => {
  const r = run('roll.sh', { up: UP, files: { '.api.sha': SHA } });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.has('.api.sha'), false);
});

test('rollback.sh forgets the image commit before it puts the previous version back', () => {
  const roll = '#!/bin/sh\necho "old roll.sh" >> "$FAKE/log"\n';
  const before = { 'src.old/.release-sha': SHA, 'roll.sh.old': roll, '.api.sha': SHA };
  const compose = { 'docker-compose.yml.old': 'services:\n  ayat-lb:\n    image: caddy\n' };
  const r = run('rollback.sh', { files: { ...before, ...compose } });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.has('.api.sha'), false, 'the old roll.sh here writes none');
  assert.equal(r.text('src/.release-sha'), SHA);
});
