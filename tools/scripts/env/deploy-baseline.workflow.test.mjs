// deploy-staging «plan» runs deploy-baseline.mjs, which imports zod (tools/scripts' HTTP client):
// its job installs @ab/scripts' dependencies first, or the script would not even load.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const file = fileURLToPath(
  new URL('../../../.github/workflows/deploy-staging.yml', import.meta.url),
);
const steps = parse(readFileSync(file, 'utf8')).jobs.plan.steps;
const at = (re) => steps.findIndex((s) => re.test(String(s.run ?? s.uses ?? '')));

test('plan installs @ab/scripts with pnpm before it runs deploy-baseline.mjs', () => {
  const pnpm = at(/^pnpm\/action-setup@/);
  const install = at(/^pnpm --filter @ab\/scripts install --frozen-lockfile$/);
  const base = at(/node tools\/scripts\/env\/deploy-baseline\.mjs/);
  assert.ok(pnpm >= 0 && install > pnpm, 'pnpm is set up, then @ab/scripts is installed');
  assert.ok(base > install, 'deploy-baseline.mjs runs after the install');
});
