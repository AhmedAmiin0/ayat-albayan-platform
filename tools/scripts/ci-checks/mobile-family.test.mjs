// The separate family app (owner 2026-11-14, docs/50 §7-8): apps/family with its own EAS project,
// built, updated and tagged by mobile.yml app=family, and checked by ci.yml like apps/mobile.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const load = (f) =>
  parse(readFileSync(fileURLToPath(new URL(`../../../.github/workflows/${f}`, import.meta.url)), 'utf8'));
const read = (f) => readFileSync(fileURLToPath(new URL(`../../../${f}`, import.meta.url)), 'utf8');
const mobile = load('mobile.yml');
const ci = load('ci.yml');
const deploy = load('deploy-staging.yml');
const step = (job, name) => mobile.jobs[job].steps.find((s) => s.name?.startsWith(name));

test('mobile.yml app: staff by default (every automatic run), family by hand in apps/family', () => {
  const input = mobile.on.workflow_dispatch.inputs.app;
  assert.deepEqual([input.type, input.options, input.default], ['choice', ['staff', 'family'], 'staff']);
  assert.equal(mobile.env.APP_DIR, "${{ inputs.app == 'family' && 'apps/family' || 'apps/mobile' }}");
  for (const s of [step('build', 'EAS build'), step('ota', 'Native-change guard'), step('ota', 'EAS update')]) {
    assert.equal(s['working-directory'], '${{ env.APP_DIR }}');
  }
  const dispatch = deploy.jobs.ota.steps.map((s) => s.run ?? '').join('\n');
  assert.doesNotMatch(dispatch, /"app"|family/, 'deploy-staging must leave the app at staff');
});

test('a family run is titled «... family-preview»: never the staff preview OTA deploy-baseline looks for', () => {
  assert.match(mobile['run-name'], /^mobile \$\{\{ inputs\.action \}\} \$\{\{ inputs\.app == 'family' && 'family-preview' \|\| /);
});

test('eas init links or creates the family EAS project before every EAS call, and exports its id', () => {
  for (const job of ['build', 'ota']) {
    const names = mobile.jobs[job].steps.map((s) => s.name ?? '');
    const link = names.findIndex((n) => n.startsWith('Link the family EAS project'));
    const eas = names.findIndex((n) => /^(EAS build|Native-change guard)/.test(n));
    assert.ok(link > 0 && link < eas, job);
    const s = mobile.jobs[job].steps[link];
    assert.deepEqual([s.if, s['working-directory']], ["${{ inputs.app == 'family' }}", 'apps/family']);
    assert.equal(s.run, 'bash ../../tools/scripts/ci-checks/eas-init-family.sh');
  }
  const sh = read('tools/scripts/ci-checks/eas-init-family.sh');
  assert.match(sh, /npx --yes "\$EAS_CLI" init --non-interactive --force/);
  assert.match(sh, /grep -oE "\$uuid"/);
  assert.match(sh, /exit 1\n/);
  assert.match(sh, /FAMILY_EAS_PROJECT_ID=\$ids" >> "\$GITHUB_ENV"/);
  assert.match(sh, />> "\$GITHUB_STEP_SUMMARY"/);
});

test('the family OTA goes to its own channel preview, without the staff app Stripe flag or Firebase secret', () => {
  const [family] = step('ota', 'EAS update').run.split('exit 0');
  assert.match(family, /if \[ "\$APP" = family \]/);
  assert.match(family, /unset EXPO_PUBLIC_FEATURE_STRIPE/);
  assert.match(family, /update --channel preview --environment preview/);
  assert.match(step('ota', 'Write the Firebase file').if, /inputs\.app != 'family'/);
  const builds = mobile.jobs.ota.steps.filter((s) => /--filter "(mobile|family)\^\.\.\." build/.test(s.run));
  assert.deepEqual(builds.map((s) => s.if), ["${{ inputs.app != 'family' }}", "${{ inputs.app == 'family' }}"]);
});

test('family release tags: mobile-family-v… for the APK, ota-family-preview-… for the OTA', () => {
  const tag = (kind) => mobile.jobs.release.steps.find((s) => s.env?.KIND === kind);
  assert.equal(tag('apk').env.PROFILE, "${{ inputs.app == 'family' && 'family' || inputs.profile || 'preview' }}");
  assert.match(tag('apk').run, /"\$APP_DIR\/app\.json"/);
  assert.match(tag('ota').env.CHANNEL, /^\$\{\{ inputs\.app == 'family' && 'family-preview' \|\| /);
});

test('forcesRTL stays out of both apps', () => {
  for (const job of ['build', 'ota']) {
    assert.match(step(job, 'Never re-add forcesRTL').run, /apps\/\{mobile,family\}\/app\.config\.ts/);
  }
});

test('ci: the family app and @ab/mobile-kit get tests and a Metro bundle; others exclude them', () => {
  const rows = ci.jobs.verify.strategy.matrix.include;
  const row = (name) => rows.find((r) => r.name === name);
  assert.equal(row('test family').filter, '--filter=family --filter=@ab/mobile-kit');
  assert.deepEqual(row('bundle family'), { name: 'bundle family', task: 'bundle', filter: '--filter=family' });
  assert.match(row('test others').filter, /--filter=!mobile --filter=!family --filter=!@ab\/mobile-kit$/);
});

test('ci: a change only to the mobile apps or their kit skips the e2e machines', () => {
  const run = ci.jobs.changes.steps.find((s) => s.id === 'diff').run;
  assert.match(run, /grep -qvE '\^\(apps\/\(mobile\|family\)\/\|packages\/mobile-kit\/\|docs\//);
});
