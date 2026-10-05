import {
  normalizePhone,
  SETTING_FIELD_OF,
  SETTING_KEYS,
  settingDef,
  settingsUpdateSchema,
  type AcademySettings,
  type JsonDef,
  type SettingDef,
  type SettingField,
  type SettingKey,
  type SettingsUpdate,
} from '@ab/shared';
import { t } from '@/lib/i18n';

// /admin/settings form ↔ PATCH /settings, generated from the settings registry. Numbers are typed
// counts (hours, weeks, minutes), never times of day (rule 6). The switches with a confirmation
// (registry `form: false`) save on their own and are not part of this form.

/** One value per camelCase field; a nullable number also has `<field>On` (late cancel ON/OFF). */
export type SettingsForm = Record<string, string | boolean>;
export type SettingsErrors = Partial<Record<string, string>>;
export type SettingsResult = { ok: true; value: SettingsUpdate } | { ok: false; errors: SettingsErrors };

/** The keys the generic form edits, in registry (page) order. */
export const FORM_KEYS: SettingKey[] = SETTING_KEYS.filter((k) => settingDef(k).form !== false);

export const onKey = (field: string): string => `${field}On`;
export const str = (form: SettingsForm, key: string): string => {
  const v = form[key];
  return typeof v === 'string' ? v : '';
};
export const flag = (form: SettingsForm, key: string): boolean => form[key] === true;

/** The id of one field of a json setting's object (`academyContact.site`). */
export const shapeId = (field: string, name: string): string => `${field}.${name}`;

function shapeFields(field: string, def: JsonDef, v: AcademySettings[SettingKey]): SettingsForm {
  const obj: Record<string, string> = v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {};
  return Object.fromEntries(def.shape.map((f) => [shapeId(field, f.name), obj[f.name] ?? '']));
}

function formValue(def: SettingDef, v: AcademySettings[SettingKey]): string | boolean {
  if (typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.join(t.common.listJoiner);
  if (v === null) return String(def.type === 'int' ? (def.onValue ?? def.min) : '');
  return String(v);
}

export function settingsForm(s: AcademySettings): SettingsForm {
  const form: SettingsForm = {};
  for (const key of FORM_KEYS) {
    const def = settingDef(key);
    const field = SETTING_FIELD_OF[key];
    if (def.type === 'json') {
      Object.assign(form, shapeFields(field, def, s[key]));
      continue;
    }
    form[field] = formValue(def, s[key]);
    if (def.type === 'int' && def.nullable) form[onKey(field)] = s[key] !== null;
  }
  return form;
}

/** A blank box is not 0: it fails validation like any other bad number. */
const num = (v: string): number => (v.trim() === '' ? Number.NaN : Number(v.trim()));
/** «24، 72», «24, 72» or «24 72». */
const list = (v: string): number[] => v.split(/[\s,،]+/).filter(Boolean).map(Number);
/** Any typed phone → E.164 when it can be read; otherwise sent as typed and refused. */
const phone = (v: string): string => {
  const r = normalizePhone(v);
  return r.ok ? r.e164 : v;
};

/** A json setting's object: the filled boxes only; null (unset) when the setting may be and none is filled. */
function shapeValue(def: JsonDef, input: { form: SettingsForm; field: string }): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const f of def.shape) {
    const v = str(input.form, shapeId(input.field, f.name)).trim();
    if (v !== '') out[f.name] = v;
  }
  return def.nullable && Object.keys(out).length === 0 ? null : out;
}

function bodyValue(def: SettingDef, input: { form: SettingsForm; field: string }): unknown {
  if (def.type === 'json') return shapeValue(def, input);
  const raw = input.form[input.field];
  if (def.type === 'bool') return raw === true;
  const text = typeof raw === 'string' ? raw : '';
  if (def.type === 'int') return def.nullable && !flag(input.form, onKey(input.field)) ? null : num(text);
  if (def.type === 'int_list') return list(text);
  if (def.type === 'e164') return phone(text);
  return text;
}

function errorText(def: SettingDef, message: string): string {
  if (message === 'not_ascending') return t.settings.notAscending;
  if (def.type === 'e164') return t.settings.invalidPhone;
  if (def.type === 'string' || def.type === 'tz' || def.type === 'enum' || def.type === 'json') return t.settings.invalidText;
  return t.settings.invalid;
}

/** The whole form as one PATCH, validated with the API's own (registry-generated) schema. */
export function settingsUpdate(form: SettingsForm): SettingsResult {
  const body: Record<string, unknown> = {};
  for (const key of FORM_KEYS) {
    const field = SETTING_FIELD_OF[key];
    body[field] = bodyValue(settingDef(key), { form, field });
  }
  const parsed = settingsUpdateSchema.safeParse(body);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: SettingsErrors = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0]) as SettingField;
    const key = FORM_KEYS.find((k) => SETTING_FIELD_OF[k] === field);
    if (key) errors[field] ??= errorText(settingDef(key), issue.message);
  }
  return { ok: false, errors };
}
