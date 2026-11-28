// ci job «yield to priority»: should this PR run wait?
// Usage: node tools/scripts/automerge/ci-yield/cli.ts <dir>
// <dir> holds runs.json and pulls.json as the job gathered them with gh; RUN_ID, PR and REPO come
// from the environment. Prints wait=true|false and reason=.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selfSchema, yieldFactsSchema } from './yield.schemas.ts';
import { verdict } from './yield.ts';

const load = createRequire(import.meta.url);

export function run(dir: string, env: Record<string, string | undefined>): string[] {
  const read = (name: string): unknown => load(join(dir, `${name}.json`));
  const facts = yieldFactsSchema.parse({ runs: read('runs'), pulls: read('pulls') });
  const { wait, reason } = verdict(facts, selfSchema.parse(env));
  return [`wait=${String(wait)}`, `reason=${reason}`];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir = ''] = process.argv.slice(2);
  for (const line of run(dir, process.env)) console.log(line);
}
