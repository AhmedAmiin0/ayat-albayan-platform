import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bestRule, rulesOf, targetOf } from '../match.ts';

const move = (from: string, to: string) => ({ from, to, layer: 'staff-web' as const });

test('a folder move keeps the path below it', () => {
  const [rule] = rulesOf([move('apps/w/src/a/', 'apps/w/src/f/x/a/')]);
  assert.equal(targetOf(rule, 'apps/w/src/a/b/c.ts'), 'apps/w/src/f/x/a/b/c.ts');
  assert.equal(targetOf(rule, 'apps/w/src/ab/c.ts'), undefined);
});

test('a glob takes files of its own folder only, by stem', () => {
  const [rule] = rulesOf([move('apps/w/src/a/foo.*', 'apps/w/src/f/')]);
  assert.equal(targetOf(rule, 'apps/w/src/a/foo.service.ts'), 'apps/w/src/f/foo.service.ts');
  assert.equal(targetOf(rule, 'apps/w/src/a/sub/foo.ts'), undefined);
  assert.equal(targetOf(rule, 'apps/w/src/a/food.ts'), undefined);
});

test('a glob brings its tests/ and __snapshots__ companions', () => {
  const rules = rulesOf([move('apps/w/src/a/foo.*', 'apps/w/src/f/')]);
  const pick = (file: string) => targetOf(bestRule(rules, file)[0], file);
  assert.equal(pick('apps/w/src/a/tests/foo.test.ts'), 'apps/w/src/f/tests/foo.test.ts');
  assert.equal(
    pick('apps/w/src/a/tests/__snapshots__/foo.test.ts.snap'),
    'apps/w/src/f/tests/__snapshots__/foo.test.ts.snap',
  );
  assert.equal(pick('apps/w/src/a/tests/bar.test.ts'), undefined);
});

test('a file move keeps its name in a folder target and renames into a file target', () => {
  const [a, b] = rulesOf([
    move('apps/w/src/a/x.ts', 'apps/w/src/f/'),
    move('apps/w/src/a/y.ts', 'apps/w/src/f/z.ts'),
  ]);
  assert.equal(targetOf(a, 'apps/w/src/a/x.ts'), 'apps/w/src/f/x.ts');
  assert.equal(targetOf(b, 'apps/w/src/a/y.ts'), 'apps/w/src/f/z.ts');
});

test('the most specific rule wins: file, then glob, then the deepest folder', () => {
  const rules = rulesOf([
    move('apps/w/src/a/', 'apps/w/src/f/a/'),
    move('apps/w/src/a/b/', 'apps/w/src/g/b/'),
    move('apps/w/src/a/b/foo.*', 'apps/w/src/h/'),
    move('apps/w/src/a/b/foo.ts', 'apps/w/src/i/'),
  ]);
  const winner = (file: string) => bestRule(rules, file).map((r) => r.from);
  assert.deepEqual(winner('apps/w/src/a/c.ts'), ['apps/w/src/a/']);
  assert.deepEqual(winner('apps/w/src/a/b/c.ts'), ['apps/w/src/a/b/']);
  assert.deepEqual(winner('apps/w/src/a/b/foo.types.ts'), ['apps/w/src/a/b/foo.*']);
  assert.deepEqual(winner('apps/w/src/a/b/foo.ts'), ['apps/w/src/a/b/foo.ts']);
  assert.deepEqual(winner('apps/w/src/z.ts'), []);
});

test('an explicit tests/ folder beats a glob companion', () => {
  const rules = rulesOf([
    move('apps/w/src/a/foo.*', 'apps/w/src/f/'),
    move('apps/w/src/a/tests/', 'apps/w/src/g/tests/'),
  ]);
  assert.deepEqual(
    bestRule(rules, 'apps/w/src/a/tests/foo.test.ts').map((r) => r.from),
    ['apps/w/src/a/tests/'],
  );
});

test('two globs that both take a file tie', () => {
  const rules = rulesOf([
    move('apps/w/src/a/foo.*', 'apps/w/src/f/'),
    move('apps/w/src/a/foo.s*', 'apps/w/src/g/'),
  ]);
  assert.equal(bestRule(rules, 'apps/w/src/a/foo.service.ts').length, 2);
});
