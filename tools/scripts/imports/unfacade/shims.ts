// `--shims`: importers of a workspace's re-export files import from the final owner instead; a
// re-export statement nothing reaches any more goes, and so does a file left with nothing else.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import type { Project } from 'ts-morph';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { applyEdits } from '../../ci-checks/move-module/specifiers.ts';
import { facadeOwners } from '../owner-names.ts';
import { withDeps } from './deps.ts';
import { filesUnder } from './run.ts';
import { workspaceOf } from './resolve.ts';
import { refsOf, scanRefs, shimOf } from './shim-find.ts';
import { overCap } from './plan.ts';
import { relocate } from './rewrite.ts';
import { isInlineType, pushTo, spanOf } from './statement.ts';
import type { Named, Route, ShimName, Shim, ReadCtx, ShimReport } from './types.ts';

const TEST = /(^|\/)__tests__\/|\.(test|spec)\.[cm]?[jt]sx?$/;
const PACKAGE = /^(@ab\/[^/]+)/;

interface Ctx extends ReadCtx {
  write: boolean;
  project: Project;
  cache: Map<string, string>;
}

type Element = Named['elements'][number];
interface Repoint {
  path: string;
  specs: string[];
  targets: string[];
  overCap: boolean;
}

function elementText(n: Named, e: Element, s: ShimName): string {
  const local = e.alias ?? e.name;
  const type = !n.typeOnly && (isInlineType(e) || s.type) ? 'type ' : '';
  return `${type}${s.source}${local === s.source ? '' : ` as ${local}`}`;
}

/** The import `n` with the names of `shim` moved to their final owners. */
function routeOf(n: Named, shim: Shim | undefined): Route | undefined {
  if (shim === undefined || !n.elements.some((e) => shim.names.has(e.name))) return undefined;
  const stay: string[] = [];
  const groups = new Map<string, string[]>();
  for (const e of n.elements) {
    const s = shim.names.get(e.name);
    if (s === undefined) stay.push(e.text);
    else pushTo(groups, s.spec, elementText(n, e, s));
  }
  return { stay, moved: [...groups] };
}

// A re-export file may also be an importer repointed earlier in the run, so later reads see this.
function save(ctx: Ctx, path: string, text: string): void {
  writeFileSync(posix.join(ctx.root, path), text);
  ctx.cache.set(path, text);
}

/** Rewrites one importer of the live shims unless that would put it over cap. */
function repointFile(ctx: Ctx, path: string, live: ReadonlyMap<string, Shim>): Repoint {
  const before = ctx.read(path);
  const sf = ctx.project.createSourceFile(`/${path}`, before, { overwrite: true });
  const refs = refsOf(sf, path, { root: ctx.root, shims: new Set(live.keys()) });
  const byDecl = new Map(refs.imports.map((i) => [i.named.decl, live.get(i.target)]));
  const out = relocate(sf, (n) => routeOf(n, byDecl.get(n.decl)));
  ctx.project.removeSourceFile(sf);
  const targets = refs.imports.map((i) => i.target);
  if (overCap(before, out.text)) return { path, specs: [], targets, overCap: true };
  if (ctx.write && out.text !== before) save(ctx, path, out.text);
  return { path, specs: out.specs, targets, overCap: false };
}

function removeDead(ctx: Ctx, shim: Shim): void {
  const file = posix.join(ctx.root, shim.path);
  if (shim.decls.length === shim.statements) {
    rmSync(file);
    return;
  }
  const text = ctx.read(shim.path);
  const sf = ctx.project.createSourceFile(`/${shim.path}`, text, { overwrite: true });
  const decls = shimOf(sf, shim.path, new Map())?.decls ?? [];
  const edits = decls.map(({ decl }) => ({ ...spanOf(decl, true), value: '' }));
  save(ctx, shim.path, applyEdits(text, edits));
  ctx.project.removeSourceFile(sf);
}

/** `workspace: @ab/x` for each package an importer's workspace now needs and lacks. */
function addDeps(ctx: Ctx, specsBy: Map<string, string[]>): string[] {
  const byWorkspace = new Map<string, string[]>();
  for (const [path, specs] of specsBy) {
    const names = specs.flatMap((s) => PACKAGE.exec(s)?.[1] ?? []);
    pushTo(byWorkspace, workspaceOf(ctx.root, path), ...names);
  }
  return [...byWorkspace].sort().flatMap(([ws, names]) => {
    const manifest = posix.join(ws, 'package.json');
    const out = withDeps(ctx.read(manifest), names);
    if (ctx.write && out.added.length > 0) writeFileSync(posix.join(ctx.root, manifest), out.text);
    return out.added.map((n) => `${ws}: ${n}`);
  });
}

function shimsOf(ctx: Ctx, workspace: string): Map<string, Shim> {
  const owners = facadeOwners(ctx.root);
  const project = newProject();
  const files = filesUnder(ctx.root, workspace).filter((p) => !TEST.test(p));
  return new Map(
    files.flatMap((path) => {
      const shim = shimOf(project.createSourceFile(`/${path}`, ctx.read(path)), path, owners);
      return shim === undefined ? [] : [[path, shim] as const];
    }),
  );
}

/** Plans (and with `write` applies) the re-export clean-up of one workspace. */
export function unshim(opts: { root: string; workspace: string; write: boolean }): ShimReport {
  const cache = new Map<string, string>();
  const read = (p: string): string =>
    cache.get(p) ?? cache.set(p, readFileSync(posix.join(opts.root, p), 'utf8')).get(p) ?? '';
  const ctx: Ctx = { root: opts.root, write: opts.write, read, cache, project: newProject() };
  const shims = shimsOf(ctx, opts.workspace);
  const refs = [...scanRefs(ctx, shims)];
  const mocked = new Set(refs.flatMap(([, r]) => r.mocked));
  const live = new Map([...shims].filter(([p]) => !mocked.has(p)));
  const importers = refs.filter(([, r]) => r.imports.some((i) => live.has(i.target)));
  const results = importers.map(([p]) => repointFile(ctx, p, live));
  const over = results.filter((r) => r.overCap);
  const pinned = new Set([...refs.flatMap(([, r]) => r.pinned), ...over.flatMap((r) => r.targets)]);
  const done = results.filter((r) => r.specs.length > 0);
  const dead = [...live.values()].filter((s) => !pinned.has(s.path));
  for (const shim of opts.write ? dead : []) removeDead(ctx, shim);
  return {
    shims: [...shims.keys()],
    repointed: done.map((r) => r.path),
    overCap: over.map((r) => r.path),
    deleted: dead.filter((s) => s.decls.length === s.statements).map((s) => s.path),
    kept: [...live.keys()].filter((p) => pinned.has(p)),
    manual: [...shims.keys()].filter((p) => mocked.has(p)),
    deps: addDeps(ctx, new Map(done.map((r) => [r.path, r.specs]))),
  };
}
