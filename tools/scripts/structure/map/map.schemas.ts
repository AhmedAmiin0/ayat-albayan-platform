import { z } from 'zod';

export const LAYER_NAMES = [
  'api',
  'shared',
  'client-core',
  'staff-web',
  'family-web',
  'staff-mobile',
  'family-mobile',
] as const;
export const layerNameSchema = z.enum(LAYER_NAMES);
export type LayerName = z.infer<typeof layerNameSchema>;

const repoPath = z.string().regex(/^(?:apps|packages)\/[^/]+\/\S+$/);

/** A move: a `dir/`, a file or a one-folder glob (`dir/stem.*`) into a folder (`to/`) or a file. */
export const moveSchema = z.object({
  from: repoPath,
  to: repoPath,
  layer: layerNameSchema,
  why: z.string().optional(),
});
export type Move = z.infer<typeof moveSchema>;

/** A parent barrel that would become a child feature's facade: it is removed, its importers follow. */
export const dropSchema = z.object({
  drop: repoPath.regex(/\/index\.ts$/),
  layer: layerNameSchema,
  why: z.string(),
});
export type Drop = z.infer<typeof dropSchema>;

export const domainSchema = z.object({
  domain: z.string().regex(/^[a-z][a-z-]*$/),
  groups: z.array(z.string()),
  features: z.array(z.string().regex(/^[a-z][a-z-]*(?:\/[a-z][a-z-]*)?$/)).min(1),
});
export type Domain = z.infer<typeof domainSchema>;

export const structureMapSchema = z.object({
  base: z.string(),
  domains: z.array(domainSchema).min(1),
  moves: z.array(moveSchema),
  drops: z.array(dropSchema).default([]),
  splits: z.array(z.string()),
  renames: z.array(z.string()),
});
export type StructureMap = z.infer<typeof structureMapSchema>;

export const layerSchema = z.object({
  workspace: z.string(),
  /** Where `<domain>/<feature>` folders live. */
  root: z.string(),
  /** Allowed non-domain children of `root` (docs/68 target tree). */
  extras: z.array(z.string()),
  /** Router-owned trees: their files stay; only their imports change. */
  routes: z.array(z.string()),
  /** Packages import relatively; apps write `@/…` (rule 13). */
  alias: z.boolean(),
});
export type Layer = z.infer<typeof layerSchema>;
