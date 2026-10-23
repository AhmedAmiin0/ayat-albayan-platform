import { isEditableValueKey, settingDef, type AcademySettings, type SettingKey, type SettingMeta, type SettingsUpdate } from '@ab/shared';
import { useCallback, useState } from 'react';
import { settingText } from '@/components/settings/setting-text';
import { t } from '@/lib/i18n';
import { rowForm, rowUpdate } from '../registry-form/row-form';
import type { SettingsForm } from '../registry-form/settings-form';
import { useRowSaves, type RowStatus } from './use-row-saves';
import { useValueDrafts, type ValueDrafts } from './use-value-drafts';
import { confirmKind, type ConfirmKind } from './value-confirm';

export { confirmKind, type ConfirmKind };
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
/** Per key, the value a save in this visit replaced and when that save landed. */
type History = Partial<Record<SettingKey, { prev: AcademySettings[SettingKey]; at: number }>>;

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
  /** The value the last save of this key replaced («أعد القيمة السابقة»), if it was saved in this visit. */
  previous: (key: SettingKey) => { value: AcademySettings[SettingKey] } | undefined;
  /** When this key last saved (the phone sheet closes on a new one). */
  savedAt: (key: SettingKey) => number | undefined;
  announce: (message: string) => void;
}

const v = t.settingsValues;

/** The state of «القيم»: local edits, per-row saves, the pending confirmation and the saved note. */
export function useValuesController(input: { settings: AcademySettings; meta: Record<string, SettingMeta>; canWrite: boolean }) {
  const { settings, canWrite } = input;
  const raw = useValueDrafts(settings);
  const saves = useRowSaves();
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [note, setNote] = useState<SavedNote | null>(null);
  const [history, setHistory] = useState<History>({});
  const [said, setSaid] = useState('');
  const dismissNote = useCallback(() => setNote(null), []);
  // Any change to a row (an edit, «تراجع», a new value) ends a failed save's «أعد المحاولة».
  const drafts: ValueDrafts = {
    ...raw,
    edit: (key, patch) => {
      saves.clearFailed(key);
      raw.edit(key, patch);
    },
    put: (key, form) => {
      saves.clearFailed(key);
      raw.put(key, form);
    },
    discard: (key) => {
      saves.clearFailed(key);
      raw.discard(key);
    },
  };
  const commit = async (key: SettingKey, body: SettingsUpdate) => {
    const prev = settings[key];
    const name = settingText(key).label;
    const end = await saves.run(key, body);
    if (end === 'failed') return setSaid(v.saveErrorNamed.replace('{name}', name));
    // Saved, or refused as owned by a module page: either way the edit is no longer pending here.
    raw.discard(key);
    if (end === 'moved') return setSaid(v.moved);
    const at = Date.now();
    setHistory((all) => ({ ...all, [key]: { prev, at } }));
    setNote({ key, prev, id: at });
    // The undo toast is not a live region: this line is the one announcement of the save.
    setSaid(v.savedNamed.replace('{name}', name));
  };
  const saveForm = (key: SettingKey, form: SettingsForm) => {
    if (!canWrite || !isEditableValueKey(key)) return;
    const r = rowUpdate(key, form);
    if (!r.ok) return setSaid(r.error);
    const kind = confirmKind(key, r.value, settings[key]);
    if (kind) return setPending({ key, body: r.body, kind, value: r.value });
    void commit(key, r.body);
  };
  const api: ValuesApi = {
    ...input,
    drafts,
    status: saves.status,
    error: (key) => {
      if (!raw.dirty(key)) return undefined;
      const r = rowUpdate(key, raw.form(key));
      return r.ok ? undefined : r.error;
    },
    save: (key) => saveForm(key, raw.form(key)),
    apply: (key, form) => {
      if (!canWrite || !isEditableValueKey(key)) return;
      drafts.put(key, form);
      saveForm(key, form);
    },
    previous: (key) => {
      const h = history[key];
      return h ? { value: h.prev } : undefined;
    },
    savedAt: (key) => history[key]?.at,
    announce: setSaid,
  };
  const cancel = () => {
    // A switch that was not confirmed goes back to its stored state.
    if (pending && settingDef(pending.key).type === 'bool') raw.discard(pending.key);
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
