import {
  normalizePhone,
  SETTING_DEFAULTS,
  SETTING_FIELD_OF,
  settingDef,
  settingsUpdateSchema,
  type AcademySettings,
  type SettingDef,
  type SettingKey,
  type SettingsUpdate,
} from '@ab/shared';
import { t } from '@/lib/i18n';
import { isDirty } from './settings-dirty';
import { flag, onKey, shapeId, str, type SettingsForm } from './settings-form';

// One setting at a time («القيم», docs/26b §2: each row saves on its own). The same field ids as
// the page form (settings-form.ts), so settings-dirty.ts compares them; any registry key works,
// including the ones the page form leaves out (feedback_mode, sales_auto_assign).

type Value = AcademySettings[SettingKey];

/** One setting's stored value → its editor fields. */
export function rowForm(key: SettingKey, value: Value): SettingsForm {
  const def = settingDef(key);
  const field = SETTING_FIELD_OF[key];
  if (def.type === 'json') {
    const obj = value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, string>) : {};
    return Object.fromEntries(def.shape.map((f) => [shapeId(field, f.name), obj[f.name] ?? '']));
  }
  if (typeof value === 'boolean') return { [field]: value };
  if (Array.isArray(value)) return { [field]: value.join(t.common.listSeparator) };
  if (def.type === 'int' && def.nullable) {
    return { [field]: String(value ?? def.onValue ?? def.min), [onKey(field)]: value !== null };
  }
  return { [field]: value === null ? '' : String(value) };
}

/** The fields of a setting's default (what «أعد القيمة الافتراضية» puts back). */
export const defaultForm = (key: SettingKey): SettingsForm => rowForm(key, SETTING_DEFAULTS[key]);

/** Does the stored value differ from the default («معدَّلة»)? */
export const isModified = (key: SettingKey, settings: AcademySettings): boolean =>
  isDirty(key, rowForm(key, settings[key]), defaultForm(key));

const num = (v: string): number => (v.trim() === '' ? Number.NaN : Number(v.trim()));
const list = (v: string): number[] => v.split(/[\s,،]+/).filter(Boolean).map(Number);

function shapeValue(key: SettingKey, form: SettingsForm): Record<string, string> | null {
  const def = settingDef(key);
  if (def.type !== 'json') return null;
  const field = SETTING_FIELD_OF[key];
  const out: Record<string, string> = {};
  for (const f of def.shape) {
    const v = str(form, shapeId(field, f.name)).trim();
    if (v !== '') out[f.name] = v;
  }
  return def.nullable && Object.keys(out).length === 0 ? null : out;
}

/** The fields → the value PATCH /settings takes (a phone typed locally becomes E.164 when it can). */
export function rowValue(key: SettingKey, form: SettingsForm): unknown {
  const def = settingDef(key);
  const field = SETTING_FIELD_OF[key];
  if (def.type === 'json') return shapeValue(key, form);
  if (def.type === 'bool') return form[field] === true;
  const text = str(form, field);
  if (def.type === 'int') return def.nullable && !flag(form, onKey(field)) ? null : num(text);
  if (def.type === 'int_list') return list(text);
  if (def.type === 'e164') {
    const r = normalizePhone(text);
    return r.ok ? r.e164 : text;
  }
  return text;
}

const fill = (s: string, v: { min: number; max: number }): string =>
  s.replace('{min}', String(v.min)).replace('{max}', String(v.max));

/** The one line under the editor for a refused value. */
export function rowError(def: SettingDef, message: string): string {
  const v = t.settingsValues;
  if (message === 'not_ascending') return t.settings.notAscending;
  if (def.type === 'int' || def.type === 'int_list') return fill(v.invalidRange, def);
  if (def.type === 'string') return fill(v.invalidLength, { min: def.minLength, max: def.maxLength });
  if (def.type === 'e164') return t.settings.invalidPhone;
  return t.settings.invalidText;
}

export type RowResult = { ok: true; body: SettingsUpdate; value: unknown } | { ok: false; error: string };

/** Validates one setting with the API's own schema; the body holds only that setting. */
export function rowUpdate(key: SettingKey, form: SettingsForm): RowResult {
  const field = SETTING_FIELD_OF[key];
  const value = rowValue(key, form);
  const parsed = settingsUpdateSchema.safeParse({ [field]: value });
  if (parsed.success && field in parsed.data) return { ok: true, body: parsed.data, value };
  const message = parsed.success ? '' : (parsed.error.issues[0]?.message ?? '');
  return { ok: false, error: rowError(settingDef(key), message) };
}
