// Moves the names an owner package holds out of '@ab/shared' imports (CLAUDE.md rule 23, docs/32
// R7). From the repo root:
//   node tools/scripts/imports/unfacade.ts --workspace <dir> [--next N] [--owner @ab/<p>] [--shims]
//     --dry-run|--write
// --dry-run prints the counts and the files to change, over cap (a split comes first) and manual
// (namespace imports, mocks); a workspace is done when all three are empty. --write applies the
// first N files still to change (all without --next) and adds the owners to the workspace's
// dependencies. --shims instead repoints the importers of the workspace's re-export files to the
// final owner and deletes what nothing reaches any more.
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { unfacade } from './unfacade/run.ts';
import { unshim } from './unfacade/shims.ts';
import type { RunReport } from './unfacade/types.ts';

const USAGE =
  'usage: node tools/scripts/imports/unfacade.ts --workspace <dir> [--next N] ' +
  '[--owner @ab/<p>] [--shims] --dry-run|--write';
const REPO = posix.resolve(fileURLToPath(new URL('../../..', import.meta.url)));

const argsSchema = z
  .strictObject({
    root: z.string().default(REPO),
    workspace: z.string().regex(/^[\w-]+(?:\/[\w-]+)*$/),
    next: z.coerce.number().int().positive().optional(),
    owner: z
      .string()
      .regex(/^@ab\/[a-z0-9-]+$/)
      .optional(),
    shims: z.boolean().default(false),
    'dry-run': z.boolean().default(false),
    write: z.boolean().default(false),
  })
  .refine((a) => a.write !== a['dry-run'], 'pass exactly one of --dry-run and --write')
  .refine((a) => existsSync(posix.join(a.root, a.workspace, 'package.json')), {
    message: 'the workspace has no package.json',
  });

type Args = z.infer<typeof argsSchema>;

const STRING = { type: 'string' } as const;
const FLAG = { type: 'boolean' } as const;
const OPTIONS = { root: STRING, workspace: STRING, next: STRING, owner: STRING };
const FLAGS = { shims: FLAG, 'dry-run': FLAG, write: FLAG };

const list = (title: string, paths: string[]): string[] =>
  paths.length === 0 ? [] : [`${title}:`, ...paths.map((p) => `  ${p}`)];

const depsLines = (deps: string[]): string[] =>
  deps.length === 0
    ? []
    : [`dependencies added: ${deps.join(', ')}`, 'then run: pnpm i --lockfile-only'];

const count = (l: string[]): string => String(l.length);

function summary(workspace: string, r: RunReport): string {
  const slice = r.done.length === r.toChange.length ? '' : ` (this run: ${count(r.done)})`;
  const rest = `${count(r.overCap)} over cap, ${count(r.manual)} manual`;
  return `${workspace}: ${count(r.toChange)} to change${slice}, ${rest}`;
}

const depsTail = (a: Args, deps: string[]): string[] =>
  a.write ? depsLines(deps) : list('dependencies to add', deps);

function facade(a: Args): string[] {
  const r = unfacade({ root: a.root, workspace: a.workspace, write: a.write, ...pick(a) });
  return [
    summary(a.workspace, r),
    ...list(a.write ? 'changed' : 'to change', a.write ? r.done : r.toChange),
    ...list('over cap', r.overCap),
    ...list('manual', r.manual),
    ...depsTail(a, r.deps),
  ];
}

const pick = (a: Args): { next?: number; owner?: string } => ({
  ...(a.next === undefined ? {} : { next: a.next }),
  ...(a.owner === undefined ? {} : { owner: a.owner }),
});

function shims(a: Args): string[] {
  const r = unshim({ root: a.root, workspace: a.workspace, write: a.write });
  return [
    `${a.workspace}: ${String(r.shims.length)} re-export files`,
    ...list('repointed', r.repointed),
    ...list('over cap', r.overCap),
    ...list('deleted', r.deleted),
    ...list('kept (still re-exported or namespace-imported)', r.kept),
    ...list('manual (mocked)', r.manual),
    ...depsTail(a, r.deps),
  ];
}

function main(): void {
  const parsed = argsSchema.safeParse(
    parseArgs({ options: { ...OPTIONS, ...FLAGS }, strict: false }).values,
  );
  if (!parsed.success) {
    console.error(`${z.prettifyError(parsed.error)}\n${USAGE}`);
    process.exit(2);
  }
  const lines = parsed.data.shims ? shims(parsed.data) : facade(parsed.data);
  console.log(lines.join('\n'));
}

main();
