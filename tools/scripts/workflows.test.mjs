// Guards for .github/workflows: the repo is PUBLIC, so these must stay true (docs/09 «GitHub Actions»).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const dir = root('.github/workflows');
const workflows = readdirSync(dir).filter((f) => f.endsWith('.yml')).map((f) => ({
  file: f,
  doc: parse(readFileSync(`${dir}/${f}`, 'utf8')),
}));
const docs = readFileSync(root('docs/09-deployment.md'), 'utf8');
const section = docs.slice(docs.indexOf('## GitHub Actions'));
const secretsIn = (x) => [...JSON.stringify(x).matchAll(/secrets\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]);
const jobsOf = (w) => Object.entries(w.doc.jobs ?? {});
/**
 * Server-only messaging values (docs/12 §13.13): set by hand, never by a workflow. Sending itself is
 * the admin's switch in the database (docs/23: the env fuse is gone), which no workflow can reach.
 */
const FLAGS = /\b(WA_PHONE_NUMBER_ID|WA_CHAT_PHONE_NUMBER_ID|WA_ALLOWED_RECIPIENTS)\b/;

test('every workflow parses and has jobs', () => {
  assert.ok(workflows.length >= 7);
  for (const w of workflows) assert.ok(Object.keys(w.doc.jobs ?? {}).length > 0, w.file);
});

test('no workflow uses pull_request_target', () => {
  for (const w of workflows) assert.ok(!('pull_request_target' in w.doc.on), w.file);
  assert.ok(!/pull_request_target/.test(JSON.stringify(workflows.map((w) => w.doc))));
});

test('every workflow has top-level permissions of contents: read only', () => {
  for (const w of workflows) assert.deepEqual(w.doc.permissions, { contents: 'read' }, w.file);
});

test('the flag guard catches every server-only messaging switch, as whole words only', () => {
  for (const k of ['WA_PHONE_NUMBER_ID', 'WA_CHAT_PHONE_NUMBER_ID', 'WA_ALLOWED_RECIPIENTS']) {
    assert.ok(FLAGS.test(`echo "${k}=x" >> .env`), k);
  }
  assert.ok(!FLAGS.test('WA_ALLOWED_RECIPIENTS_LIST WA_TEMPLATE_SYNC WA_CHAT_WABA_ID'));
});

/** Where a workflow sets a flag: workflow, job and step env (keys AND values), run, with, if. */
function flagHits(w) {
  const steps = [{ env: w.doc.env }, ...jobsOf(w).flatMap(([, j]) => [{ env: j.env }, ...(j.steps ?? [])])];
  const hits = [];
  for (const s of steps) {
    if (FLAGS.test(Object.keys(s.env ?? {}).join(' '))) hits.push(`${w.file}: env key`);
    if (FLAGS.test(Object.values(s.env ?? {}).map(String).join(' '))) hits.push(`${w.file}: env value`);
    if (FLAGS.test(s.run ?? '')) hits.push(`${w.file}: run script`);
    if (FLAGS.test(JSON.stringify(s.with ?? {}))) hits.push(`${w.file}: with`);
    if (s.if && FLAGS.test(String(s.if))) hits.push(`${w.file}: if`);
  }
  return hits;
}

test('no workflow sets or reads WA_PHONE_NUMBER_ID, WA_CHAT_PHONE_NUMBER_ID or WA_ALLOWED_RECIPIENTS', () => {
  for (const w of workflows) assert.deepEqual(flagHits(w), [], w.file);
});

test('the flag guard also reads workflow-level env and env values (review C, S3)', () => {
  const doc = (env) => ({ file: 'x.yml', doc: { env, jobs: { build: { steps: [{ run: 'pnpm build' }] } } } });
  assert.deepEqual(flagHits(doc({ WA_PHONE_NUMBER_ID: '1' })), ['x.yml: env key']);
  assert.deepEqual(flagHits(doc({ LIST: '${{ vars.WA_ALLOWED_RECIPIENTS }}' })), ['x.yml: env value']);
  assert.deepEqual(flagHits(doc({ NODE_ENV: 'test' })), []);
  const reads = { file: 'deploy-staging.yml', doc: { jobs: { d: { steps: [{ if: "${{ vars.WA_ALLOWED_RECIPIENTS != '' }}" }] } } } };
  assert.deepEqual(flagHits(reads), ['deploy-staging.yml: if']);
});

test('deploying, migrating and mobile workflows never run on pull_request from strangers', () => {
  const triggers = (f) => Object.keys(workflows.find((w) => w.file === f).doc.on).sort();
  assert.deepEqual(triggers('deploy-staging.yml'), ['workflow_dispatch', 'workflow_run']);
  assert.deepEqual(triggers('mobile.yml'), ['workflow_dispatch']);
  assert.deepEqual(triggers('db-migrate.yml'), ['pull_request', 'workflow_call', 'workflow_dispatch']);
  assert.deepEqual(triggers('claude-tasks.yml'), ['issue_comment', 'pull_request_review_comment', 'workflow_dispatch']);
});

test('secrets are only used in jobs that bind an environment (or call a workflow that does)', () => {
  const allowed = { 'claude-tasks.yml': ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'] };
  for (const w of workflows) {
    const top = secretsIn({ env: w.doc.env });
    assert.deepEqual(top.filter((n) => n !== 'TURBO_TOKEN'), [], `${w.file}: workflow-level secret`);
    for (const [name, j] of jobsOf(w)) {
      const used = secretsIn(j);
      if (j.environment || j.uses || used.length === 0) continue;
      assert.deepEqual(used.filter((n) => !(allowed[w.file] ?? []).includes(n)), [], `${w.file}/${name}`);
    }
  }
});

test('db apply needs staging-db, mobile jobs need mobile, claude-tasks binds no environment', () => {
  const by = (f) => workflows.find((w) => w.file === f).doc.jobs;
  assert.equal(by('db-migrate.yml').apply.environment, 'staging-db');
  assert.equal(by('mobile.yml').build.environment, 'mobile');
  assert.equal(by('mobile.yml').ota.environment, 'mobile');
  for (const j of Object.values(by('claude-tasks.yml'))) assert.equal(j.environment, undefined);
  assert.equal(by('deploy-staging.yml').migrate.uses, './.github/workflows/db-migrate.yml');
});

test('third-party actions are pinned to a full commit SHA', () => {
  for (const w of workflows) {
    for (const [, j] of jobsOf(w)) for (const s of j.steps ?? []) {
      if (!s.uses || /^(actions|pnpm)\//.test(s.uses)) continue;
      assert.match(s.uses, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `${w.file}: ${s.uses}`);
    }
  }
});

test('every secret and environment a workflow names is in the docs «GitHub Actions» table', () => {
  assert.ok(section.length > 500, 'docs/09-deployment.md needs a «## GitHub Actions» section');
  const names = new Set(workflows.flatMap((w) => secretsIn(w.doc)));
  names.delete('GITHUB_TOKEN');
  assert.ok(names.size > 10);
  for (const n of names) assert.ok(section.includes(`\`${n}\``), `secret ${n} missing from the docs table`);
  const envs = new Set(workflows.flatMap((w) => jobsOf(w).map(([, j]) => j.environment).filter(Boolean)));
  for (const e of envs) assert.ok(section.includes(`\`${e}\``), `environment ${e} missing from the docs`);
});
