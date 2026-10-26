import {
  CURRENCY_ISOS,
  isEditableValueKey,
  settingDef,
  settingZod,
  tzChoices,
  VALUE_CONFIRM,
  type SettingKey,
} from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { ascii } from '../../shared/ascii-digits';

// The bottom sheet's editor model: which editor a key gets, the typed draft, and the draft parsed
// and checked with the API's own schema (settingZod) before anything is sent.

type EditorKind = 'int' | 'nullableInt' | 'bool' | 'choice' | 'text' | 'readonly';

/** on: a switch (bool, or a number that can be off); text: the typed or picked value. */
export interface Draft {
  on: boolean;
  text: string;
}

type Parsed = { ok: true; value: unknown } | { ok: false; error: string };

/** Scalars are edited here; shapes, lists and module-owned keys stay on the web. */
export function editorOf(key: SettingKey): EditorKind {
  if (!isEditableValueKey(key)) return 'readonly';
  const def = settingDef(key);
  if (def.type === 'int') return def.nullable ? 'nullableInt' : 'int';
  if (def.type === 'bool') return 'bool';
  if (def.type === 'enum' || def.type === 'currency' || def.type === 'tz') return 'choice';
  if (def.type === 'e164' || def.type === 'string') return 'text';
  return 'readonly';
}

/**
 * The picker's options, as the web's select: a stored value outside the list stays first so it
 * still shows (currencies: the stored code, then CURRENCY_ISOS).
 */
export function choicesOf(key: SettingKey, current: string): string[] {
  const def = settingDef(key);
  if (def.type === 'enum') return [...def.options];
  if (def.type === 'tz') return tzChoices(current);
  return current ? [...new Set([current, ...CURRENCY_ISOS])] : [...CURRENCY_ISOS];
}

/** The saved value as the editor's starting draft. */
export function draftOf(key: SettingKey, value: unknown): Draft {
  const def = settingDef(key);
  if (def.type === 'bool') return { on: value === true, text: '' };
  if (def.type === 'int' && def.nullable) {
    const n = typeof value === 'number' ? value : (def.onValue ?? def.min);
    return { on: value !== null, text: String(n) };
  }
  return { on: true, text: value === null || value === undefined ? '' : String(value) };
}

/** A blank box is not 0: it fails the schema. Arabic-Indic digits are read as Western ones. */
const num = (v: string): number => {
  const w = ascii(v);
  return w === '' ? Number.NaN : Number(w);
};

function rawOf(key: SettingKey, draft: Draft): unknown {
  const kind = editorOf(key);
  if (kind === 'int') return num(draft.text);
  if (kind === 'nullableInt') return draft.on ? num(draft.text) : null;
  if (kind === 'bool') return draft.on;
  return settingDef(key).type === 'e164' ? ascii(draft.text).replace(/\s/g, '') : draft.text.trim();
}

/** The draft as the value to send, or the line to show under the editor. */
export function parseDraft(key: SettingKey, draft: Draft): Parsed {
  const def = settingDef(key);
  const parsed = settingZod(def).safeParse(rawOf(key, draft));
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, error: def.type === 'e164' ? t.settings.invalidPhone : t.settings.invalid };
}

export const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Which question «احفظ» asks first: a plain dialog for the academy-wide switches; typed days only
 * when a retention can delete more data than before: turned on (from off) or made shorter than the
 * stored period. Lengthening it, or turning it off, deletes nothing and saves without typing.
 */
export function confirmOf(key: SettingKey, value: unknown, saved: unknown): 'typed' | 'plain' | null {
  const kind = VALUE_CONFIRM[key];
  if (kind !== 'typed') return kind ?? null;
  if (typeof value !== 'number') return null;
  return typeof saved !== 'number' || value < saved ? 'typed' : null;
}
