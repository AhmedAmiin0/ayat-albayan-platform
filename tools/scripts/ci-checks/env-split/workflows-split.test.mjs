// Production / staging split (owner 2026-10-31, docs/09 «Production», «Staging»). Repo-level
// secrets hold PRODUCTION values and resolve in any job whose environment lacks the name, so every
// staging job reads only STG_* secrets and hard-codes its public values; production keeps its
// names and runs by hand only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = (p) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const text = (f) => readFileSync(root(`.github/workflows/${f}`), 'utf8');
const load = (f) => parse(text(f));
const secretsIn = (x) => [...JSON.stringify(x).matchAll(/secrets\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]);
const envsOf = (w) => Object.values(w.jobs).map((j) => j.environment).filter(Boolean);
const STG = 'gqkqbxxgqttfbbqoqedf';
const PROD = 'knxfwiimjcifwckhwbim';
const staging = load('deploy-staging.yml');
const production = load('deploy-production.yml');

test('deploy-staging: STG_* secrets only, the staging environment only, nothing of production', () => {
  assert.deepEqual([...new Set(secretsIn(staging))].filter((n) => !n.startsWith('STG_')), []);
  assert.deepEqual([...new Set(envsOf(staging))], ['staging']);
  const raw = text('deploy-staging.yml');
  // Production's ref, directory, port, OTA channel, release tags; repo vars may hold its values.
  for (const bad of [PROD, '/opt/ayat-albayan-staging', '3110', '"branch":"preview"', 'release-tag', 'deploy/staging/']) {
    assert.ok(!raw.includes(bad), bad);
  }
  assert.deepEqual([...raw.matchAll(/vars\.([A-Z_]+)/g)].map((m) => m[1]), ['STG_OTA_BASELINE_SHA']);
});

test('deploy-staging: automatic after ci, its own directory, hosts and project, migrates every run', () => {
  assert.deepEqual(Object.keys(staging.on).sort(), ['workflow_dispatch', 'workflow_run']);
  assert.deepEqual(staging.on.workflow_run, { workflows: ['ci'], types: ['completed'], branches: ['develop'] });
  const { deploy, migrate, ota, seed } = staging.jobs;
  assert.deepEqual(deploy.env, { DEST: '/opt/ayat-albayan-stg', SSH_HOST: '148.230.116.195', API_URL: 'https://staging-api.ayatalbayan.com' });
  const web = deploy.steps.find((s) => s.name?.startsWith('Build the web app')).env;
  assert.equal(web.VITE_API_URL, 'https://staging-api.ayatalbayan.com');
  assert.equal(web.VITE_SUPABASE_URL, `https://${STG}.supabase.co`);
  assert.deepEqual(migrate.with, { apply: true, target: 'staging', ref: '${{ github.event.workflow_run.head_sha || github.sha }}' });
  assert.equal(migrate.if, "${{ needs.preflight.outputs.ready == 'true' && !inputs.env_only }}");
  assert.match(JSON.stringify(deploy.steps), new RegExp(`config push --project-ref ${STG} --yes`));
  assert.ok(deploy.steps.some((s) => s.run === 'ssh target "sh -s" < deploy/stg/caddy-sites.sh'));
  assert.match(seed.if, /inputs\.seed_demo/);
  assert.match(seed.steps.at(-1).run, /^node tools\/scripts\/seed\/seed-demo\.mjs --allow-remote-staging$/);
  const dispatch = ota.steps.map((s) => s.run).join('\n');
  assert.match(dispatch, /"inputs":\{"action":"ota-update","profile":"staging"\}/);
  assert.match(staging.jobs.plan.steps.at(-1).run, /deploy-baseline\.mjs staging/);
});

test('deploy-staging skips quietly until the owner adds the deploy key (merging first is harmless)', () => {
  const check = staging.jobs.preflight.steps.find((s) => s.id === 'check').run;
  assert.match(check, /if \[ -z "\$STG_SSH_PRIVATE_KEY" \]; then\n\s+echo "ready=false"/);
  assert.match(check, /echo "::warning::\$msg"; exit 0/);
});

test('deploy-production: by hand only, never STG_ or the staging project, the exact production directory', () => {
  assert.deepEqual(Object.keys(production.on), ['workflow_dispatch']);
  const raw = text('deploy-production.yml');
  assert.ok(!raw.includes('STG_') && !raw.includes(STG) && !raw.includes('deploy/stg/'));
  assert.ok(!raw.includes('workflow_run'), 'no event of another workflow starts it');
  assert.equal(production.concurrency.group, 'production');
  assert.deepEqual(production.jobs.migrate.with.target, 'production');
  assert.match(raw, /\[ "\$DEST" = \/opt\/ayat-albayan-staging \] \|\|/);
  const pre = production.jobs.preflight.steps.find((s) => s.name === 'The chosen commit is on develop').run;
  assert.match(pre, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(pre, /git merge-base --is-ancestor "\$SHA" HEAD/);
  assert.equal(production.on.workflow_dispatch.inputs.sha.default, '');
});

test('db-migrate: production in staging-db with its legacy secrets, staging in staging with STG_DATABASE_URL only', () => {
  const { apply, 'apply-staging': stg } = load('db-migrate.yml').jobs;
  assert.equal(apply.if, "${{ inputs.apply && inputs.target == 'production' }}");
  assert.equal(stg.if, "${{ inputs.apply && inputs.target == 'staging' }}");
  assert.deepEqual([apply.environment, stg.environment], ['staging-db', 'staging']);
  assert.deepEqual(secretsIn(stg), ['STG_DATABASE_URL']);
  assert.ok(!secretsIn(apply).some((n) => n.startsWith('STG_')));
  assert.match(JSON.stringify(stg), new RegExp(`postgres\\*://postgres\\.${STG}:\\*@\\*`));
});

test('staging-test-account: the staging environment, STG_* only, the staging project', () => {
  const w = load('staging-test-account.yml');
  assert.deepEqual(envsOf(w), ['staging']);
  assert.deepEqual([...new Set(secretsIn(w))].filter((n) => !n.startsWith('STG_')), []);
  assert.equal(w.jobs['test-account'].env.SUPABASE_URL, `https://${STG}.supabase.co`);
  assert.ok(!text('staging-test-account.yml').includes(PROD));
});

test('config.toml: [remotes.stg] is the staging project with its own auth URLs; production keeps its block', () => {
  const toml = readFileSync(root('packages/db/supabase/config.toml'), 'utf8');
  const stg = toml.slice(toml.indexOf('[remotes.stg]'));
  assert.match(stg, new RegExp(`^\\[remotes\\.stg\\]\\nproject_id = "${STG}"`));
  assert.match(stg, /site_url = "https:\/\/staging-app\.ayatalbayan\.com"/);
  assert.match(stg, /enable_signup = false/);
  assert.doesNotMatch(stg, /"https:\/\/app\.ayatalbayan\.com/, 'never the production web origin');
  assert.match(toml, new RegExp(`\\[remotes\\.production\\]\\nproject_id = "${PROD}"`));
  assert.match(toml, /\[auth\.hook\.custom_access_token\]\nenabled = true/);
});
