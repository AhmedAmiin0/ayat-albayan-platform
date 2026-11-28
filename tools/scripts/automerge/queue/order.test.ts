import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { queue, queueIn } from './order.ts';

const pr = (number: number, ...labels: string[]) => ({
  number,
  labels: labels.map((name) => ({ name })),
});

test('priority PRs go first, the rest keep the order they were listed in', () => {
  const listed = [pr(9, 'auto-merge'), pr(8, 'auto-merge', 'priority'), pr(7), pr(5, 'priority')];
  assert.deepEqual(queue(listed), [8, 5, 9, 7]);
});

test('a PR listed by both labels is queued once, at its first place', () => {
  const listed = [
    pr(9, 'auto-merge'),
    pr(4, 'auto-merge', 'priority'),
    pr(4, 'auto-merge', 'priority'),
  ];
  assert.deepEqual(queue(listed), [4, 9]);
  assert.deepEqual(queue([]), []);
});

test('the gh listing is read with zod, and a wrong shape fails loudly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'queue-'));
  const file = join(dir, 'prs.json');
  writeFileSync(file, JSON.stringify([pr(3), pr(2, 'priority')]));
  assert.deepEqual(queueIn(file), [2, 3]);
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, JSON.stringify([{ number: 'x', labels: [] }]));
  assert.throws(() => queueIn(bad));
});
