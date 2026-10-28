// A scratch /opt/ayat-albayan-staging for roll.test.mjs: deploy/staging's scripts with a fake `docker` and `curl`
// that log every call and succeed (a container is «up» once `up -d` named it; `inspect` reports healthy).
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = (p) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
export const ROLE_FILE = 'src/apps/api/src/config/role/app-role.ts';
const P = 'ayat-albayan-staging';

const DOCKER = `#!/bin/sh
echo "docker $*" >> "$FAKE/log"
for bad in $FAKE_FAIL; do case "$*" in *"$bad"*) exit 1 ;; esac; done
last=""; for a in "$@"; do last=$a; done
case "$*" in
  "ps -aq --filter label=com.docker.compose.project=${P} --filter label=com.docker.compose.service="*)
    svc=\${last##*=}; [ ! -f "$FAKE/up-$svc" ] || echo "id-$svc" ;;
  "compose -p ${P} ps -q "*) [ ! -f "$FAKE/up-$last" ] || echo "id-$last" ;;
  "compose -p ${P} up -d --no-deps"*) touch "$FAKE/up-$last" ;;
  "compose -p ${P} up -d") touch "$FAKE/up-ayat-api" ;;
  "inspect "*) echo healthy ;;
esac
exit 0
`;

/**
 * Runs `script` (roll.sh or rollback.sh) in a scratch folder. `up`: services already running; `files`: extra
 * files (path → text); `fail`: substrings of docker calls that fail. Returns the exit code, output, call log
 * and which files exist afterwards.
 */
export function run(script, { args = [], up = [], files = {}, fail = [], roles = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'roll-'));
  try {
    for (const f of ['roll.sh', 'rollback.sh']) copyFileSync(root(`deploy/staging/${f}`), join(dir, f));
    mkdirSync(join(dir, 'lb'));
    writeFileSync(join(dir, 'lb/Caddyfile'), ':8080 {}\n');
    if (roles) {
      mkdirSync(join(dir, 'src/apps/api/src/config/role'), { recursive: true });
      writeFileSync(join(dir, ROLE_FILE), '');
    }
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    const fake = join(dir, '.fake');
    mkdirSync(join(fake, 'bin'), { recursive: true });
    for (const s of up) writeFileSync(join(fake, `up-${s}`), '');
    writeFileSync(join(fake, 'bin/docker'), DOCKER);
    writeFileSync(join(fake, 'bin/curl'), '#!/bin/sh\necho "curl $*" >> "$FAKE/log"\n');
    for (const b of ['docker', 'curl']) chmodSync(join(fake, 'bin', b), 0o755);
    const env = { ...process.env, FAKE: fake, FAKE_FAIL: fail.join(' '), PATH: `${join(fake, 'bin')}:${process.env.PATH}` };
    let out = '';
    let code = 0;
    try {
      out = execFileSync('sh', [join(dir, script), ...args], { env, stdio: 'pipe' }).toString();
    } catch (e) {
      code = e.status;
      out = `${e.stdout}${e.stderr}`;
    }
    const log = existsSync(join(fake, 'log')) ? readFileSync(join(fake, 'log'), 'utf8').trim().split('\n') : [];
    // A snapshot: the folder is gone once this returns.
    const after = new Map(
      readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => !join(e.parentPath, e.name).startsWith(fake))
        .map((e) => [relative(dir, join(e.parentPath, e.name)), e.isFile() ? readFileSync(join(e.parentPath, e.name), 'utf8') : '']),
    );
    const has = (p) => after.has(p);
    const text = (p) => after.get(p) ?? null;
    return { code, out, log, has, text };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Index of the first logged call containing `part` (-1 when none). */
export const at = (log, part) => log.findIndex((l) => l.includes(part));
