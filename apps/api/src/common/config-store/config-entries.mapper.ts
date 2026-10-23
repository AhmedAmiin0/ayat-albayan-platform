import type { ConfigEntry, ConfigEntryConflict, SeedEntry, SettingDef } from '@ab/shared';
import { defaultOf } from './config-defs';
import { ownerOf } from './config-ownership';
import { neverWritten, type ConfigRow } from './config-store.types';

const BOUND_FIELDS = ['min', 'max', 'options', 'minLength', 'maxLength', 'maxItems', 'nullable'] as const;

/** The code entry's bounds (bounds stay in code, docs/26 §2d). */
export function boundsOf(def: SettingDef): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of BOUND_FIELDS) {
    const v: unknown = Reflect.get(def, f);
    if (v !== undefined) out[f] = Array.isArray(v) ? [...v] : v;
  }
  return out;
}

/** Who last changed the row; nothing for a seeded row nobody wrote (JSON null, no writer). */
export function changedBy(row: ConfigRow | undefined, names: ReadonlyMap<string, string>) {
  if (!row || neverWritten(row)) return { updatedAt: null, updatedByName: null };
  return { updatedAt: row.updatedAt, updatedByName: row.updatedBy ? (names.get(row.updatedBy) ?? null) : null };
}

export interface EntryParts {
  seed: SeedEntry;
  def: SettingDef;
  row: ConfigRow | undefined;
  /** The effective value (ConfigStore's decode). */
  value: unknown;
}

/** One GET /config/entries row: the code entry merged with its stored row (missing row → version 0). */
export function toConfigEntry(parts: EntryParts, names: ReadonlyMap<string, string>): ConfigEntry {
  const { seed, def, row } = parts;
  return {
    key: seed.key,
    module: seed.module,
    group: seed.group,
    type: def.type,
    bounds: boundsOf(def),
    value: parts.value,
    defaultValue: defaultOf(def),
    stored: row !== undefined && row.value !== null,
    description: row?.description ?? null,
    descriptionSeed: row?.descriptionSeed ?? null,
    descriptionEdited: row?.descriptionEdited ?? false,
    hintKey: seed.hintKey,
    labelKey: def.labelKey,
    public: seed.is_public,
    version: row?.version ?? 0,
    ...changedBy(row, names),
    ownedBy: ownerOf(seed.key),
    confirm: seed.confirm,
    retired: seed.retired || (row?.retiredAt ?? null) !== null,
  };
}

/** The 409 `conflict` body: the newer facts the admin's draft lost to. */
export function toConflict(entry: ConfigEntry): ConfigEntryConflict & { message: 'conflict' } {
  return {
    code: 'conflict',
    message: 'conflict',
    key: entry.key,
    current: entry.value,
    version: entry.version,
    updatedAt: entry.updatedAt,
    updatedByName: entry.updatedByName,
  };
}
