import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { run } from './cli.ts';
import { aFacts, HEAD } from './testing/facts.builder.ts';

/** The gathered files the workflow writes, as gh returns them. */
function gathered(over: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'automerge-'));
  const facts = aFacts();
  const status = { state: 'pending', statuses: facts.statuses };
  const files = { ...facts, status, ...over };
  for (const [name, value] of Object.entries(files))
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(value));
  return dir;
}

test('a mergeable PR writes the subject, the scrubbed body and action=merge', () => {
  const dir = gathered();
  assert.deepEqual(run(dir), ['action=merge', `sha=${HEAD}`, 'reason=every condition holds']);
  assert.equal(readFileSync(join(dir, 'subject.txt'), 'utf8'), 'refactor(shared): cut shared from db (#7)');
  assert.equal(readFileSync(join(dir, 'body.txt'), 'utf8'), 'Summary');
});

test('a stale lockfile PR writes the comment', () => {
  const compare = { base_commit: { sha: 'd'.repeat(40) }, merge_base_commit: { sha: 'b'.repeat(40) } };
  const dir = gathered({ compare, files: [{ filename: 'pnpm-lock.yaml' }] });
  assert.equal(run(dir)[0], 'action=comment');
  assert.match(readFileSync(join(dir, 'comment.txt'), 'utf8'), /needs update from develop/);
});

test('gh output of the wrong shape fails loudly instead of merging', () => {
  assert.throws(() => run(gathered({ pr: { number: 'x' } })));
  assert.throws(() => run(gathered({ checks: [{ name: 'check' }] })));
});
