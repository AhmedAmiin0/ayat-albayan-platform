import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createArgs, familyTags, plan, readRelease } from './release-tag.mjs';

const sha = (c) => c.repeat(40);
const app = { KIND: 'app', SHA: sha('a') };
const apk = { KIND: 'apk', SHA: sha('a'), PROFILE: 'preview', VERSION: '0.3.0', GITHUB_RUN_NUMBER: '57' };
const ota = (channel) => ({ KIND: 'ota', SHA: sha('a'), CHANNEL: channel });
const at = (iso) => new Date(iso);
const NOON = at('2026-10-30T12:00:00Z');
const tags = (...pairs) => pairs.map(([name, c]) => ({ name, sha: sha(c) }));

test('readRelease checks every value that ends up in a tag name', () => {
  assert.equal(readRelease(app).kind, 'app');
  assert.throws(() => readRelease({ ...app, SHA: 'abc1234' }), /SHA/);
  for (const KIND of [undefined, 'web', 'constructor', '__proto__']) {
    assert.throws(() => readRelease({ ...app, KIND }), /KIND/, String(KIND));
  }
  assert.throws(() => readRelease({ ...apk, VERSION: '' }), /VERSION/);
  assert.throws(() => readRelease({ ...apk, GITHUB_RUN_NUMBER: '5;x' }), /GITHUB_RUN_NUMBER/);
  assert.throws(() => readRelease({ ...apk, PROFILE: 'Preview' }), /PROFILE/);
  assert.throws(() => readRelease(ota('preview; rm -rf')), /CHANNEL/);
  assert.equal(readRelease(ota('stripe-test')).channel, 'stripe-test');
});

test('readRelease keeps an expo.dev build link only, never anything else', () => {
  const url = 'https://expo.dev/accounts/o/projects/p/builds/0f8e-12';
  assert.equal(readRelease({ ...apk, EAS_URL: url }).easUrl, url);
  assert.equal(readRelease({ ...apk, EAS_URL: 'https://evil.dev/x' }).easUrl, '');
  assert.equal(readRelease({ ...apk, EAS_URL: `${url} $(id)` }).easUrl, '');
  assert.equal(readRelease(apk).easUrl, '');
});

test('the first app release of a day is -1; the next takes 1 + that day highest n', () => {
  const r = readRelease(app);
  assert.deepEqual(plan([], r, NOON), { tag: 'v2026.10.30-1', previous: '' });
  const existing = tags(['v2026.10.29-4', 'b'], ['v2026.10.30-2', 'c'], ['v2026.10.30-10', 'd']);
  assert.deepEqual(plan(existing, r, NOON), { tag: 'v2026.10.30-11', previous: 'v2026.10.30-10' });
});

test('the day is the UTC day', () => {
  const r = readRelease(app);
  assert.equal(plan([], r, at('2026-10-30T23:30:00-03:00')).tag, 'v2026.10.31-1');
  assert.equal(plan([], r, at('2026-10-31T01:00:00+03:00')).tag, 'v2026.10.30-1');
});

test('other families and stray tags never count', () => {
  const r = readRelease(app);
  const noise = tags(['mobile-v0.3.0-b9', 'b'], ['ota-preview-2026.10.30-3', 'b'], ['v1.0.0', 'b'],
    ['very-2026.10.30-1', 'b'], ['v2026.10.30-1-hotfix', 'b']);
  assert.deepEqual(plan(noise, r, NOON), { tag: 'v2026.10.30-1', previous: '' });
});

test('a commit that already has a tag of the family is skipped (re-runs, redeploys)', () => {
  const existing = tags(['v2026.10.29-1', 'a'], ['v2026.10.30-1', 'b']);
  assert.match(plan(existing, readRelease(app), NOON).skip, /aaaaaaa is already v2026\.10\.29-1/);
  // The same commit still gets its OTA and APK tags: those are other releases.
  assert.equal(plan(existing, readRelease(ota('preview')), NOON).tag, 'ota-preview-2026.10.30-1');
  assert.equal(plan(existing, readRelease(apk), NOON).tag, 'mobile-v0.3.0-b57');
});

test('APK tags: version + run number, previous = highest run number, one family per profile', () => {
  const existing = tags(['mobile-v0.2.9-b9', 'b'], ['mobile-v0.3.0-b12', 'c'], ['mobile-stripe-test-v0.3.0-b13', 'd']);
  assert.deepEqual(plan(existing, readRelease(apk), NOON), { tag: 'mobile-v0.3.0-b57', previous: 'mobile-v0.3.0-b12' });
  const stripe = readRelease({ ...apk, PROFILE: 'stripe-test', SHA: sha('c') });
  assert.deepEqual(plan(existing, stripe, NOON), {
    tag: 'mobile-stripe-test-v0.3.0-b57',
    previous: 'mobile-stripe-test-v0.3.0-b13',
  });
  assert.match(plan(existing, readRelease({ ...apk, SHA: sha('c') }), NOON).skip, /mobile-v0\.3\.0-b12/);
});

test('OTA tags count per channel; a channel never sees a longer one that starts like it', () => {
  const existing = tags(['ota-preview-2026.10.30-1', 'b'], ['ota-stripe-test-2026.10.30-4', 'c']);
  assert.deepEqual(plan(existing, readRelease(ota('preview')), NOON), {
    tag: 'ota-preview-2026.10.30-2',
    previous: 'ota-preview-2026.10.30-1',
  });
  assert.equal(plan(existing, readRelease(ota('stripe-test')), NOON).tag, 'ota-stripe-test-2026.10.30-5');
  assert.equal(familyTags(existing, readRelease(ota('stripe'))).length, 0);
});

test('familyTags sorts by day, then n as a number', () => {
  const r = readRelease(app);
  const names = familyTags(tags(['v2026.10.30-10', 'b'], ['v2026.10.30-9', 'c'], ['v2026.09.30-12', 'd']), r);
  assert.deepEqual(names.map((t) => t.name), ['v2026.09.30-12', 'v2026.10.30-9', 'v2026.10.30-10']);
});

test('createArgs: target commit, title, generated notes from the previous tag, Latest = the app only', () => {
  const run = 'https://github.com/o/r/actions/runs/1';
  const first = createArgs({ tag: 'v2026.10.30-1', previous: '' }, readRelease(app), run);
  assert.deepEqual(first.slice(0, 7), ['release', 'create', 'v2026.10.30-1', '--target', sha('a'), '--title', 'Release v2026.10.30-1']);
  assert.ok(first.includes('--generate-notes') && first.includes('--latest=true'));
  assert.ok(!first.includes('--notes-start-tag'), 'the first release has no start tag');
  assert.match(first[first.indexOf('--notes') + 1], /app\.ayatalbayan\.com[\s\S]*released by https:\/\/github\.com\/o\/r\/actions\/runs\/1/);
  const url = 'https://expo.dev/accounts/o/projects/p/builds/1';
  const next = createArgs({ tag: 'mobile-v0.3.0-b57', previous: 'mobile-v0.3.0-b12' }, readRelease({ ...apk, EAS_URL: url }), run);
  assert.deepEqual(next.slice(next.indexOf('--notes-start-tag'), -1), ['--notes-start-tag', 'mobile-v0.3.0-b12']);
  assert.equal(next.at(-1), '--latest=false');
  assert.match(next[next.indexOf('--notes') + 1], /EAS profile preview, app version 0\.3\.0\. EAS build: https:\/\/expo\.dev/);
});
