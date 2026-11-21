// The family app's Google Play build (owner 2026-11-21): mobile.yml action=build-android-apk
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

test('production is the family app build only: never the staff app, never an OTA', () => {
  for (const job of ['build', 'ota']) {
    const guard = step(job, 'Family production builds only');
    assert.ok(guard, job);
    assert.equal(mobile.jobs[job].steps.indexOf(guard), 1, `${job}: right after «Develop only»`);
    assert.match(guard.run, /exit 1/);
  }
  assert.match(step('build', 'Family production builds only').if, /inputs\.app != 'family'/);
  assert.equal(step('ota', 'Family production builds only').if, "${{ inputs.profile == 'production' }}");
});

test('the OTA steps keep the family preview channel', () => {
  for (const [job, name] of [['ota', 'Native-change guard'], ['ota', 'EAS update']]) {
    assert.equal(step(job, name).env.PROFILE, "${{ inputs.app == 'family' && 'preview' || inputs.profile || 'preview' }}");
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
