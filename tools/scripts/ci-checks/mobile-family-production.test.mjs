// The family app's Google Play build: mobile.yml action=build-android-apk
// app=family profile=production builds eas.json `production` (an AAB, EAS environment production)
// and tags it KIND aab. Every other path (staff, stripe-test, family preview, OTAs) is unchanged.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (f) => readFileSync(fileURLToPath(new URL(`../../../${f}`, import.meta.url)), 'utf8');
const mobile = parse(read('.github/workflows/mobile.yml'));
const eas = JSON.parse(read('apps/family-mobile/eas.json'));
const step = (job, name) => mobile.jobs[job].steps.find((s) => s.name?.startsWith(name));
const FAMILY_PROFILE =
  "${{ inputs.app == 'family' && (inputs.profile == 'production' && 'production' || 'preview')" +
  " || inputs.profile || 'preview' }}";

test('the profile input offers production and says what it builds', () => {
  const input = mobile.on.workflow_dispatch.inputs.profile;
  assert.deepEqual(input.options, ['preview', 'stripe-test', 'production']);
  assert.equal(input.default, 'preview');
  assert.match(input.description, /production/);
  assert.match(input.description, /AAB/);
  assert.match(input.description, /EAS environment production/);
  assert.deepEqual(mobile.on.workflow_dispatch.inputs.action.options, [
    'build-android-apk', 'ota-update', 'both',
  ]);
});

test('the EAS build takes the family production profile; preview stays the family default', () => {
  assert.equal(step('build', 'EAS build').env.PROFILE, FAMILY_PROFILE);
  assert.match(step('build', 'EAS build').run, /--profile "\$PROFILE"/);
});

test('the production build is the family app only (its OTA: mobile-family-production-ota)', () => {
  const guard = step('build', 'Family production builds only');
  assert.equal(mobile.jobs.build.steps.indexOf(guard), 1, 'right after «Develop only»');
  assert.match(guard.run, /exit 1/);
  assert.match(guard.if, /inputs\.app != 'family'/);
});

test('the OTA steps take the family profile: preview unless production', () => {
  for (const name of ['Native-change guard', 'EAS update']) {
    assert.equal(step('ota', name).env.PROFILE, FAMILY_PROFILE);
  }
});

test('a production run is titled «... family-production», never «preview»', () => {
  const title = mobile['run-name'];
  assert.match(title, /inputs\.profile == 'production' && 'family-production'/);
  assert.doesNotMatch('mobile both family-production', /^mobile (ota-update|both) preview$/);
});

test('the release job tags the bundle as aab with its own profile; the APK step is unchanged', () => {
  const tag = (kind) => mobile.jobs.release.steps.find((s) => s.env?.KIND === kind);
  const isProd = "inputs.app == 'family' && inputs.profile == 'production'";
  assert.equal(tag('aab').if, `\${{ needs.build.result == 'success' && ${isProd} }}`);
  assert.equal(tag('aab').env.PROFILE, 'family-production');
  assert.match(tag('aab').run, /"\$APP_DIR\/app\.json"/);
  assert.equal(tag('apk').if, `\${{ needs.build.result == 'success' && !(${isProd}) }}`);
});

test('eas.json: production builds an app-bundle and submits a draft to the production track', () => {
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build.production.environment, 'production');
  assert.deepEqual(eas.submit.production.android, { track: 'production', releaseStatus: 'draft' });
  assert.equal(JSON.stringify(eas).includes('serviceAccountKeyPath'), false, 'no key path in git');
  assert.equal(eas.build.preview.android.buildType, 'apk');
  assert.equal(eas.build.preview.environment, 'preview');
});
