import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import { z } from 'zod';
import type { GhRun, OpenPr } from './plan.types.ts';

const PR_NUMBERS = z.array(z.coerce.number().int().positive());
const PATH = z.string().min(1);

const lines = (text: string): string[] => text.split('\n').filter((l) => l.trim() !== '');

/** Folder → open PR numbers that change a file in it. */
export function openPrDirs(prs: readonly OpenPr[]): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const pr of prs) {
    const dirs = new Set(pr.files.map((f) => posix.dirname(f)));
    for (const dir of dirs) out.set(dir, [...(out.get(dir) ?? []), pr.number]);
  }
  return out;
}

/** `gh` in the repo root; `gh api` is REST, so it works where GraphQL (`gh pr list`) is blocked. */
export const ghIn =
  (root: string): GhRun =>
  (args) =>
    execFileSync('gh', [...args], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const api = (path: string, jq: string): string[] => ['api', '--paginate', path, '--jq', jq];

/** The open PRs of the repo the session's `gh` points at, each with its changed files. */
export function readOpenPrs(run: GhRun): OpenPr[] {
  const pulls = api('repos/{owner}/{repo}/pulls?state=open&per_page=100', '.[].number');
  const numbers = PR_NUMBERS.parse(lines(run(pulls)));
  return numbers.map((number) => {
    const files = api(`repos/{owner}/{repo}/pulls/${number}/files?per_page=100`, '.[].filename');
    return { number, files: lines(run(files)).map((f) => PATH.parse(f)) };
  });
}
