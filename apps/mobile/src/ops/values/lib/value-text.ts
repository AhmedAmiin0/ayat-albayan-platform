import { shapeParts, valueTextBy, type ValueTextTable } from '@ab/client-core';
import { settingDef, tzOptionLabel, type SettingKey } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// «القيم» on the phone: a setting's words (label, description, value as text) from the registry's
// dotted i18n paths, so the phone reads the same strings as the web.

/** A dotted ar.json / en.json path ('settings.hints.uploadMaxMb') → its string, or undefined. */
export function textAt(path: string): string | undefined {
  const v = path
    .split('.')
    .reduce<unknown>(
      (node, k) => (node && typeof node === 'object' ? Reflect.get(node, k) : undefined),
      t,
    );
  return typeof v === 'string' ? v : undefined;
}

/** The row's name. */
export const labelOf = (key: SettingKey): string => textAt(settingDef(key).labelKey) ?? key;

/** The description in the sheet: the hint, or the switch's hint for a number that can be off. */
export function hintOf(key: SettingKey): string | undefined {
  const def = settingDef(key);
  if (def.hintKey) return textAt(def.hintKey);
  return def.type === 'int' && def.toggleHintKey ? textAt(def.toggleHintKey) : undefined;
}

/** What a confirmed change does, as the web's confirmation says it: the switch hint, else the hint. */
export function impactOf(key: SettingKey): string | undefined {
  const def = settingDef(key);
  const toggle = def.type === 'int' && def.toggleHintKey ? textAt(def.toggleHintKey) : undefined;
  return toggle ?? (def.hintKey ? textAt(def.hintKey) : undefined);
}

const city = (id: string): string | undefined => textAt(`tz.${id}`);

/** An enum option's label: the field's label key + the option ('feedbackMode' + 'Buttons'). */
export function optionLabel(key: SettingKey, option: string): string {
  const def = settingDef(key);
  if (def.type === 'tz') return tzOptionLabel(option, city(option));
  if (def.type !== 'enum') return option;
  const word = `${option.charAt(0).toUpperCase()}${option.slice(1)}`;
  return textAt(`${def.labelKey}${word}`) ?? option;
}

const emptyText = (key: SettingKey): string =>
  settingDef(key).type === 'int' ? t.mobileAdmin.settings.off : t.mobileValues.empty;

function shapeText(_key: SettingKey, value: unknown): string {
  const parts = shapeParts(value);
  return parts.length ? parts.join(' · ') : t.mobileValues.empty;
}

const listText = (_key: SettingKey, value: unknown): string =>
  (Array.isArray(value) ? (value as unknown[]) : []).join(t.common.listSeparator);

const labelText = (key: SettingKey, value: unknown): string => optionLabel(key, String(value));

/** The phone's words per value kind (docs/36 f5; the classifier is client-core's). */
const VALUE_TEXT: ValueTextTable = {
  shape: shapeText,
  flag: (_key, value) => (value === true ? t.mobileAdmin.settings.on : t.mobileAdmin.settings.off),
  empty: emptyText,
  number: (_key, value) => String(value),
  list: listText,
  choice: labelText,
  zone: labelText,
  text: labelText,
};

/** The value as the table shows it: numbers as digits, on/off, lists joined, objects' parts. */
export function valueText(key: SettingKey, value: unknown): string {
  return valueTextBy(VALUE_TEXT, key, value);
}

/** «من 1 إلى 12» for a number; nothing for other kinds. */
export function boundsOf(key: SettingKey): string | undefined {
  const def = settingDef(key);
  if (def.type !== 'int' && def.type !== 'int_list') return undefined;
  return t.mobileValues.bounds.replace('{min}', String(def.min)).replace('{max}', String(def.max));
}
