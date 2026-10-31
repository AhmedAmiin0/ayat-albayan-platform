import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDeployTitle, pickDeployBases, pickOtaBase } from './deploy-baseline.mjs';

const sha = (c) => c.repeat(40);
const run = (title, extra = {}) => ({
  display_title: title,
  head_branch: 'develop',
  conclusion: 'success',
  head_sha: sha('f'),
  ...extra,
});
const all = async () => true;

test('the run title carries the deployed commit and the marker', () => {
  assert.deepEqual(parseDeployTitle(`deploy-production ${sha('a')}`), { sha: sha('a'), marker: '' });
  assert.deepEqual(parseDeployTitle(`deploy-production ${sha('b')} no-migrate`), {
    sha: sha('b'),
    marker: 'no-migrate',
  });
  assert.equal(parseDeployTitle('deploy-production'), null);
  assert.equal(parseDeployTitle(`deploy-production ${sha('a')} other`), null);
  assert.equal(parseDeployTitle(undefined), null);
});

test('old runs without a commit in the title are never a baseline (fail safe: migrate runs)', async () => {
  assert.deepEqual(await pickDeployBases([run('deploy-production')], all), {
    migrate_base: '',
    code_base: '',
  });
});

test('a no-migrate run is the code base but not the migration base', async () => {
  const runs = [
    run(`deploy-production ${sha('c')} no-migrate`),
    run(`deploy-production ${sha('b')}`),
    run(`deploy-production ${sha('a')}`),
  ];
  assert.deepEqual(await pickDeployBases(runs, all), {
    migrate_base: sha('b'),
    code_base: sha('c'),
  });
});

test('env-only runs, other branches, red runs and runs whose deploy job did not pass are skipped', async () => {
  const runs = [
    run(`deploy-production ${sha('e')} env-only`),
    run(`deploy-production ${sha('d')}`, { head_branch: 'main' }),
    run(`deploy-production ${sha('c')}`, { conclusion: 'failure' }),
    run(`deploy-production ${sha('b')}`, { id: 'no-deploy' }),
    run(`deploy-production ${sha('a')}`),
  ];
  const deployed = async (r) => r.id !== 'no-deploy';
  assert.deepEqual(await pickDeployBases(runs, deployed), {
    migrate_base: sha('a'),
    code_base: sha('a'),
  });
});

test('the newest green preview OTA is the OTA base; builds-only and development runs are not', () => {
  const runs = [
    run('mobile build-android-apk preview', { head_sha: sha('d') }),
    run('mobile ota-update development', { head_sha: sha('c') }),
    run('mobile ota-update preview', { head_sha: sha('b'), conclusion: 'failure' }),
    run('mobile both preview', { head_sha: sha('a') }),
  ];
  assert.equal(pickOtaBase(runs), sha('a'));
  assert.equal(pickOtaBase([run('mobile')]), '');
});

test('another channel has its own OTA base: staging and preview never mix', () => {
  const runs = [
    run('mobile ota-update staging', { head_sha: sha('c') }),
    run('mobile ota-update stripe-test', { head_sha: sha('b') }),
    run('mobile ota-update preview', { head_sha: sha('a') }),
  ];
  assert.equal(pickOtaBase(runs), sha('a'));
  assert.equal(pickOtaBase(runs, 'staging'), sha('c'));
  assert.equal(pickOtaBase(runs.slice(1), 'staging'), '');
});

test('pre-split titles («deploy-staging <sha>», production deploys) are never a production base', () => {
  assert.equal(parseDeployTitle(`deploy-staging ${sha('a')}`), null);
});
