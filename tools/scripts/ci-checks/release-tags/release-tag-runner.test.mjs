// A build made on the GitHub runner (mobile.yml builder github, eas build --local) has no expo.dev
// page: its release links the run's artifact and names the file's sha256 instead.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createArgs, readRelease } from './release-tag.mjs';

const aab = {
  KIND: 'aab',
  SHA: 'a'.repeat(40),
  PROFILE: 'family-production',
  VERSION: '1.0.0',
  GITHUB_RUN_NUMBER: '91',
};
const ARTIFACT = 'https://github.com/o/r/actions/runs/123/artifacts/456';
const SUM = 'f'.repeat(64);
const notesOf = (release) => {
  const args = createArgs({ tag: 't', previous: '' }, release, 'https://github.com/o/r/actions/runs/1');
  return args[args.indexOf('--notes') + 1];
};

test('readRelease keeps a GitHub artifact link and a sha256 only, never anything else', () => {
  const r = readRelease({ ...aab, ARTIFACT_URL: ARTIFACT, SHA256: SUM });
  assert.deepEqual([r.artifactUrl, r.sha256], [ARTIFACT, SUM]);
  const bad = readRelease({ ...aab, ARTIFACT_URL: 'https://evil.dev/x', SHA256: 'x' });
  assert.deepEqual([bad.artifactUrl, bad.sha256], ['', '']);
  assert.equal(readRelease({ ...aab, ARTIFACT_URL: `${ARTIFACT} $(id)` }).artifactUrl, '');
  assert.equal(readRelease(aab).artifactUrl, '');
});

test('a runner build links its artifact and sha256, never an expo.dev page', () => {
  const notes = notesOf(readRelease({ ...aab, ARTIFACT_URL: ARTIFACT, SHA256: SUM }));
  assert.match(notes, /^Android App Bundle \(AAB\) for Google Play, build family-production/);
  assert.match(notes, /Built on the GitHub runner: https:\/\/github\.com\/o\/r\/actions\/runs\/123\/artifacts\/456/);
  assert.match(notes, new RegExp(`sha256 ${SUM}`));
  assert.doesNotMatch(notes, /EAS build:/);
});

test('an APK built on the runner gets the same link', () => {
  const apk = readRelease({ ...aab, KIND: 'apk', PROFILE: 'family', ARTIFACT_URL: ARTIFACT });
  assert.match(notesOf(apk), /^Android APK, EAS profile family, app version 1\.0\.0\. Built on the GitHub runner: /);
});

test('an EAS cloud build keeps its expo.dev link', () => {
  const url = 'https://expo.dev/accounts/o/projects/p/builds/1';
  assert.match(notesOf(readRelease({ ...aab, EAS_URL: url })), /EAS build: https:\/\/expo\.dev/);
});
