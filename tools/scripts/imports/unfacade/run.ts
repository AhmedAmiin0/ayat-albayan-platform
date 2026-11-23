import { readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { codeFiles } from '../../ci-checks/move-module/files.ts';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { facadeOwners } from '../owner-names.ts';
import { withDeps } from './deps.ts';
import { planFile } from './plan.ts';
import type { FilePlan, RunOptions, RunReport } from './types.ts';

interface Change {
  path: string;
  text: string;
  owners: string[];
}

interface Planned {
  path: string;
  plan: FilePlan;
}

export const filesUnder = (root: string, dir: string): string[] =>
  codeFiles(root)
    .filter((f) => f.startsWith(`${dir}/`))
    .sort();

function ownersFor(root: string, owner: string | undefined): Map<string, string> {
  const all = facadeOwners(root);
  return owner === undefined ? all : new Map([...all].filter(([, o]) => o === owner));
}

const changeOf = ({ path, plan }: Planned): Change[] =>
  plan.kind === 'change' ? [{ path, text: plan.text, owners: plan.owners }] : [];

const pathsOf = (plans: Planned[], kind: FilePlan['kind']): string[] =>
  plans.filter((p) => p.plan.kind === kind).map((p) => p.path);

function writeAll(opts: RunOptions, done: Change[], manifest: string): void {
  for (const c of done) writeFileSync(posix.join(opts.root, c.path), c.text);
  writeFileSync(posix.join(opts.root, opts.workspace, 'package.json'), manifest);
}

/** Plans every code file of the workspace and, with `write`, applies the first `next` changes. */
export function unfacade(opts: RunOptions): RunReport {
  const owners = ownersFor(opts.root, opts.owner);
  const project = newProject();
  const read = (path: string): string => readFileSync(posix.join(opts.root, path), 'utf8');
  const plans = filesUnder(opts.root, opts.workspace).map((path) => ({
    path,
    plan: planFile(project, { path, text: read(path), owners }),
  }));
  const changes = plans.flatMap(changeOf);
  const done = changes.slice(0, opts.next ?? changes.length);
  const manifest = withDeps(
    read(posix.join(opts.workspace, 'package.json')),
    done.flatMap((c) => c.owners),
  );
  if (opts.write) writeAll(opts, done, manifest.text);
  return {
    toChange: changes.map((c) => c.path),
    done: done.map((c) => c.path),
    overCap: pathsOf(plans, 'overCap'),
    manual: pathsOf(plans, 'manual'),
    deps: manifest.added,
  };
}
