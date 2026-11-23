// KIND aab: the family app's Google Play bundle, built by mobile.yml
// app=family profile=production. Its tags (aab-<profile>-v<version>-b<run>) never collide with
// the APK tags (mobile-…) of the preview builds, and an APK tag never counts as an AAB one.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createArgs, familyTags, plan, readRelease } from './release-tag.mjs';

const sha = (c) => c.repeat(40);
const NOON = new Date('2026-11-21T12:00:00Z');
const aab = {
  KIND: 'aab',
  SHA: sha('a'),
  PROFILE: 'family-production',
  VERSION: '1.0.0',
  GITHUB_RUN_NUMBER: '88',
};
const tags = (...pairs) => pairs.map(([name, c]) => ({ name, sha: sha(c) }));

test('readRelease accepts aab and checks its profile, version and run like an APK', () => {
  assert.equal(readRelease(aab).kind, 'aab');
  assert.throws(() => readRelease({ ...aab, PROFILE: undefined }), /PROFILE/);
  assert.throws(() => readRelease({ ...aab, PROFILE: 'Family' }), /PROFILE/);
  assert.throws(() => readRelease({ ...aab, VERSION: '1.0' }), /VERSION/);
  assert.throws(() => readRelease({ ...aab, GITHUB_RUN_NUMBER: 'x' }), /GITHUB_RUN_NUMBER/);
  assert.throws(() => readRelease({ ...aab, KIND: 'AAB' }), /KIND must be app, apk, aab or ota/);
});

test('the first AAB tag: aab-<profile>-v<version>-b<run>, no previous', () => {
  assert.deepEqual(plan([], readRelease(aab), NOON), {
    tag: 'aab-family-production-v1.0.0-b88',
    previous: '',
  });
});

test('APK tags of the same app and run never count as AAB tags (no collision)', () => {
  const apks = tags(['mobile-family-v1.0.0-b88', 'b'], ['mobile-v1.0.0-b88', 'c']);
  assert.deepEqual(plan(apks, readRelease(aab), NOON), {
    tag: 'aab-family-production-v1.0.0-b88',
    previous: '',
  });
  const apk = readRelease({ ...aab, KIND: 'apk', PROFILE: 'family' });
  const bundles = tags(['aab-family-production-v1.0.0-b88', 'b']);
  assert.equal(familyTags(bundles, apk).length, 0);
});

test('the previous AAB is the highest run; a re-run of the same commit is skipped', () => {
  const existing = tags(
    ['aab-family-production-v1.0.0-b9', 'b'],
    ['aab-family-production-v1.0.0-b12', 'c'],
  );
  const next = readRelease({ ...aab, SHA: sha('d') });
  assert.equal(plan(existing, next, NOON).previous, 'aab-family-production-v1.0.0-b12');
  const rerun = readRelease({ ...aab, SHA: sha('c') });
  assert.match(plan(existing, rerun, NOON).skip, /already aab-family-production-v1\.0\.0-b12/);
});

test('the notes call it an Android App Bundle for Google Play, never latest', () => {
  const url = 'https://expo.dev/accounts/o/projects/p/builds/1';
  const release = readRelease({ ...aab, EAS_URL: url });
  const step = { tag: 'aab-family-production-v1.0.0-b88', previous: '' };
  const args = createArgs(step, release, 'https://github.com/o/r/actions/runs/1');
  const notes = args[args.indexOf('--notes') + 1];
  assert.match(notes, /^Android App Bundle \(AAB\) for Google Play, build family-production/);
  assert.match(notes, /app version 1\.0\.0\. EAS build: https:\/\/expo\.dev/);
  assert.equal(args.at(-1), '--latest=false');
});
