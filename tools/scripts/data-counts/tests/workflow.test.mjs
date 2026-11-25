import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

const file = new URL('../../../../.github/workflows/data-counts.yml', import.meta.url);
const doc = parse(readFileSync(file, 'utf8'));
const job = doc.jobs.counts;
const stepsUsing = (text) => job.steps.filter((step) => JSON.stringify(step).includes(text));

test('workflow: dispatch only, with a domain and a sha', () => {
  assert.deepEqual(Object.keys(doc.on), ['workflow_dispatch']);
  assert.deepEqual(Object.keys(doc.on.workflow_dispatch.inputs), ['domain', 'sha']);
});

test('workflow: one job in the prod-readonly environment that can only read the repo', () => {
  assert.deepEqual(Object.keys(doc.jobs), ['counts']);
  assert.equal(job.environment, 'prod-readonly');
  assert.deepEqual(doc.permissions, { contents: 'read' });
  assert.deepEqual(job.permissions, { contents: 'read' });
});

test('workflow: the runner comes from develop and only the counts file comes from the sha', () => {
  assert.equal(job.steps[0].with.ref, 'develop');
  const reads = stepsUsing('git show').map((step) => step.run);
  assert.equal(reads.length, 1);
  assert.match(reads[0], /git show "\$SHA:tools\/scripts\/data-counts\/\$DOMAIN\.sql"/);
});

test('workflow: the secret reaches only the step that runs the runner', () => {
  const holders = stepsUsing('secrets.');
  assert.equal(holders.length, 1);
  assert.deepEqual(Object.keys(holders[0].env), ['PROD_READONLY_DATABASE_URL']);
  assert.match(holders[0].run, /^node tools\/scripts\/data-counts\/run\.mjs /);
});

test('workflow: inputs reach the shell through env, never inline', () => {
  const runs = job.steps.map((step) => step.run ?? '').join('\n');
  assert.doesNotMatch(runs, /\$\{\{/);
});
