// mobile.yml builder github: the Android build runs `eas build --local` on the GitHub runner
// (Expo's free cloud builds can run out for the month). Same profile, EAS environment and remote
// keystore; the file is the run's artifact, tagged like a cloud build, and the OTA guard sees it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (f) => readFileSync(fileURLToPath(new URL(`../../../${f}`, import.meta.url)), 'utf8');
const mobile = parse(read('.github/workflows/mobile.yml'));
const sh = read('tools/scripts/ci-checks/eas-local-build.sh');
const steps = mobile.jobs.build.steps;
const byId = (id) => steps.find((s) => s.id === id);
const GITHUB = "${{ inputs.builder == 'github' }}";
const PROFILE =
  "${{ inputs.app == 'family' && (inputs.profile == 'production' && 'production' || 'preview')" +
  " || inputs.profile || 'preview' }}";

test('the builder input: expo by default (today\'s cloud build), github by hand', () => {
  const input = mobile.on.workflow_dispatch.inputs.builder;
  assert.deepEqual([input.type, input.options, input.default], ['choice', ['expo', 'github'], 'expo']);
  assert.equal(byId('eas').if, "${{ inputs.builder != 'github' }}");
});

test('a runner build keeps develop only, forcesRTL, the install, eas init and the fingerprint', () => {
  const names = steps.map((s) => s.name ?? s.run ?? s.uses);
  const runner = steps.indexOf(byId('runner'));
  for (const name of ['Develop only', 'Never re-add forcesRTL', 'pnpm i --frozen-lockfile',
    'Link the family EAS project (eas init)', 'Family runtime (fingerprint)']) {
    const at = names.indexOf(name);
    assert.ok(at >= 0 && at < runner, name);
    assert.doesNotMatch(steps[at].if ?? '', /builder/, `${name} runs for both builders`);
  }
});

test('Java 17 (temurin) and the runner\'s Android SDK come before the build', () => {
  const java = steps.find((s) => s.uses?.startsWith('actions/setup-java@'));
  assert.deepEqual([java.if, java.with], [GITHUB, { distribution: 'temurin', 'java-version': '17' }]);
  const sdk = steps.find((s) => s.name === "Android SDK (the runner's)");
  assert.match(sdk.run, /test -d "\$\{ANDROID_HOME:-\}"/);
  assert.ok(steps.indexOf(sdk) < steps.indexOf(byId('runner')));
});

test('Gradle gets room on the runner: the template\'s 512 MB metaspace hung the release lint', () => {
  const gradle = steps.find((s) => s.name === 'Gradle memory for the runner build');
  assert.equal(gradle.if, GITHUB);
  assert.match(gradle.run, /org\.gradle\.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2g /);
  assert.match(gradle.run, /kotlin\.daemon\.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1g'/);
  assert.match(gradle.run, /\} >> ~\/\.gradle\/gradle\.properties$/m);
  assert.ok(steps.indexOf(gradle) < steps.indexOf(byId('runner')));
  const timeout = "${{ inputs.builder == 'github' && 120 || 60 }}";
  assert.equal(mobile.jobs.build['timeout-minutes'], timeout);
});

test('the runner step: same profile, token, folder and pinned CLI; eas build --local to RUNNER_TEMP', () => {
  const runner = byId('runner');
  assert.equal(runner.if, GITHUB);
  assert.equal(runner['working-directory'], '${{ env.APP_DIR }}');
  assert.deepEqual(runner.env, {
    EXPO_TOKEN: '${{ secrets.EXPO_TOKEN }}',
    APP: "${{ inputs.app || 'staff' }}",
    PROFILE,
    RUN_NUMBER: '${{ github.run_number }}',
  });
  assert.equal(runner.run, 'bash ../../tools/scripts/ci-checks/eas-local-build.sh');
  assert.match(sh, /"\$EAS_CLI" build --platform android --profile "\$PROFILE" --local --non-interactive --output "\$out"/);
  assert.match(sh, /out="\$RUNNER_TEMP\/\$APP-\$PROFILE\.\$ext"/);
});

test('the EAS environment is pulled to a private file, loaded in-process, never printed', () => {
  assert.match(sh, /env:pull --environment "\$environment" --path "\$envdir\/\.env" --non-interactive > \/dev\/null/);
  assert.match(sh, /chmod 700 "\$envdir"/);
  assert.doesNotMatch(sh, />> "\$GITHUB_ENV"/);
  assert.doesNotMatch(sh, /cat "\$envdir|echo "\$value"|set -x/);
  assert.match(sh, /::add-mask::\$value/);
  const cleanup = steps.find((s) => s.name === 'Remove the pulled EAS environment');
  assert.equal(cleanup.if, "${{ always() && inputs.builder == 'github' }}");
  assert.match(cleanup.run, /rm -rf "\$RUNNER_TEMP\/eas-env"/);
});

test('the family store build is checked: production API and a real Firebase file', () => {
  assert.match(sh, /"\$APP\/\$PROFILE" = family\/production/);
  assert.match(sh, /"\$\{EXPO_PUBLIC_API_URL:-\}" = https:\/\/api\.ayatalbayan\.com/);
  assert.match(sh, /jq -e \.project_info\.project_id "\$GOOGLE_SERVICES_JSON"/);
});

test('the uploaded file is the built file: android-<app>-<profile>-<run>, 30 days, not recompressed', () => {
  const upload = byId('upload');
  assert.equal(upload.uses, 'actions/upload-artifact@v4');
  assert.deepEqual(upload.with, {
    name: '${{ steps.runner.outputs.artifact }}',
    path: '${{ steps.runner.outputs.file }}',
    'retention-days': 30,
    'compression-level': 0,
    'if-no-files-found': 'error',
  });
  assert.match(sh, /echo "artifact=android-\$APP-\$PROFILE-\$RUN_NUMBER"/);
  assert.match(sh, /sum=\$\(sha256sum "\$out"/);
  assert.match(sh, /build:version:get --platform android --profile "\$PROFILE"/);
  assert.match(sh, /versionCode \\`\$\{code:-unknown\}\\`.*>> "\$GITHUB_STEP_SUMMARY"/s);
});

test('the release job tags a runner build too, linking its artifact and sha256', () => {
  assert.deepEqual(mobile.jobs.build.outputs, {
    eas_url: '${{ steps.eas.outputs.url }}',
    artifact_url: '${{ steps.upload.outputs.artifact-url }}',
    sha256: '${{ steps.runner.outputs.sha256 }}',
  });
  for (const kind of ['apk', 'aab']) {
    const tag = mobile.jobs.release.steps.find((s) => s.env?.KIND === kind);
    assert.equal(tag.env.ARTIFACT_URL, '${{ needs.build.outputs.artifact_url }}', kind);
    assert.equal(tag.env.SHA256, '${{ needs.build.outputs.sha256 }}', kind);
  }
});

test('the OTA guard compares with the newest of the EAS build and the runner build', () => {
  const guard = mobile.jobs.ota.steps.find((s) => s.name?.startsWith('Native-change guard'));
  assert.match(guard.run, /last=\$\(node tools\/scripts\/ci-checks\/native\/last-build\.mjs "\$eas" "\$JUST_BUILT"\)/);
  assert.equal(guard.env.APP, "${{ inputs.app || 'staff' }}");
  assert.match(guard.env.JUST_BUILT, /inputs\.action == 'both' && inputs\.builder == 'github'/);
  const checkout = mobile.jobs.ota.steps.find((s) => s.uses?.startsWith('actions/checkout@'));
  assert.equal(checkout.with['fetch-depth'], 0, 'the tags come with the full history');
});
