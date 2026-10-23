import { SETTING_DEFAULTS, SETTING_FIELD_OF, settingDef, type SettingKey } from '@ab/shared';
import { onKey, settingsForm, shapeId, type SettingsForm } from './settings-form';

const defaults = settingsForm(SETTING_DEFAULTS);

/** The form fields behind one setting: its own, `<field>On` (a number that can be OFF), or a json shape's boxes. */
export function fieldIds(key: SettingKey): string[] {
  const def = settingDef(key);
  const field = SETTING_FIELD_OF[key];
  if (def.type === 'json') return def.shape.map((f) => shapeId(field, f.name));
  return def.type === 'int' && def.nullable ? [field, onKey(field)] : [field];
}

/** Which fields count: a switched-off number ignores its leftover text. */
function compared(key: SettingKey, form: SettingsForm): string[] {
  const def = settingDef(key);
  const on = onKey(SETTING_FIELD_OF[key]);
  return def.type === 'int' && def.nullable && form[on] !== true ? [on] : fieldIds(key);
}

const differs = (key: SettingKey, a: SettingsForm, b: SettingsForm): boolean =>
  [...new Set([...compared(key, a), ...compared(key, b)])].some((id) => a[id] !== b[id]);

/** Has the admin changed this setting since the last save? */
export const isDirty = (key: SettingKey, form: SettingsForm, saved: SettingsForm): boolean => differs(key, form, saved);

/** Does the form hold the setting's default (what the reset button would set)? */
export const isDefault = (key: SettingKey, form: SettingsForm): boolean => !differs(key, form, defaults);

/** The fields that put the setting back to its default. */
export function resetPatch(key: SettingKey): SettingsForm {
  return Object.fromEntries(fieldIds(key).map((id) => [id, defaults[id] ?? '']));
}
