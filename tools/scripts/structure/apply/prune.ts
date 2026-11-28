import type { Project } from 'ts-morph';
import type { Resolver } from '../../ci-checks/move-module/resolve.ts';
import type { Pruned } from './apply.types.ts';
import { barrelLines, lineNames } from './barrel-names.ts';

interface Ctx {
  project: Project;
  r: Resolver;
}

/** Where a file is after the moves, and the folder a barrel there may gather from. */
export interface Place {
  to: (file: string) => string;
  home: (barrel: string) => string;
}

const inside = (file: string, dir: string): boolean => file.startsWith(`${dir}/`);

/** What pruning `barrel` removes: re-exports whose files end up outside its home folder. */
export function prunePlan(ctx: Ctx, barrel: string, place: Place): Pruned {
  const { lines, own } = barrelLines(ctx, barrel);
  const home = place.home(place.to(barrel));
  const local = (target: string): boolean =>
    !target.startsWith('pkg:') && inside(place.to(target), home);
  const foreign = lines.filter((l) => !local(l.target));
  const kept = own > 0 || lines.some((l) => local(l.target));
  const packages = foreign.filter((l) => l.star && l.target.startsWith('pkg:'));
  const external = packages.length === 1 ? packages[0]?.target.slice(4) : undefined;
  const names = new Map(foreign.flatMap((l) => lineNames(ctx, l)));
  return { foreign, names, kept, external };
}

/** The barrel without its foreign re-exports. */
export function prunedText(text: string, pruned: Pruned): string {
  const spans = [...pruned.foreign].sort((a, b) => b.start - a.start);
  const out = spans.reduce((acc, l) => acc.slice(0, l.start) + acc.slice(l.end), text);
  return `${out.replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
