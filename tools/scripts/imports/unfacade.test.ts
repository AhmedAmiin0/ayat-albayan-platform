import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { app, repo } from './unfacade/fixture.test-util.ts';

const CLI = fileURLToPath(new URL('./unfacade.ts', import.meta.url));
const tree = (): string =>
  repo({
    ...app('api', { '@ab/shared': 'workspace:*' }),
    'apps/api/src/a.ts': "import { toE164 } from '@ab/shared';\n",
    'apps/api/src/b.ts': "import * as s from '@ab/shared';\n",
  });
const run = (root: string, ...args: string[]): string =>
  execFileSync('node', [CLI, '--root', root, ...args], { encoding: 'utf8' });

test('--dry-run prints the counts and the three lists', () => {
  const out = run(tree(), '--workspace', 'apps/api', '--dry-run');
  assert.match(out, /apps\/api: 1 to change, 0 over cap, 1 manual/);
  assert.match(out, /to change:\n {2}apps\/api\/src\/a\.ts/);
  assert.match(out, /manual:\n {2}apps\/api\/src\/b\.ts/);
});

test('--write applies, names the added dependency and reminds about the lockfile', () => {
  const root = tree();
  const out = run(root, '--workspace', 'apps/api', '--write');
  assert.match(out, /dependencies added: @ab\/core/);
  assert.match(out, /pnpm i --lockfile-only/);
  assert.match(readFileSync(posix.join(root, 'apps/api/src/a.ts'), 'utf8'), /'@ab\/core'/);
});

test('bad arguments exit 2 with the usage line', () => {
  const r = spawnSync('node', [CLI, '--workspace', 'apps/api', '--next', '0', '--write']);
  assert.equal(r.status, 2);
  assert.match(String(r.stderr), /usage: node tools\/scripts\/imports\/unfacade\.ts/);
  const both = spawnSync('node', [CLI, '--workspace', 'apps/api', '--write', '--dry-run']);
  assert.equal(both.status, 2);
});
