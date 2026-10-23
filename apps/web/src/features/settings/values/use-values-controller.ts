import { isEditableValueKey, settingDef, VALUE_CONFIRM, type AcademySettings, type SettingKey, type SettingMeta, type SettingsUpdate } from '@ab/shared';
import { useCallback, useState } from 'react';
import { settingText } from '@/components/settings/setting-text';
import { t } from '@/lib/i18n';
import { rowForm, rowUpdate } from '../registry-form/row-form';
import type { SettingsForm } from '../registry-form/settings-form';
import { useRowSaves, type RowStatus } from './use-row-saves';
import { useValueDrafts, type ValueDrafts } from './use-value-drafts';

export type ConfirmKind = 'typed' | 'plain';
export interface PendingConfirm {
  key: SettingKey;
  body: SettingsUpdate;
  kind: ConfirmKind;
  value: unknown;
}
/** The last saved row, for the toast's «تراجع» (it re-saves `prev`). */
export interface SavedNote {
  key: SettingKey;
  prev: AcademySettings[SettingKey];
  id: number;
}

export interface ValuesApi {
  settings: AcademySettings;
  meta: Record<string, SettingMeta>;
  canWrite: boolean;
  drafts: ValueDrafts;
  status: (key: SettingKey) => RowStatus;
  /** The validation line of a dirty row (live, before any save). */
  error: (key: SettingKey) => string | undefined;
  /** Validates the row, asks first when the registry says so, then saves it alone. */
  save: (key: SettingKey) => void;
  /** Puts these fields in the row and saves them (a switch, «أعد القيمة الافتراضية», undo, a shape dialog). */
  apply: (key: SettingKey, form: SettingsForm) => void;
  announce: (message: string) => void;
}

/** Typed for a number of days that deletes data; plain for the booking-wide switches. */
export function confirmKind(key: SettingKey, value: unknown): ConfirmKind | undefined {
  const kind = VALUE_CONFIRM[key];
  if (kind === 'typed') return typeof value === 'number' ? 'typed' : undefined;
  return kind;
}

const v = t.settingsValues;

/** The state of «القيم»: local edits, per-row saves, the pending confirmation and the saved note. */
export function useValuesController(input: { settings: AcademySettings; meta: Record<string, SettingMeta>; canWrite: boolean }) {
  const { settings, canWrite } = input;
  const drafts = useValueDrafts(settings);
  const saves = useRowSaves();
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [note, setNote] = useState<SavedNote | null>(null);
  const [said, setSaid] = useState('');
  const dismissNote = useCallback(() => setNote(null), []);
  const commit = async (key: SettingKey, body: SettingsUpdate) => {
    const prev = settings[key];
    const name = settingText(key).label;
    const end = await saves.run(key, body);
    if (end === 'saved') {
      drafts.discard(key);
      setNote({ key, prev, id: Date.now() });
      setSaid(v.savedNamed.replace('{name}', name));
    } else setSaid((end === 'moved' ? v.moved : v.saveErrorNamed).replace('{name}', name));
  };
  const saveForm = (key: SettingKey, form: SettingsForm) => {
    if (!canWrite || !isEditableValueKey(key)) return;
    const r = rowUpdate(key, form);
    if (!r.ok) return setSaid(r.error);
    const kind = confirmKind(key, r.value);
    if (kind) return setPending({ key, body: r.body, kind, value: r.value });
    void commit(key, r.body);
  };
  const api: ValuesApi = {
    ...input,
    drafts,
    status: saves.status,
    error: (key) => {
      if (!drafts.dirty(key)) return undefined;
      const r = rowUpdate(key, drafts.form(key));
      return r.ok ? undefined : r.error;
    },
    save: (key) => saveForm(key, drafts.form(key)),
    apply: (key, form) => {
      if (!canWrite || !isEditableValueKey(key)) return;
      drafts.put(key, form);
      saveForm(key, form);
    },
    announce: setSaid,
  };
  const cancel = () => {
    // A switch that was not confirmed goes back to its stored state.
    if (pending && settingDef(pending.key).type === 'bool') drafts.discard(pending.key);
    setPending(null);
  };
  const confirm = () => {
    if (!pending) return;
    setPending(null);
    void commit(pending.key, pending.body);
  };
  const undo = (n: SavedNote) => {
    setNote(null);
    api.apply(n.key, rowForm(n.key, n.prev));
  };
  return { api, pending, cancel, confirm, note, dismissNote, undo, said };
}
