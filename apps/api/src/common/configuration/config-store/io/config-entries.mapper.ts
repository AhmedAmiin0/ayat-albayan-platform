import type { ConfigEntry, ConfigEntryConflict, SeedEntry, SettingDef } from '@ab/shared';
import { defaultOf } from '@/common/configuration/config-store/store/config-defs';
import { ownerOf } from '@/common/configuration/config-store/boundaries/config-ownership';
import { neverWritten, type ConfigRow } from '@/common/configuration/config-store/config-store.types';

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

interface EntryParts {
  seed: SeedEntry;
  def: SettingDef;
  row: ConfigRow | undefined;
  /** The effective value (ConfigStore's decode). */
  value: unknown;
}

/** The stored row's part of an entry; a missing row is version 0, nothing stored, no description. */
function rowFields(row: ConfigRow | undefined) {
  if (!row) return { stored: false, description: null, descriptionSeed: null, descriptionEdited: false, version: 0, retiredAt: null };
  return {
    stored: row.value !== null,
    description: row.description,
    descriptionSeed: row.descriptionSeed,
    descriptionEdited: row.descriptionEdited,
    version: row.version,
    retiredAt: row.retiredAt,
  };
}

/** One GET /config/entries row: the code entry merged with its stored row (missing row → version 0). */
export function toConfigEntry(parts: EntryParts, names: ReadonlyMap<string, string>): ConfigEntry {
  const { seed, def } = parts;
  const { retiredAt, ...stored } = rowFields(parts.row);
  return {
    key: seed.key,
    module: seed.module,
    group: seed.group,
    type: def.type,
    bounds: boundsOf(def),
    value: parts.value,
    defaultValue: defaultOf(def),
    ...stored,
    hintKey: seed.hintKey,
    labelKey: def.labelKey,
    public: seed.is_public,
    ...changedBy(parts.row, names),
    ownedBy: ownerOf(seed.key),
    confirm: seed.confirm,
    retired: seed.retired || retiredAt !== null,
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
