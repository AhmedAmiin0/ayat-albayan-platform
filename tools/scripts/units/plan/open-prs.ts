import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import { z } from 'zod';
import { parseJson } from '../json.ts';

const PRS = z.array(
  z.object({ number: z.number().int(), files: z.array(z.object({ path: z.string().min(1) })) }),
);

/** Folder → open PR numbers that change a file in it, from `gh pr list --json number,files`. */
export function openPrDirs(json: string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const pr of parseJson(json, PRS)) {
    const dirs = new Set(pr.files.map((f) => posix.dirname(f.path)));
    for (const dir of dirs) out.set(dir, [...(out.get(dir) ?? []), pr.number]);
  }
  return out;
}

/** The open PRs of the repo the session's `gh` points at. */
export const readOpenPrs = (root: string): string =>
  execFileSync(
    'gh',
    ['pr', 'list', '--state', 'open', '--limit', '500', '--json', 'number,files'],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  );
