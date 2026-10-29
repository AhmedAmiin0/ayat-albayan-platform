// deploy/staging/rollback.sh (docs/09 «Roll back»): back to the previous version with 127.0.0.1:3110 serving,
// the worker never beside the single container, and only this project's containers and images touched.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { at, root, run } from './roll-fake.mjs';

const SINGLE = 'services:\n  ayat-api:\n    build: ./src\n';
const LAYOUT = 'services:\n  ayat-lb:\n    image: caddy\n';
const old = (compose) => ({
  'src.old/marker': 'previous',
  'docker-compose.yml': LAYOUT,
  'docker-compose.yml.old': compose,
  'roll.sh.old': '#!/bin/sh\necho "old roll.sh" >> "$FAKE/log"\n',
  'rollback.sh.old': 'BAD',
});

test('to the single container: build, stop+rm the worker and the LB, THEN compose up, then the copies and the sandbox, then /health', () => {
  const r = run('rollback.sh', { up: ['ayat-worker', 'ayat-lb', 'ayat-api-a', 'ayat-api-b', 'ayat-pdf'], files: old(SINGLE) });
  assert.equal(r.code, 0, r.out);
  const i = (s) => at(r.log, s);
  const up = i('compose -p ayat-albayan-staging up -d');
  assert.ok(i('compose -p ayat-albayan-staging build') < i('stop -t 30 id-ayat-worker'));
  for (const s of ['stop -t 30 id-ayat-worker', 'rm id-ayat-worker', 'stop -t 30 id-ayat-lb', 'rm id-ayat-lb']) {
    assert.ok(i(s) >= 0 && i(s) < up, `${s} before compose up:\n${r.log.join('\n')}`);
  }
  for (const s of ['stop -t 30 id-ayat-api-a', 'rm id-ayat-api-b', 'stop -t 30 id-ayat-pdf']) assert.ok(i(s) > up, `${s} after compose up`);
  assert.ok(i('curl -fsS --retry 60') > i('rm id-ayat-pdf'));
  assert.match(r.log[i('curl')], /http:\/\/127\.0\.0\.1:3110\/health/);
  assert.ok(i('image prune -f --filter label=com.docker.compose.project=ayat-albayan-staging') > i('curl'));
  assert.ok(i('rm -f') < 0, 'never a SIGKILL');
  assert.ok(r.has('src.bad') && r.has('src/marker') && !r.has('src.old'));
  assert.equal(r.text('docker-compose.yml'), SINGLE);
  assert.equal(r.text('rollback.sh'), readFileSync(root('deploy/staging/rollback.sh'), 'utf8'), 'never rewrites itself');
});

test('to this layout: the previous roll.sh rolls it again', () => {
  const r = run('rollback.sh', { files: old(LAYOUT) });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.log.slice(0, 1), ['old roll.sh']);
  assert.ok(at(r.log, 'stop') < 0);
});

test('no src.old: refuses and changes nothing', () => {
  const r = run('rollback.sh', { files: { 'docker-compose.yml.old': SINGLE } });
  assert.equal(r.code, 1);
  assert.match(r.out, /nothing to roll back to/);
  assert.deepEqual(r.log, []);
  assert.ok(r.has('src') && !r.has('src.bad'));
});

test('a worker that does not stop: the single container never starts (jobs never run in two processes)', () => {
  const r = run('rollback.sh', { up: ['ayat-worker', 'ayat-lb', 'ayat-api-a'], files: old(SINGLE), fail: ['stop -t 30 id-ayat-worker'] });
  assert.notEqual(r.code, 0);
  assert.ok(at(r.log, 'compose -p ayat-albayan-staging up -d') < 0, r.log.join('\n'));
});

test('after a first switch that failed once the old container stopped (the worker did not start): back to it on 3110', () => {
  const failed = run('roll.sh', { up: ['ayat-api'], fail: ['up -d --no-deps ayat-worker'] });
  assert.notEqual(failed.code, 0);
  assert.ok(at(failed.log, 'stop -t 30 id-ayat-api') >= 0, 'the roll got past the legacy stop');
  const r = run('rollback.sh', { up: ['ayat-worker', 'ayat-lb', 'ayat-api-a', 'ayat-api-b'], files: old(SINGLE) });
  assert.equal(r.code, 0, r.out);
  assert.ok(at(r.log, 'rm id-ayat-worker') < at(r.log, 'compose -p ayat-albayan-staging up -d'));
  assert.ok(at(r.log, 'curl -fsS --retry 60') > at(r.log, 'compose -p ayat-albayan-staging up -d'));
});
