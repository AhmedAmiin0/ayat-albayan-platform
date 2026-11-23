import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { makeRepo } from '../../ci-checks/move-module/fixture.test-util.ts';
import { runGuard } from './run.ts';

const D = 'apps/w/src/a';
const unit = (name: string): Record<string, string> =>
  Object.fromEntries(
    [`${name}.tsx`, `${name}.x.test.tsx`, `${name}.y.test.tsx`].map((n) => [`${D}/${n}`, '']),
  );

const repo = (files: Record<string, string>): string => {
  const root = makeRepo(files);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  return root;
};

const guard = (root: string, argv: string[] = []): { code: number; out: string[] } => {
  const out: string[] = [];
  return { code: runGuard(argv, { root, log: (l) => out.push(l) }), out };
};

test('--write records the floating units; the same tree then passes', () => {
  const root = repo(unit('A'));
  assert.equal(guard(root, ['--write']).code, 0);
  const file = posix.join(root, 'refactor/guards/units.json');
  assert.equal(readFileSync(file, 'utf8'), `{\n  "${D}": 1\n}\n`);
  assert.equal(guard(root).code, 0);
});

test('a folder that gains a floating unit fails, naming it', () => {
  const root = repo({ ...unit('A'), ...unit('B'), 'refactor/guards/units.json': `{ "${D}": 1 }` });
  const { code, out } = guard(root);
  assert.equal(code, 1);
  assert.ok(out.some((l) => l.includes(`new: ${D}: 2 floating units (baseline 1)`)));
});

test('a fixed folder passes and is reported for pruning', () => {
  const root = repo({ [`${D}/A.tsx`]: '', 'refactor/guards/units.json': `{ "${D}": 1 }` });
  writeFileSync(posix.join(root, 'x'), '');
  const { code, out } = guard(root);
  assert.equal(code, 0);
  assert.ok(out.some((l) => l.startsWith('  fixed:')));
});

test('unknown arguments are refused', () => {
  assert.throws(() => guard(repo({}), ['--wrte']));
});
