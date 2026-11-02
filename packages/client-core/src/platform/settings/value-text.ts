import { settingDef, type SettingDef, type SettingKey, type SettingType } from '@ab/shared';
import { z } from 'zod';

// «القيم» on both apps (docs/36 f5): one classifier picks what kind of value a setting holds; each
// app keeps its own words for each kind in a VALUE_TEXT table (web units and tz cities, phone
// i18n option labels).

/** What a stored value is, for the words that show it. */
export type ValueKind = 'shape' | 'flag' | 'empty' | 'number' | 'list' | 'choice' | 'zone' | 'text';

/** An app's words per kind: the table, the default column, «المحفوظ: …». */
export type ValueTextTable = Record<ValueKind, (key: SettingKey, value: unknown) => string>;

const objectValue = z.record(z.string(), z.unknown());

/** Ordered: the first kind whose test holds wins. A `json` entry is always a shape. */
const KIND_TESTS: readonly (readonly [ValueKind, (def: SettingDef, value: unknown) => boolean])[] =
  [
    ['shape', (def) => def.type === 'json'],
    ['flag', (_def, value) => typeof value === 'boolean'],
    ['empty', (_def, value) => value === null || value === undefined],
    ['number', (_def, value) => typeof value === 'number'],
    ['list', (_def, value) => Array.isArray(value)],
    ['shape', (_def, value) => objectValue.safeParse(value).success],
  ];

/** A string (or anything left) by the entry's type: an option, a zone, or plain text. */
const LEFT_KIND: Partial<Record<SettingType, ValueKind>> = { enum: 'choice', tz: 'zone' };

/** The kind of one stored value of this entry. */
export function valueKind(def: SettingDef, value: unknown): ValueKind {
  const hit = KIND_TESTS.find(([, test]) => test(def, value));
  return hit ? hit[0] : (LEFT_KIND[def.type] ?? 'text');
}

/** One stored value as text, in the app's words for its kind. */
export function valueTextBy(table: ValueTextTable, key: SettingKey, value: unknown): string {
  return table[valueKind(settingDef(key), value)](key, value);
}

/** An object value's non-empty strings: its named fields in that order, else all its values. */
export function shapeParts(value: unknown, names?: readonly string[]): string[] {
  const obj = objectValue.safeParse(value);
  if (!obj.success) return [];
  const parts = names ? names.map((name) => obj.data[name]) : Object.values(obj.data);
  return parts.filter((s): s is string => typeof s === 'string' && s !== '');
}
