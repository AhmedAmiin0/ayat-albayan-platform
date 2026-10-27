// roll.sh and the deploys that ship it (docs/09 «Two API copies + one worker»): never the new layout on code
// from before APP_ROLE (every container would run every job), and the first switch only hands over the port.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = (p) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
const rollPath = root('deploy/staging/roll.sh');
const roll = readFileSync(rollPath, 'utf8');
const workflow = readFileSync(root('.github/workflows/deploy-staging.yml'), 'utf8');
const local = readFileSync(root('tools/scripts/env/deploy-staging.sh'), 'utf8');
const ROLE_FILE = 'src/apps/api/src/config/role/app-role.ts';

/** Runs roll.sh in a scratch folder with a fake `docker` that logs its calls (and fails them). */
function run(args, withRoles) {
  const dir = mkdtempSync(join(tmpdir(), 'roll-'));
  try {
    copyFileSync(rollPath, join(dir, 'roll.sh'));
    if (withRoles) {
      mkdirSync(join(dir, 'src/apps/api/src/config/role'), { recursive: true });
      writeFileSync(join(dir, ROLE_FILE), '');
    }
    mkdirSync(join(dir, 'bin'));
    writeFileSync(
      join(dir, 'bin/docker'),
      `#!/bin/sh\necho "docker $*" >> "${join(dir, 'docker.log')}"\nexit 1\n`,
    );
    chmodSync(join(dir, 'bin/docker'), 0o755);
    const env = { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}` };
    let out = '';
    let code = 0;
    try {
      out = execFileSync('sh', [join(dir, 'roll.sh'), ...args], { env, stdio: 'pipe' }).toString();
    } catch (e) {
      code = e.status;
      out = `${e.stdout}${e.stderr}`;
    }
    let docker = '';
    try {
      docker = readFileSync(join(dir, 'docker.log'), 'utf8');
    } catch {
      docker = '';
    }
    return { code, out, docker };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('src from before APP_ROLE: refused before any docker call, build and --env-only alike', () => {
  for (const args of [[], ['--env-only']]) {
    const r = run(args, false);
    assert.equal(r.code, 1);
    assert.match(
      r.out,
      /src predates APP_ROLE: restore docker-compose\.yml\.old \(single container\)/,
    );
    assert.equal(r.docker, '', 'no docker command ran');
  }
});

test('src with the roles: the guard lets it through to the build', () => {
  const r = run([], true);
  assert.doesNotMatch(r.out, /predates APP_ROLE/);
  assert.match(r.docker, /^docker compose -p ayat-albayan-staging build ayat-worker/);
});

test('first switch: the LB image is pulled before the old container stops (only the port changes hands)', () => {
  const pull = roll.indexOf('dc pull ayat-lb');
  const stop = roll.indexOf('docker stop -t 30 $legacy');
  assert.ok(pull > 0 && pull < stop);
  // The worker (the one job runner) starts only once the old container (which ran every job) is gone.
  const legacyBranch = roll.slice(roll.indexOf('if [ -n "$legacy" ]'), roll.indexOf('\nelse\n'));
  assert.ok(
    legacyBranch.indexOf('roll ayat-worker') > legacyBranch.indexOf('docker stop -t 30 $legacy'),
  );
  assert.ok(roll.indexOf(ROLE_FILE) < roll.indexOf('dc build ayat-worker'));
});

test('both deploys swap the compose files in the same command as the code; the rollback stays on roll/health', () => {
  for (const text of [workflow, local]) {
    for (const f of ['docker-compose.yml', 'roll.sh', 'lb/Caddyfile']) {
      const name = f.replace('.', '\\.');
      assert.match(
        text,
        new RegExp(`deploy/staging/${name}"? "[^"]*/${name}\\.new"`),
        `${f} goes up as ${f}.new`,
      );
    }
    const swap = text.split('\n').findIndex((l) => l.includes('mv src.new src'));
    const block = text
      .split('\n')
      .slice(swap, swap + 3)
      .join('\n');
    assert.match(
      block,
      /mv docker-compose\.yml\.new docker-compose\.yml && mv roll\.sh\.new roll\.sh/,
    );
    assert.match(
      block,
      /cat lb\/Caddyfile\.new > lb\/Caddyfile/,
      'same inode: ayat-lb mounts the directory',
    );
  }
  assert.doesNotMatch(workflow, /steps\.ship\.outcome == 'failure'/);
});
