// The OTA guard's last build: the newest of the last EAS cloud build and the last runner build
// (eas build --local, known only by its release tag or by this run's own build).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTagOf, lastBuild, lastTagged, parseTags } from './last-build.mjs';

const sha = (c) => c.repeat(40);
const tags = [
  { name: 'aab-family-production-v1.0.0-b9', sha: sha('a') },
  { name: 'aab-family-production-v1.0.0-b12', sha: sha('b') },
  { name: 'mobile-family-v1.0.0-b40', sha: sha('c') },
  { name: 'mobile-v0.3.0-b57', sha: sha('d') },
  { name: 'mobile-stripe-test-v0.3.0-b58', sha: sha('e') },
  { name: 'ota-family-production-2026.11.22-1', sha: sha('f') },
];
const TIME = { [sha('a')]: 1, [sha('b')]: 5, [sha('9')]: 3, [sha('8')]: 9 };
const timeOf = (c) => TIME[c] ?? Number.NEGATIVE_INFINITY;

test('each app and profile reads the tag family its release step writes', () => {
  assert.deepEqual(buildTagOf('family', 'production'), { kind: 'aab', profile: 'family-production' });
  assert.deepEqual(buildTagOf('family', 'preview'), { kind: 'apk', profile: 'family' });
  assert.deepEqual(buildTagOf('staff', 'preview'), { kind: 'apk', profile: 'preview' });
  assert.deepEqual(buildTagOf('staff', 'stripe-test'), { kind: 'apk', profile: 'stripe-test' });
  assert.equal(buildTagOf('staff', 'production'), undefined);
});

test('the last tagged build is the highest run of that family only', () => {
  assert.equal(lastTagged(tags, 'family', 'production'), sha('b'));
  assert.equal(lastTagged(tags, 'family', 'preview'), sha('c'));
  assert.equal(lastTagged(tags, 'staff', 'preview'), sha('d'));
  assert.equal(lastTagged(tags, 'staff', 'stripe-test'), sha('e'));
  assert.equal(lastTagged([], 'family', 'production'), '');
  assert.equal(lastTagged(tags, 'staff', 'production'), '');
});

test('a runner build newer than the last EAS build is the one compared', () => {
  const pick = lastBuild({ eas: sha('9'), tags, app: 'family', profile: 'production' }, timeOf);
  assert.deepEqual(pick, { commit: sha('b'), source: 'release tag' });
});

test('an EAS build newer than the last tag stays the one compared', () => {
  const pick = lastBuild({ eas: sha('8'), tags, app: 'family', profile: 'production' }, timeOf);
  assert.deepEqual(pick, { commit: sha('8'), source: 'EAS build list' });
});

test('this run\'s own runner build (action both, not tagged yet) wins', () => {
  const opts = { eas: sha('9'), justBuilt: sha('8'), tags, app: 'family', profile: 'production' };
  assert.deepEqual(lastBuild(opts, timeOf), { commit: sha('8'), source: 'this run' });
});

test('no EAS build: the tag alone; nothing at all: empty, so the guard refuses', () => {
  const only = lastBuild({ eas: '', tags, app: 'family', profile: 'production' }, timeOf);
  assert.equal(only.commit, sha('b'));
  assert.deepEqual(lastBuild({ eas: '', tags: [], app: 'family', profile: 'production' }, timeOf), {
    commit: '',
    source: 'none',
  });
});

test('a commit missing from history never beats a known one', () => {
  const pick = lastBuild({ eas: sha('7'), tags, app: 'family', profile: 'production' }, timeOf);
  assert.equal(pick.commit, sha('b'));
  const alone = lastBuild({ eas: sha('7'), tags: [], app: 'family', profile: 'production' }, timeOf);
  assert.equal(alone.commit, sha('7'), 'still compared: native-changes.mjs then decides');
});

test('parseTags reads lightweight and annotated tags (the commit, not the tag object)', () => {
  const out = [
    `mobile-v0.3.0-b57  ${sha('d')}`,
    `aab-family-production-v1.0.0-b12 ${sha('b')} ${sha('0')}`,
    '',
  ].join('\n');
  assert.deepEqual(parseTags(out), [
    { name: 'mobile-v0.3.0-b57', sha: sha('d') },
    { name: 'aab-family-production-v1.0.0-b12', sha: sha('b') },
  ]);
});
