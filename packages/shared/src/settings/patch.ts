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
    const parsed = settingZod(def).safeParse(value);
    if (parsed.success) {
      changes[key] = parsed.data;
      pushOnce(out.saved, key);
    } else {
      pushOnce(out.invalid, key);
      for (const i of parsed.error.issues) out.issues.push({ path: [field, ...i.path.map(String)].join('.'), message: i.message });
    }
  }
  out.changes = changes as Partial<AcademySettings>;
  return out;
}
