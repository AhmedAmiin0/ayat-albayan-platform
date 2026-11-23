import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { changedSince, commitOf, factsOf, verdict } from './api-changed.ts';

/** A git workspace with api and staff-web; commits `files` in turn, returns [root, shas]. */
function repo(files: string[]): [string, string[]] {
  const root = mkdtempSync(join(tmpdir(), 'api-changed-'));
  const git = (...args: string[]): string =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  git('init', '-q');
  const pkgs: [string, string][] = [['apps/api', 'api'], ['apps/staff-web', 'staff-web']];
  for (const [dir, name] of pkgs) {
    mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, dir, 'package.json'), JSON.stringify({ name }));
  }
  const shas = files.map((file) => {
    mkdirSync(join(root, file, '..'), { recursive: true });
    writeFileSync(join(root, file), file);
    git('add', '.');
    git('commit', '-qm', file);
    return git('rev-parse', 'HEAD');
  });
  return [root, shas];
}

test('only a full lowercase sha counts as the last deploy', () => {
  assert.equal(commitOf(`${'a'.repeat(40)}\n`), 'a'.repeat(40));
  for (const text of ['', 'abc123', 'A'.repeat(40), `${'a'.repeat(40)}0`, 'HEAD'])
    assert.equal(commitOf(text), null, text);
});

test('the diff since the last deploy; a commit git does not know = null', () => {
  const [root, [first]] = repo(['a.txt', 'b.txt']);
  assert.deepEqual(changedSince(root, String(first)), ['b.txt']);
  assert.equal(changedSince(root, 'f'.repeat(40)), null);
  assert.deepEqual(factsOf(root, ['']), { base: null, changed: null });
  assert.throws(() => factsOf(root, []));
});

test('verdict: the base when only the web app changed, empty when the API did or unknown', () => {
  const [root, [base, web]] = repo(['a.txt', 'apps/staff-web/src/a.tsx', 'apps/api/src/b.ts']);
  const output = (args: string[]): string => verdict(root, args)[0];
  assert.equal(output([String(base)]), 'api_base=', 'the api changed after the web app');
  assert.match(verdict(root, [String(base)])[1], /build \(API inputs changed: apps\/api\/src\/b/);
  const [webRoot, [webBase]] = repo(['a.txt', 'apps/staff-web/src/a.tsx']);
  assert.equal(verdict(webRoot, [String(webBase)])[0], `api_base=${String(webBase)}`);
  assert.equal(output(['not-a-sha']), 'api_base=');
  assert.equal(output([String(web)]).startsWith('api_base='), true);
});
