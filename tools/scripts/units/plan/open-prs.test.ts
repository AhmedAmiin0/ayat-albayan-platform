import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openPrDirs, readOpenPrs } from './open-prs.ts';

test('openPrDirs maps each folder an open PR touches to its PR numbers', () => {
  const prs = [
    { number: 7, files: ['apps/web/src/a/x.ts', 'apps/web/src/b/y.ts'] },
    { number: 9, files: ['apps/web/src/a/z.ts'] },
  ];
  assert.deepEqual(Object.fromEntries(openPrDirs(prs)), {
    'apps/web/src/a': [7, 9],
    'apps/web/src/b': [7],
  });
});

const FILES: Record<string, string> = {
  7: 'apps/web/src/a/x.ts\napps/web/src/b/y.ts\n',
  9: 'apps/web/src/a/z.ts\n',
};

test('readOpenPrs lists the open PRs and their files over REST (gh api), paginated', () => {
  const calls: string[][] = [];
  const run = (args: readonly string[]): string => {
    calls.push([...args]);
    const pr = /pulls\/(\d+)\/files/.exec(args.join(' '))?.[1];
    return pr === undefined ? '7\n9\n' : (FILES[pr] ?? '');
  };
  assert.deepEqual(readOpenPrs(run), [
    { number: 7, files: ['apps/web/src/a/x.ts', 'apps/web/src/b/y.ts'] },
    { number: 9, files: ['apps/web/src/a/z.ts'] },
  ]);
  assert.ok(calls.every((a) => a[0] === 'api' && a.includes('--paginate')));
  assert.ok(calls.every((a) => !a.includes('pr') && !a.includes('graphql')));
});

test('readOpenPrs refuses output that is not a PR number list', () => {
  assert.throws(() => readOpenPrs(() => 'seven\n'));
});
