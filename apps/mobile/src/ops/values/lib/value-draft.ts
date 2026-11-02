import {
  CURRENCY_ISOS,
  isEditableValueKey,
  settingDef,
  settingZod,
  tzChoices,
  VALUE_CONFIRM,
  byType,
  type SettingKey,
  type SettingTypeTable,
} from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { ascii } from '@/ops/shared/ascii-digits';

// The bottom sheet's editor model: which editor a key gets, the typed draft, and the draft parsed
// and checked with the API's own schema (settingZod) before anything is sent.

export type EditorKind = 'int' | 'nullableInt' | 'bool' | 'choice' | 'text' | 'readonly';

/** on: a switch (bool, or a number that can be off); text: the typed or picked value. */
export interface Draft {
  on: boolean;
  text: string;
}

type Parsed = { ok: true; value: unknown } | { ok: false; error: string };

/** The phone's editor per setting type: lists and shapes stay on the web (docs/36 f5). */
const EDITOR_OF: SettingTypeTable<EditorKind> = {
  int: (def) => (def.nullable ? 'nullableInt' : 'int'),
  bool: () => 'bool',
  enum: () => 'choice',
  currency: () => 'choice',
  tz: () => 'choice',
  e164: () => 'text',
  string: () => 'text',
  int_list: () => 'readonly',
  json: () => 'readonly',
};

/** Scalars are edited here; shapes, lists and module-owned keys stay on the web. */
export function editorOf(key: SettingKey): EditorKind {
  if (!isEditableValueKey(key)) return 'readonly';
  return byType(EDITOR_OF, settingDef(key));
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

const textOf = (key: SettingKey, draft: Draft): string =>
  settingDef(key).type === 'e164' ? ascii(draft.text).replace(/\s/g, '') : draft.text.trim();

/** The draft as the raw value the schema checks, per editor. */
const RAW_OF: Record<EditorKind, (key: SettingKey, draft: Draft) => unknown> = {
  int: (_key, draft) => num(draft.text),
  nullableInt: (_key, draft) => (draft.on ? num(draft.text) : null),
  bool: (_key, draft) => draft.on,
  choice: textOf,
  text: textOf,
  readonly: textOf,
};

const rawOf = (key: SettingKey, draft: Draft): unknown => RAW_OF[editorOf(key)](key, draft);

/** The draft as the value to send, or the line to show under the editor. */
export function parseDraft(key: SettingKey, draft: Draft): Parsed {
  const def = settingDef(key);
  const parsed = settingZod(def).safeParse(rawOf(key, draft));
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, error: def.type === 'e164' ? t.settings.invalidPhone : t.settings.invalid };
}

export const sameValue = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Which question «احفظ» asks first: a plain dialog for the academy-wide switches; typed days only
 * when a retention can delete more data than before: turned on (from off) or made shorter than the
 * stored period. Lengthening it, or turning it off, deletes nothing and saves without typing.
 */
export function confirmOf(
  key: SettingKey,
  value: unknown,
  saved: unknown,
): 'typed' | 'plain' | null {
  const kind = VALUE_CONFIRM[key];
  if (kind !== 'typed') return kind ?? null;
  if (typeof value !== 'number') return null;
  return typeof saved !== 'number' || value < saved ? 'typed' : null;
}
