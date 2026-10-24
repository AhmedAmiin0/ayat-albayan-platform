import { ownedKeyOfField } from './ownership.js';
import { SETTING_KEY_OF, SETTINGS_REGISTRY, type AcademySettings, type SettingField, type SettingKey } from './registry.js';
import { settingZod } from './schema.js';
import type { SettingDef } from './defs.js';

/** One rejected field, worded like parseOrThrow's 400 (path = the camelCase field, then the inner path). */
export type SettingsPatchIssue = { path: string; message: string };

/** PATCH /settings, applied per key (docs/26 §2f): what is written and what each field became. */
export type SettingsPatchSplit = {
  /** The rows to write (snake_case), only the valid registry fields. */
  changes: Partial<AcademySettings>;
  /** snake_case keys written. */
  saved: SettingKey[];
  /** snake_case keys owned by a module route (or `patch: false`): never written here. */
  moved: string[];
  /** snake_case keys whose value failed validation: not written. */
  invalid: SettingKey[];
  issues: SettingsPatchIssue[];
};

/** The PATCH /settings answer: the full settings after the write, plus the per-key lists. */
export type SettingsPatchResult = AcademySettings & {
  saved: SettingKey[];
  moved: string[];
  invalid: SettingKey[];
};

const registryKeyOf = (field: string): SettingKey | null =>
  Object.hasOwn(SETTING_KEY_OF, field) ? SETTING_KEY_OF[field as SettingField] : null;

const pushOnce = <T>(list: T[], item: T): void => {
  if (!list.includes(item)) list.push(item);
};

export type ParsedSettingField = { ok: true; value: unknown } | { ok: false; issues: SettingsPatchIssue[] };

/**
 * One PATCH field validated by its registry def (issue paths = the field, then the inner path). Also
 * used by the API for the owned followUpHours alias (docs/26 §2f: it writes the follow-up rule).
 */
export function parseSettingField(input: { field: string; key: SettingKey; value: unknown }): ParsedSettingField {
  const parsed = settingZod(SETTINGS_REGISTRY[input.key]).safeParse(input.value);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, issues: parsed.error.issues.map((i) => ({ path: [input.field, ...i.path.map(String)].join('.'), message: i.message })) };
}

/**
 * Splits a raw PATCH body field by field: owned keys (camelCase or snake_case) → moved; registry
 * fields with `patch: false` → moved; registry fields (camelCase) validated one by one → saved or
 * invalid; unknown fields are ignored. Never throws.
 */
export function splitSettingsPatch(body: Readonly<Record<string, unknown>>): SettingsPatchSplit {
  const out: SettingsPatchSplit = { changes: {}, saved: [], moved: [], invalid: [], issues: [] };
  const changes: Partial<Record<SettingKey, unknown>> = {};
  for (const [field, value] of Object.entries(body)) {
    const owned = ownedKeyOfField(field);
    if (owned) {
      pushOnce(out.moved, owned);
      continue;
    }
    const key = registryKeyOf(field);
    if (!key || value === undefined) continue;
    const def: SettingDef = SETTINGS_REGISTRY[key];
    if (def.patch === false) {
      pushOnce(out.moved, key);
      continue;
    }
    const parsed = parseSettingField({ field, key, value });
    if (parsed.ok) {
      changes[key] = parsed.value;
      pushOnce(out.saved, key);
    } else {
      pushOnce(out.invalid, key);
      out.issues.push(...parsed.issues);
    }
  }
  out.changes = changes as Partial<AcademySettings>;
  return out;
}
