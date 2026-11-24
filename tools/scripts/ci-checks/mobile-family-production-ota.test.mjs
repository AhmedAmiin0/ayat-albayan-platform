// Lane L06: the family Google Play build gets OTAs. mobile.yml ota-update with
// app=family profile=production ships to channel production (EAS environment production), by hand
// only, behind the same native-change guard; the staff app, action both and automatic runs are
// refused.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (f) => readFileSync(fileURLToPath(new URL(`../../../${f}`, import.meta.url)), 'utf8');
const mobile = parse(read('.github/workflows/mobile.yml'));
const step = (name) => mobile.jobs.ota.steps.find((s) => s.name?.startsWith(name));
const PROFILE =
  "${{ inputs.app == 'family' && (inputs.profile == 'production' && 'production' || 'preview')" +
  " || inputs.profile || 'preview' }}";

test('the OTA guard refuses production for the staff app, for action both and for automatic runs', () => {
  const guard = step('Family production OTA by hand only');
  assert.ok(guard);
  assert.equal(mobile.jobs.ota.steps.indexOf(guard), 1, 'right after «Develop only»');
  assert.equal(guard.if, "${{ inputs.profile == 'production' }}");
  assert.equal(guard.env.APP, '${{ inputs.app }}');
  assert.equal(guard.env.ACTION, '${{ inputs.action }}');
  assert.equal(guard.env.ACTOR, '${{ github.actor }}');
  assert.match(guard.run, /test "\$APP" = family \|\| \{ .*exit 1; \}/);
  assert.match(guard.run, /test "\$ACTION" = ota-update \|\| \{ .*exit 1; \}/);
  assert.match(guard.run, /test "\$ACTOR" != 'github-actions\[bot\]' \|\| \{ .*exit 1; \}/);
  assert.equal(step('Family production builds only'), undefined, 'the old blanket refusal is gone');
});

test('the native-change guard compares the family production OTA with the last production build', () => {
  const guard = step('Native-change guard');
  assert.equal(guard.env.PROFILE, PROFILE);
  assert.match(guard.run, /--build-profile "\$PROFILE" --status finished/);
  assert.match(guard.run, /native-changes\.mjs "\$last" "\$PROFILE"/);
  assert.equal(guard.env.FORCE, '${{ inputs.force_ota }}');
});

test('the family production OTA goes to channel production, EAS environment production', () => {
  const update = step('EAS update');
  assert.equal(update.env.PROFILE, PROFILE);
  const [family] = update.run.split('exit 0');
  assert.match(family, /if \[ "\$APP" = family \]/);
  assert.match(family, /update --channel "\$PROFILE" --environment "\$PROFILE"/);
  assert.match(family, /Family \$PROFILE OTA from GitHub/);
});

test('each app queues on its own: the family dispatch never cancels the staff one', () => {
  assert.equal(mobile.concurrency.group, "mobile-${{ inputs.app || 'staff' }}");
  assert.equal(mobile.concurrency['cancel-in-progress'], false);
});

test('the production OTA is tagged ota-family-production-…', () => {
  const tag = mobile.jobs.release.steps.find((s) => s.env?.KIND === 'ota');
  assert.match(tag.env.CHANNEL, /inputs\.profile == 'production' && 'family-production'/);
});

test('every family build and OTA prints its runtime (fingerprint) to the run summary', () => {
  for (const job of ['build', 'ota']) {
    const steps = mobile.jobs[job].steps;
    const fp = steps.find((s) => s.name === 'Family runtime (fingerprint)');
    assert.ok(fp, job);
    assert.deepEqual([fp.if, fp['working-directory']], ["${{ inputs.app == 'family' }}", 'apps/family-mobile']);
    assert.match(fp.run, /npx expo-updates fingerprint:generate --platform android/);
    assert.match(fp.run, />> "\$GITHUB_STEP_SUMMARY"/);
    const install = steps.findIndex((s) => s.run === 'pnpm i --frozen-lockfile');
    const eas = steps.findIndex((s) => /^(EAS build|EAS update)/.test(s.name ?? ''));
    assert.ok(install < steps.indexOf(fp) && steps.indexOf(fp) < eas, job);
  }
});
