// deploy-staging «plan»: did the API change since the last code deploy? Usage, from the repo
// root at the commit being deployed (full history):
//   node tools/scripts/ci-checks/deploy/api-changed.ts <code_base>
// <code_base>: deploy-baseline.mjs's last green code deploy (empty or anything else = unknown).
// Prints `api_base=<code_base>` when nothing the API image depends on changed since, else
// `api_base=` (build), and the reason as a notice. «deploy» keeps the running image only when
// the server's $DEST/.api.sha (written by roll.sh after a good roll) is that same commit.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { apiInputs } from './api-inputs.ts';
import { decide, type Facts } from './decide.ts';

const argsSchema = z.tuple([z.string()]);
const shaSchema = z.string().regex(/^[0-9a-f]{40}$/);

/** The commit when it is a full sha, else null (unknown). */
export const commitOf = (text: string): string | null => {
  const parsed = shaSchema.safeParse(text.trim());
  return parsed.success ? parsed.data : null;
};

/** Files that differ between `base` and HEAD in `root` (null: git failed). */
export function changedSince(root: string, base: string): string[] | null {
  const diff = spawnSync('git', ['diff', '--name-only', base, 'HEAD', '--'], {
    cwd: root,
    encoding: 'utf8',
  });
  return diff.status === 0 ? diff.stdout.split('\n').filter(Boolean) : null;
}

/** The facts for `args` ([code_base]) in the repository at `root`. */
export function factsOf(root: string, args: readonly string[]): Facts {
  const [text] = argsSchema.parse(args);
  const base = commitOf(text);
  return { base, changed: base === null ? null : changedSince(root, base) };
}

/** The $GITHUB_OUTPUT line and the notice for `args`. */
export function verdict(root: string, args: readonly string[]): [string, string] {
  const facts = factsOf(root, args);
  const { keep, reason } = decide(facts, apiInputs(root));
  const base = keep ? (facts.base ?? '') : '';
  return [`api_base=${base}`, `::notice::API image: ${keep ? 'keep' : 'build'} (${reason})`];
}

function main(): void {
  const root = fileURLToPath(new URL('../../../..', import.meta.url));
  const [output, notice] = verdict(root, process.argv.slice(2));
  console.log(output);
  console.error(notice);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
