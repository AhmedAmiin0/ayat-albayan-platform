import type { Project } from 'ts-morph';
import type { BarrelUse, Edit, ExtStyle, RepoMove, SpecUse } from './write.types.ts';
import { codeFiles, readText } from '../../ci-checks/move-module/files.ts';
import {
  formatSpec,
  loadAliases,
  resolveSpec,
  type Resolver,
  type Target,
} from '../../ci-checks/move-module/resolve.ts';
import { needles, newProject } from '../../ci-checks/move-module/rewrite.ts';
import { applyEdits } from '../../ci-checks/move-module/specifiers.ts';
import { fixtureEdits } from './fixture-paths.ts';
import { specUses } from './specs.ts';

interface Ctx {
  r: Resolver;
  move: RepoMove;
  barrels: Map<string, BarrelUse>;
}

const INDEX = 'index.ts';
const STYLES: Record<Target['style'], ExtStyle> = {
  exact: 'exact',
  js: 'js',
  bare: 'bare',
  index: 'bare',
};

function namesFor(use: BarrelUse, file: string): Map<string, boolean> {
  const names = use.files.get(file) ?? new Map<string, boolean>();
  use.files.set(file, names);
  return names;
}

function record(
  ctx: Ctx,
  at: { home: string; file: string; spec: SpecUse; style: ExtStyle },
): void {
  const files = new Map<string, Map<string, boolean>>();
  const use = ctx.barrels.get(at.home) ?? { files, style: at.style };
  ctx.barrels.set(at.home, use);
  const names = namesFor(use, at.file);
  for (const n of at.spec.names ?? []) names.set(n.name, (names.get(n.name) ?? true) && n.typeOnly);
}

/** The spec through the unit's index.ts: same alias and extension style as the importer wrote. */
function viaIndex(
  ctx: Ctx,
  at: { from: string; spec: SpecUse; target: Target },
): string | undefined {
  const home = ctx.move.homes.get(at.target.file);
  const outside = home !== undefined && !at.from.startsWith(`${home}/`);
  if (!outside || at.spec.names === undefined) return undefined;
  const newFile = ctx.move.renamed.get(at.target.file) ?? at.target.file;
  const style = STYLES[at.target.style];
  record(ctx, { home, file: newFile, spec: at.spec, style });
  const index = `${home}/${INDEX}`;
  const target = { ...at.target, file: index, style: style === 'bare' ? 'index' : style } as const;
  return formatSpec(target, { from: at.from, file: index, aliases: ctx.r.aliases });
}

interface At {
  file: string;
  from: string;
  spec: SpecUse;
  target: Target;
}

/** The spec to the target's own (new) path; unchanged when neither end moved. */
function plainSpec(ctx: Ctx, at: At): string {
  const file = ctx.move.renamed.get(at.target.file) ?? at.target.file;
  const still = file === at.target.file && at.from === at.file;
  return still
    ? at.spec.value
    : formatSpec(at.target, { from: at.from, file, aliases: ctx.r.aliases });
}

function specEdit(ctx: Ctx, file: string, spec: SpecUse): Edit | undefined {
  const target = resolveSpec(ctx.r, file, spec.value);
  if (target === undefined) return undefined;
  const at = { file, from: ctx.move.renamed.get(file) ?? file, spec, target };
  const value = viaIndex(ctx, at) ?? plainSpec(ctx, at);
  return value === spec.value ? undefined : { start: spec.start, end: spec.end, value };
}

function rewriteOne(ctx: Ctx, project: Project, file: string): string {
  const text = readText(ctx.r.root, file);
  const sf = project.createSourceFile(`/virtual/${file}`, text, { overwrite: true });
  const to = ctx.move.renamed.get(file) ?? file;
  const specs = specUses(sf).flatMap((s) => specEdit(ctx, file, s) ?? []);
  const paths = fixtureEdits(sf, { file, to, renamed: ctx.move.renamed });
  project.removeSourceFile(sf);
  return applyEdits(text, [...specs, ...paths]);
}

/** Every code file's new text (changed ones only) and what each new index.ts must re-export. */
export function rewriteRepo(move: RepoMove): {
  texts: Map<string, string>;
  barrels: Map<string, BarrelUse>;
} {
  const r: Resolver = {
    root: move.root,
    aliases: loadAliases(move.root),
    renamed: new Map(move.renamed),
  };
  const ctx: Ctx = { r, move, barrels: new Map() };
  const keys = needles(r.renamed);
  const project = newProject();
  const texts = new Map<string, string>();
  for (const file of codeFiles(move.root)) {
    const text = readText(move.root, file);
    if (!move.renamed.has(file) && !keys.some((k) => text.includes(k))) continue;
    const next = rewriteOne(ctx, project, file);
    if (next !== text) texts.set(file, next);
  }
  return { texts, barrels: ctx.barrels };
}
