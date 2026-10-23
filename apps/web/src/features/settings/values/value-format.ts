import { SETTING_DEFAULTS, settingDef, type SettingKey } from '@ab/shared';
import { tzCity } from '@/components/ui/time-zone-select';
import { t } from '@/lib/i18n';
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
  if (def.type !== 'json' || value === null || typeof value !== 'object') return t.common.unset;
  const obj = value as Record<string, string | undefined>;
  const parts = def.shape.map((f) => obj[f.name]).filter((s): s is string => typeof s === 'string' && s !== '');
  return parts.length > 0 ? parts.join(' · ') : t.common.unset;
}

/** One stored value as text, by the setting's type. */
export function valueText(key: SettingKey, value: unknown): string {
  const def = settingDef(key);
  if (def.type === 'json') return shapeText(key, value);
  if (typeof value === 'boolean') return onOff(value);
  if (value === null || value === undefined) return def.type === 'int' && def.nullable ? v.off : t.common.unset;
  if (typeof value === 'number') return countText(key, value);
  if (Array.isArray(value)) return [value.join(t.common.listSeparator), unitWord(key, Number(value.at(-1)))].filter(Boolean).join(' ');
  const text = String(value);
  if (def.type === 'enum') return ENUM_WORDS[text] ?? text;
  if (def.type === 'tz') return tzCity(text) ?? text;
  return text;
}

/** «من 1 إلى 12» (numbers), «من 1 إلى 60 حرفًا» (text); nothing for the other kinds. */
export function boundsText(key: SettingKey): string | undefined {
  const def = settingDef(key);
  const fill = (s: string, min: number, max: number) => s.replace('{min}', String(min)).replace('{max}', String(max));
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
