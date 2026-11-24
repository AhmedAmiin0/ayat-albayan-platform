// eas-local-build.sh loads the EAS environment that `eas env:pull` writes. The CLI joins the lines
// without a final newline, and GOOGLE_SERVICES_JSON sorts last: that line must load too.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./eas-local-build.sh', import.meta.url));
const API = 'EXPO_PUBLIC_API_URL=https://api.ayatalbayan.com';

// Stands in for `npx eas-cli`: env:pull copies the prepared .env, build writes the bundle.
const NPX = `#!/usr/bin/env bash
after() { local key=$1; shift; while [ $# -gt 1 ]; do [ "$1" = "$key" ] && echo "$2"; shift; done; }
case " $* " in
  *" env:pull "*) cp "$PULLED" "$(after --path "$@")" ;;
  *" build:version:get "*) echo '{"versionCode":7}' ;;
  *" build "*) echo bundle > "$(after --output "$@")" ;;
esac
`;

function runBuild(pulled) {
  const dir = mkdtempSync(join(tmpdir(), 'eas-local-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'npx'), NPX);
  chmodSync(join(bin, 'npx'), 0o755);
  const firebase = join(dir, 'google-services.json');
  writeFileSync(firebase, JSON.stringify({ project_info: { project_id: 'family' } }));
  const eas = { build: { production: { environment: 'production' } } };
  writeFileSync(join(dir, 'eas.json'), JSON.stringify(eas));
  writeFileSync(join(dir, 'pulled.env'), pulled(firebase));
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    EXPO_TOKEN: 'token',
    EAS_CLI: 'eas-cli',
    APP: 'family',
    PROFILE: 'production',
    RUN_NUMBER: '1',
    RUNNER_TEMP: dir,
    GITHUB_OUTPUT: join(dir, 'outputs'),
    GITHUB_STEP_SUMMARY: join(dir, 'summary'),
    PULLED: join(dir, 'pulled.env'),
  };
  return spawnSync('bash', [script], { cwd: dir, env, encoding: 'utf8' });
}

test('the last variable loads although the pulled .env has no final newline', () => {
  const run = runBuild((firebase) =>
    `# Environment: production\n\n${API}\nGOOGLE_SERVICES_JSON=${firebase}`);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /loaded: EXPO_PUBLIC_API_URL GOOGLE_SERVICES_JSON$/m);
  assert.match(run.stdout, /Checked: production API and the Firebase file/);
});

test('a secret Firebase file, commented out by the CLI, still stops the store build', () => {
  const run = runBuild(() => `# Environment: production\n\n${API}\n# GOOGLE_SERVICES_JSON=*****`);
  assert.notEqual(run.status, 0);
  assert.match(run.stdout, /::error::GOOGLE_SERVICES_JSON was not pulled as a Firebase file/);
});
