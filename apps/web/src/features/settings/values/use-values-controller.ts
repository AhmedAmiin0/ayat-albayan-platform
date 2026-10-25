import { isEditableValueKey, settingDef, type AcademySettings, type ConfigEntry, type SettingKey, type SettingMeta } from '@ab/shared';
import { useCallback, useState } from 'react';
import { settingText } from '@/components/settings/search/setting-text';
import { t } from '@/lib/i18n';
import { rowForm, rowUpdate } from '../registry-form/row-form';
import type { SettingsForm } from '../registry-form/settings-form';
import type { DescribeTarget } from './describe-target';
import { useRowSaves, type RowStatus, type SaveInput } from './use-row-saves';
import { useTrackedDrafts } from './use-tracked-drafts';
import type { ValueDrafts } from './use-value-drafts';
import { confirmKind, type ConfirmKind } from './value-confirm';

export { confirmKind, type ConfirmKind };
export interface PendingConfirm {
  key: SettingKey;
  kind: ConfirmKind;
  value: unknown;
  /** «احفظ قيمتي» after a conflict: the version to send. */
  version?: number | undefined;
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
  /** Conflict: «احفظ قيمتي» (the edit again, over the newer version) / «اعتمد القيمة الجديدة» (drop the edit). */
  keepMine: (key: SettingKey) => void;
  takeTheirs: (key: SettingKey) => void;
  /** The key's row of GET /config/entries, once read. */
  entry: (key: string) => ConfigEntry | undefined;
  /** Opens «تعديل الوصف» (read it in full; edit it with the right). */
  describe: (target: DescribeTarget) => void;
}

export interface ControllerInput {
  settings: AcademySettings;
  meta: Record<string, SettingMeta>;
  canWrite: boolean;
  entries: readonly ConfigEntry[];
  describe: (target: DescribeTarget) => void;
}

const v = t.settingsValues;

/** The state of «القيم»: local edits, per-row saves, the pending confirmation and the saved note. */
export function useValuesController(input: ControllerInput) {
  const { settings, canWrite, entries } = input;
  const saves = useRowSaves();
  const { raw, drafts } = useTrackedDrafts(settings, saves);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [note, setNote] = useState<SavedNote | null>(null);
  const [history, setHistory] = useState<History>({});
  const [said, setSaid] = useState('');
  const dismissNote = useCallback(() => setNote(null), []);
  const commit = async (key: SettingKey, save: SaveInput) => {
    const prev = settings[key];
    const name = settingText(key).label;
    const end = await saves.run(key, save);
    if (end === 'failed') return setSaid(v.saveErrorNamed.replace('{name}', name));
    // The server wants the typed number (its stored value differs from ours): ask for it.
    if (end === 'confirm') return setPending({ key, kind: 'typed', value: save.value, version: save.version });
    if (end === 'conflict') return; // the conflict row is an alert: it announces itself
    // Saved, or refused as owned by a module page: either way the edit is no longer pending here.
    raw.discard(key);
    if (end === 'moved') return setSaid(v.moved);
    const at = Date.now();
    setHistory((all) => ({ ...all, [key]: { prev, at } }));
    setNote({ key, prev, id: at });
    // The undo toast is not a live region: this line is the one announcement of the save.
    setSaid(v.savedNamed.replace('{name}', name));
  };
  const saveForm = (key: SettingKey, form: SettingsForm, version?: number) => {
    if (!canWrite || !isEditableValueKey(key)) return;
    const r = rowUpdate(key, form);
    if (!r.ok) return setSaid(r.error);
    const kind = confirmKind(key, r.value, settings[key]);
    if (kind) return setPending({ key, kind, value: r.value, version });
    void commit(key, { value: r.value, version });
  };
  const api: ValuesApi = {
    settings,
    meta: input.meta,
    canWrite,
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
    keepMine: (key) => {
      const s = saves.status(key);
      if (s.state !== 'conflict') return;
      // The edit, or (a refetch dropped it as equal) the value the conflicting save sent.
      const form = raw.dirty(key) ? raw.form(key) : rowForm(key, s.mine as AcademySettings[SettingKey]);
      saveForm(key, form, s.conflict.version);
    },
    takeTheirs: (key) => drafts.discard(key),
    entry: (key) => entries.find((e) => e.key === key),
    describe: input.describe,
  };
  const cancel = () => {
    // A switch that was not confirmed goes back to its stored state.
    if (pending && settingDef(pending.key).type === 'bool') raw.discard(pending.key);
    setPending(null);
  };
  const confirm = (confirmText?: string) => {
    if (!pending) return;
    setPending(null);
    void commit(pending.key, { value: pending.value, version: pending.version, confirmText });
  };
  const undo = (n: SavedNote) => {
    setNote(null);
    api.apply(n.key, rowForm(n.key, n.prev));
  };
  return { api, pending, cancel, confirm, note, dismissNote, undo, said };
}
