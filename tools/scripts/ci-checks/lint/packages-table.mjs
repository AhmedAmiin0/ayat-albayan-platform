// refactor/guards/packages.json: the layers (lowest first), the edges each workspace may have and
// the folders it may reach by path. Every allowed target sits in a strictly lower layer.
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { readJson } from './json-file.mjs';

const name = z.string().regex(/^(@ab\/)?[a-z0-9-]+$/);
const targets = z.record(name, z.array(name));

export const tableSchema = z.strictObject({
  layers: z.array(z.strictObject({ name: z.string(), packages: z.array(name) })).min(1),
  apps: z.string(),
  allowed: targets,
  appsBuildOnly: targets,
  pathReach: z.record(name, z.union([z.literal('*'), z.array(name)])),
});

export const readTable = (path) => readJson(path, tableSchema);

/** The table at `path`, or undefined when that tree has none yet. */
export const readTableIfAny = (path) => (existsSync(path) ? readTable(path) : undefined);

const rankOf = (table) =>
  new Map(table.layers.flatMap((layer, i) => layer.packages.map((p) => [p, i])));

/** The workspaces of the app layer: no other workspace may depend on them. */
export const appsOf = (table) =>
  new Set(table.layers.find((l) => l.name === table.apps)?.packages ?? []);

const RECORDS = ['allowed', 'appsBuildOnly', 'pathReach'];

/** `[record, from, to]` for every listed target ('*' kept). */
const pairs = (table) =>
  RECORDS.flatMap((r) =>
    Object.entries(table[r]).flatMap(([from, tos]) => [tos].flat().map((to) => [r, from, to])),
  );

/** One problem per listed target that is not in a strictly lower layer than its workspace. */
export function validateTable(table) {
  const rank = rankOf(table);
  const lower = (from, to) => (rank.get(to) ?? Infinity) < (rank.get(from) ?? -Infinity);
  return pairs(table)
    .filter(([, from, to]) => to !== '*' && !lower(from, to))
    .map(([r, from, to]) => `${r} ${from} → ${to}: not in a lower layer`);
}

const layersKey = (table) => JSON.stringify([table.layers, table.apps]);

/** True when `head` admits something `base` did not (a base without a table is not widened). */
export function widened(head, base) {
  if (base === undefined) return false;
  const was = new Set(pairs(base).map((p) => p.join(' ')));
  const added = pairs(head).some((p) => !was.has(p.join(' ')));
  return added || layersKey(head) !== layersKey(base);
}
