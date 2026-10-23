import { SETTING_FIELD_OF, type SettingKey } from '@ab/shared';
import { isSaveOutcome } from '../values/save-result';
import { fieldIds, isDirty } from './settings-dirty';
import { FORM_KEYS, type SettingsForm } from './settings-form';

// A page's slice of the settings form (docs/26b §3): it shows some keys, sends only the ones it
// changed, and follows the server for every key it has not touched (no stale snapshot is resent).

/** The form and the last saved values it is compared against. */
export interface FormPair {
  form: SettingsForm;
  initial: SettingsForm;
}

/** The page's keys that differ from their saved value, in page order. */
export const changedKeys = (keys: readonly SettingKey[], pair: FormPair): SettingKey[] =>
  keys.filter((k) => isDirty(k, pair.form, pair.initial));

/** The form fields behind these keys, as they are in `form`. */
export function fieldsOf(keys: readonly SettingKey[], form: SettingsForm): SettingsForm {
  const out: SettingsForm = {};
  for (const id of keys.flatMap(fieldIds)) if (id in form) out[id] = form[id] ?? '';
  return out;
}

/** The sent keys the API refused as owned by another page (`{saved, moved}`, by row key or field). */
export function movedKeys(res: unknown, sent: readonly SettingKey[]): SettingKey[] {
  if (!isSaveOutcome(res)) return [];
  return sent.filter((k) => res.moved.includes(k) || res.moved.includes(SETTING_FIELD_OF[k]));
}

/** The sent keys the API wrote nothing for because it found the value invalid (`invalid`, never a 400). */
export function invalidKeys(res: unknown, sent: readonly SettingKey[]): SettingKey[] {
  const list: unknown = typeof res === 'object' && res !== null ? Reflect.get(res, 'invalid') : undefined;
  if (!Array.isArray(list)) return [];
  return sent.filter((k) => list.includes(k) || list.includes(SETTING_FIELD_OF[k]));
}

/**
 * After a save: what was sent for the written keys becomes their baseline (the moved ones stay
 * unsaved; an edit typed while saving stays dirty against what was sent).
 */
export function afterSave(pair: FormPair, written: readonly SettingKey[], sentForm: SettingsForm): FormPair {
  return { form: pair.form, initial: { ...pair.initial, ...fieldsOf(written, sentForm) } };
}

/** Fresh settings arrived: every key the admin has not changed takes the server's value. */
export function refreshed(pair: FormPair, fresh: SettingsForm): FormPair {
  const clean = FORM_KEYS.filter((k) => !isDirty(k, pair.form, pair.initial));
  const patch = fieldsOf(clean, fresh);
  return { form: { ...pair.form, ...patch }, initial: { ...pair.initial, ...patch } };
}
