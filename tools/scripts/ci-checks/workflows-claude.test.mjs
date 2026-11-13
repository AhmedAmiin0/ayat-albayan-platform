// Guard for the automatic Claude review (owner 2026-11-13): the repo is PUBLIC (docs/09 «GitHub Actions»).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const file = fileURLToPath(new URL('../../../.github/workflows/claude-code-review.yml', import.meta.url));
const w = parse(readFileSync(file, 'utf8'));

test('claude-code-review: pull_request only, skips forks and drafts, writes only PR comments', () => {
  assert.deepEqual(Object.keys(w.on), ['pull_request']);
  const job = w.jobs['claude-review'];
  assert.match(job.if, /head\.repo\.full_name == github\.repository/);
  assert.match(job.if, /!github\.event\.pull_request\.draft/);
  assert.equal(job.environment, undefined);
  assert.deepEqual(job.permissions, {
    contents: 'read', 'pull-requests': 'write', issues: 'read', 'id-token': 'write',
  });
});
