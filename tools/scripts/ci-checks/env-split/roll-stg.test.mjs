// deploy/stg's scripts against fakes (docs/09 «Staging»): roll.sh and rollback.sh touch only the
// ayat-albayan-stg project; caddy-sites.sh only ever APPENDS the two staging blocks, validates
// before it reloads and puts the Caddyfile back byte-for-byte when Caddy refuses.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { at, root, run } from '../roll-fake.mjs';

const STG = { from: 'deploy/stg', project: 'ayat-albayan-stg' };
const P = 'compose -p ayat-albayan-stg';

test('roll.sh: one build, both up, each healthy, /health on 3120, this project\'s images pruned only', () => {
  const r = run('roll.sh', STG);
  assert.equal(r.code, 0, r.out);
  const order = [`${P} build ayat-api`, `${P} up -d --remove-orphans`, 'inspect', 'curl', 'image prune'];
  const idx = order.map((o) => at(r.log, o));
  assert.ok(idx.every((i, n) => i >= 0 && (n === 0 || i > idx[n - 1])), r.log.join('\n'));
  assert.match(r.log[at(r.log, 'curl')], /http:\/\/127\.0\.0\.1:3120\/health/);
  assert.match(r.log[at(r.log, 'image prune')], /--filter label=com\.docker\.compose\.project=ayat-albayan-stg$/);
  assert.ok(r.log.every((l) => !l.startsWith('docker') || l.includes('ayat-albayan-stg') || l.startsWith('docker inspect')), r.log.join('\n'));
});

test('roll.sh --env-only: no build, every container recreated; an unhealthy sandbox only warns', () => {
  const r = run('roll.sh', { ...STG, args: ['--env-only'], fail: ['id-ayat-pdf'] });
  assert.equal(r.code, 0, r.out);
  assert.ok(at(r.log, 'build') < 0);
  assert.ok(at(r.log, `${P} up -d --force-recreate --remove-orphans`) >= 0);
  assert.match(r.out, /::warning::ayat-pdf not healthy/);
});

test('roll.sh fails when the API never gets healthy (the workflow then runs rollback.sh)', () => {
  const r = run('roll.sh', { ...STG, fail: ['id-ayat-api'] });
  assert.notEqual(r.code, 0);
  assert.match(r.out, /::error::ayat-api did not become healthy/);
});

test('rollback.sh: src.old and the previous files back, then the previous roll.sh; none = refuses', () => {
  const r = run('rollback.sh', { ...STG, files: { 'src.old/marker': 'old', 'roll.sh.old': '#!/bin/sh\necho "old roll" >> "$FAKE/log"\n' } });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.log, ['old roll']);
  assert.ok(r.has('src.bad') && r.text('src/marker') === 'old' && !r.has('src.old'));
  const none = run('rollback.sh', STG);
  assert.equal(none.code, 1);
  assert.match(none.out, /nothing to roll back to/);
  assert.deepEqual(none.log, []);
});

const CRM = 'crm.ayatalbayan.com {\n\treverse_proxy 127.0.0.1:3000\n}\n\napp.ayatalbayan.com {\n\troot * /opt/ayat-albayan-staging/web\n}\n';

/** caddy-sites.sh on a scratch Caddyfile, fake caddy / systemctl; `fail`: that one exits 1. */
function caddy(start, fail = '') {
  const dir = mkdtempSync(join(tmpdir(), 'caddy-'));
  try {
    const file = join(dir, 'Caddyfile');
    writeFileSync(file, start);
    mkdirSync(join(dir, 'bin'));
    for (const b of ['caddy', 'systemctl']) {
      writeFileSync(join(dir, 'bin', b), `#!/bin/sh\necho "${b} $*" >> "${dir}/log"\n[ "${b}" != "${fail}" ]\n`);
      chmodSync(join(dir, 'bin', b), 0o755);
    }
    const env = { ...process.env, CADDYFILE: file, PATH: `${join(dir, 'bin')}:${process.env.PATH}` };
    let code = 0;
    let out = '';
    try {
      out = execFileSync('sh', [root('deploy/stg/caddy-sites.sh')], { env, stdio: 'pipe' }).toString();
    } catch (e) {
      [code, out] = [e.status, `${e.stdout}${e.stderr}`];
    }
    const log = existsSync(join(dir, 'log')) ? readFileSync(join(dir, 'log'), 'utf8').trim().split('\n') : [];
    const backups = readdirSync(dir).filter((f) => f.startsWith('Caddyfile.bak-'));
    return { code, out, log, after: readFileSync(file, 'utf8'), backups };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('caddy-sites.sh appends both blocks after the untouched ones, validates, then reloads; a second run does nothing', () => {
  const r = caddy(CRM);
  assert.equal(r.code, 0, r.out);
  assert.ok(r.after.startsWith(CRM), 'existing blocks byte-for-byte, first');
  assert.match(r.after, /\nstaging-app\.ayatalbayan\.com \{\n\troot \* \/opt\/ayat-albayan-stg\/web\n[\s\S]*try_files \{path\} \/index\.html/);
  assert.match(r.after, /\nstaging-api\.ayatalbayan\.com \{\n[\s\S]*reverse_proxy 127\.0\.0\.1:3120\n\}/);
  assert.equal(r.backups.length, 1);
  assert.match(r.log[0], /^caddy validate --config .*Caddyfile --adapter caddyfile$/);
  assert.equal(r.log[1], 'systemctl reload caddy');
  const again = caddy(r.after);
  assert.deepEqual([again.code, again.log, again.after, again.backups], [0, [], r.after, []]);
});

test('caddy-sites.sh: a refused validate or reload restores the file exactly; one block alone stops it', () => {
  for (const fail of ['caddy', 'systemctl']) {
    const r = caddy(CRM, fail);
    assert.equal(r.code, 1, fail);
    assert.equal(r.after, CRM, fail);
    assert.match(r.out, /restored from/);
  }
  assert.ok(!caddy(CRM, 'caddy').log.includes('systemctl reload caddy'), 'never a reload after a refused validate');
  const half = caddy(`${CRM}\nstaging-api.ayatalbayan.com {\n}\n`);
  assert.equal(half.code, 1);
  assert.deepEqual(half.log, []);
});
