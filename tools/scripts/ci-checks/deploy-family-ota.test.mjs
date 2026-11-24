// Lane L06: deploy-staging also OTAs the family app. «plan» diffs
// apps/family-mobile + packages since the family's own last OTA (else its last build), checks
// native changes against the family's own last green preview build, and «ota» dispatches
// app=family (channel preview).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (f) => readFileSync(fileURLToPath(new URL(`../../../${f}`, import.meta.url)), 'utf8');
const deploy = parse(read('.github/workflows/deploy-staging.yml'));
const plan = deploy.jobs.plan;
const family = plan.steps.find((s) => s.id === 'family_ota');
const staff = plan.steps.find((s) => s.id === 'ota');

test('plan outputs family_ota from its own step', () => {
  assert.equal(plan.outputs.family_ota, '${{ steps.family_ota.outputs.family_ota }}');
  assert.ok(family);
  assert.equal(family.if, '${{ !inputs.env_only }}');
});

test('the family diff covers apps/family-mobile and packages, never the staff app', () => {
  assert.match(family.run, /git diff --name-only "\$BASE" HEAD -- apps\/family-mobile packages /);
  assert.doesNotMatch(family.run, /staff-mobile/);
  assert.match(family.run, /':\(exclude\)packages\/db\/supabase' ':\(exclude\)packages\/config'/);
  assert.match(family.run, /echo "family_ota=\$ota" >> "\$GITHUB_OUTPUT"/);
});

test('the family compares with its own last OTA (else build) and its own last build', () => {
  const base = '${{ steps.base.outputs.family_ota_base || steps.base.outputs.family_build_base }}';
  assert.equal(family.env.BASE, base);
  assert.equal(family.env.NATIVE_BASE, '${{ steps.base.outputs.family_build_base }}');
  assert.equal(family.env.APP_DIR, 'apps/family-mobile');
  assert.match(family.run, /native-changes\.mjs "\$NATIVE_BASE"/);
  assert.match(family.run, /if \[ -z "\$NATIVE_BASE" \]; then/, 'no known build: no OTA');
});

test('the staff diff is unchanged: apps/staff-mobile + packages against OTA_BASELINE_SHA', () => {
  assert.match(staff.run, /HEAD -- apps\/staff-mobile packages /);
  assert.equal(staff.env.NATIVE_BASE, "${{ vars.OTA_BASELINE_SHA || 'c140b4cc' }}");
});

test('ota runs for either app and dispatches app=family on preview, never production', () => {
  const job = deploy.jobs.ota;
  assert.match(job.if, /\(needs\.plan\.outputs\.ota == 'true' \|\| needs\.plan\.outputs\.family_ota == 'true'\)/);
  const s = job.steps[0];
  assert.deepEqual([s.env.STAFF, s.env.FAMILY], [
    '${{ needs.plan.outputs.ota }}', '${{ needs.plan.outputs.family_ota }}',
  ]);
  assert.match(s.run, /\[ "\$STAFF" != true \] \|\| dispatch '\{"ref":"develop","inputs":\{"action":"ota-update","branch":"preview"\}\}'/);
  assert.match(s.run, /\[ "\$FAMILY" != true \] \|\| dispatch '\{"ref":"develop","inputs":\{"action":"ota-update","app":"family"\}\}'/);
  assert.doesNotMatch(s.run, /production|profile|force_ota/);
});
