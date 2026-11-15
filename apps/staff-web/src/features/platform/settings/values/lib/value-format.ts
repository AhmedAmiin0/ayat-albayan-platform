import { shapeParts, valueTextBy, type ValueTextTable } from '@ab/client-core';
import { SETTING_DEFAULTS, settingDef, type SettingKey } from '@ab/shared';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { countText, unitWord } from './value-units';

// A value as words: the read-only cells, the default column, «المحفوظ: …», the phone button.

const v = t.settingsValues;
const ENUM_WORDS: Record<string, string> = {
  buttons: t.templates.settings.feedbackModeButtons,
  link: t.templates.settings.feedbackModeLink,
  legacy: t.numbers.source.legacy,
  module: t.numbers.source.module,
};

export const onOff = (on: boolean): string => (on ? v.on : v.off);

function shapeText(key: SettingKey, value: unknown): string {
  const def = settingDef(key);
  const parts =
    def.type === 'json'
      ? shapeParts(
          value,
          def.shape.map((f) => f.name),
        )
      : [];
  return parts.length > 0 ? parts.join(' · ') : t.common.unset;
}

function emptyText(key: SettingKey): string {
  const def = settingDef(key);
  return def.type === 'int' && def.nullable ? v.off : t.common.unset;
}

function listText(key: SettingKey, value: unknown): string {
  const list = Array.isArray(value) ? (value as unknown[]) : [];
  const words = [list.join(t.common.listSeparator), unitWord(key, Number(list.at(-1)))];
  return words.filter(Boolean).join(' ');
}

const enumWord = (text: string): string =>
  (Object.hasOwn(ENUM_WORDS, text) ? ENUM_WORDS[text] : undefined) ?? text;

/** The web's words per value kind (docs/36 f5; the classifier is client-core's). */
const VALUE_TEXT: ValueTextTable = {
  shape: shapeText,
  flag: (_key, value) => onOff(value === true),
  empty: emptyText,
  number: (key, value) => countText(key, Number(value)),
  list: listText,
  choice: (_key, value) => enumWord(String(value)),
  zone: (_key, value) => tzCity(String(value)) ?? String(value),
  text: (_key, value) => String(value),
};

/** One stored value as text, by the setting's type. */
export function valueText(key: SettingKey, value: unknown): string {
  return valueTextBy(VALUE_TEXT, key, value);
}

/** «من 1 إلى 12» (numbers), «من 1 إلى 60 حرفًا» (text); nothing for the other kinds. */
export function boundsText(key: SettingKey): string | undefined {
  const def = settingDef(key);
  const fill = (s: string, min: number, max: number) =>
    s.replace('{min}', String(min)).replace('{max}', String(max));
  if (def.type === 'int' || def.type === 'int_list') return fill(v.bounds, def.min, def.max);
  if (def.type === 'string') return fill(v.lengthBounds, def.minLength, def.maxLength);
  return undefined;
}

/** The default as text; a number that is OFF by default also says what turning it on sets. */
export function defaultText(key: SettingKey): string {
  return valueText(key, SETTING_DEFAULTS[key]);
}

/** The second line of the default column: «24 عند التشغيل · من 1 إلى 168» or the bounds. */
export function defaultNote(key: SettingKey): string | undefined {
  const def = settingDef(key);
  const bounds = boundsText(key);
  if (def.type === 'int' && def.nullable && SETTING_DEFAULTS[key] === null) {
    const on = v.onValue.replace('{value}', String(def.onValue ?? def.min));
    return [on, bounds].filter(Boolean).join(' · ');
  }
  return bounds;
}
