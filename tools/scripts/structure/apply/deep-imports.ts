import { posix } from 'node:path';
import type { Project } from 'ts-morph';
import { resolveSpec, type Resolver } from '../../ci-checks/move-module/resolve.ts';
import { featureOf } from '../tree/feature-of.ts';
import type { Allowed } from '../tree/tree.types.ts';
import type { Layer } from '../map/index.ts';
import type { Binding, ModuleRef } from './apply.types.ts';
import { kindOf, moduleRefs } from './imports.ts';

export interface DeepCtx {
  project: Project;
  r: Resolver;
  layer: Layer;
  allowed: Allowed;
  /** The old module regex: a deep import inside one old module was legal and must stay legal. */
  old: string;
  oldOf: (file: string) => string;
  /** `file→target` imports that went through a barrel before the moves. */
  forced: Set<string>;
}

export interface DeepImport {
  start: number;
  end: number;
  kind: 'import' | 'export';
  spec: string;
  bindings: Binding[];
  named: boolean;
  star: boolean;
  target: string;
  feature: string;
}

const INDEX = /\/index\.tsx?$/;
const within = (file: string, dir: string): boolean => file.startsWith(`${dir}/`);

function oldModule(ctx: DeepCtx, file: string): string | undefined {
  const rel = posix.relative(ctx.layer.workspace, ctx.oldOf(file));
  return `${rel}/`.match(new RegExp(`^(${ctx.old})/`))?.[1];
}

/** It was legal before (one old module, a route file or a barrel import) and crosses features now. */
function mustFix(ctx: DeepCtx, file: string, target: string): boolean {
  const isRoute = ctx.layer.routes.some((r) => file === r || within(file, r));
  if (isRoute || ctx.forced.has(`${file}→${target}`)) return true;
  const was = oldModule(ctx, file);
  return was !== undefined && was === oldModule(ctx, target);
}

const use = (ref: ModuleRef, at: { target: string; feature: string }): DeepImport => ({
  start: ref.decl.getStart(),
  end: ref.decl.getEnd(),
  kind: kindOf(ref.decl),
  spec: ref.spec,
  bindings: ref.bindings,
  named: ref.named,
  star: ref.star,
  ...at,
});

/** Imports of `file` that reach inside another feature and have to go through its index. */
export function deepImports(ctx: DeepCtx, file: string, text: string): DeepImport[] {
  const sf = ctx.project.createSourceFile(`/virtual/deep/${file}`, text, { overwrite: true });
  const out = moduleRefs(sf).flatMap((ref) => {
    const target = resolveSpec(ctx.r, file, ref.spec)?.file;
    const feature = target === undefined ? undefined : featureOf(target, ctx);
    if (target === undefined || feature === undefined || within(file, feature)) return [];
    const isIndex = INDEX.test(target) && posix.dirname(target) === feature;
    return isIndex || !mustFix(ctx, file, target) ? [] : [use(ref, { target, feature })];
  });
  ctx.project.removeSourceFile(sf);
  return out;
}

export const bindingKey = (b: Binding): string => `${b.isType ? 'type ' : ''}${b.name}`;
