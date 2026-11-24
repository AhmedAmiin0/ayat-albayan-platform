// The PR title becomes the squash commit header (lane-automerge subjectOf), so both must pass.
// Usage: PR_TITLE=… PR_NUMBER=… node pr-title.ts (workflow pr-title.yml passes them through env).
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { subjectOf } from '../../../automerge/body.ts';
import { headerProblems } from './header.ts';

const Env = z.object({ PR_TITLE: z.string(), PR_NUMBER: z.coerce.number().int().positive() });

export function titleProblems(pr: { readonly number: number; readonly title: string }): string[] {
  const own = headerProblems(pr.title);
  const squash = headerProblems(subjectOf(pr)).filter((p) => !own.includes(p));
  return [...own, ...squash.map((p) => `squash subject: ${p}`)];
}

function main(): void {
  const env = Env.parse(process.env);
  const problems = titleProblems({ number: env.PR_NUMBER, title: env.PR_TITLE });
  for (const p of problems) console.log(`::error title=PR title::${p}. Title: ${env.PR_TITLE}`);
  const rule = 'CLAUDE.md rule 25: <type>(<scope>): <subject>';
  console.log(problems.length === 0 ? 'the PR title follows the angular convention' : rule);
  process.exitCode = problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
