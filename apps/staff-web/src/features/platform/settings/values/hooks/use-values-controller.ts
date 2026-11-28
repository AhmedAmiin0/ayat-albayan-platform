import {
  isEditableValueKey,
  settingDef,
  type AcademySettings,
  type SettingKey,
} from '@ab/settings';
import { useCallback, useState } from 'react';
import { settingText } from '@/components/settings/search/setting-text';
import { t } from '@ab/web-kit';
import { rowForm, rowUpdate } from '@/features/platform/settings/registry-form/row-form';
import type { SettingsForm } from '@/features/platform/settings/registry-form/settings-form';
import { useRowSaves, type SaveInput } from './use-row-saves';
import { useTrackedDrafts } from './use-tracked-drafts';
import type {
  ControllerInput,
  History,
  PendingConfirm,
  SavedNote,
  ValuesApi,
} from './use-values-controller.types';
import {
  confirmKind,
  type ConfirmKind,
} from '@/features/platform/settings/values/sheet/value-confirm';

export { confirmKind, type ConfirmKind };

const v = t.settingsValues;

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
    if (end === 'failed') {  setSaid(v.saveErrorNamed.replace('{name}', name));; return; }
    // The server wants the typed number (its stored value differs from ours): ask for it.
    if (end === 'confirm') {  setPending({ key, kind: 'typed', value: save.value, version: save.version });; return; }
    if (end === 'conflict') return; // the conflict row is an alert: it announces itself
    // Saved, or refused as owned by a module page: either way the edit is no longer pending here.
    raw.discard(key);
    if (end === 'moved') {  setSaid(v.moved);; return; }
    const at = Date.now();
    setHistory((all) => ({ ...all, [key]: { prev, at } }));
    setNote({ key, prev, id: at });
    // The undo toast is not a live region: this line is the one announcement of the save.
    setSaid(v.savedNamed.replace('{name}', name));
  };
  const saveForm = (key: SettingKey, form: SettingsForm, version?: number) => {
    if (!canWrite || !isEditableValueKey(key)) return;
    const r = rowUpdate(key, form);
    if (!r.ok) {  setSaid(r.error);; return; }
    const kind = confirmKind(key, r.value, settings[key]);
    if (kind) {  setPending({ key, kind, value: r.value, version });; return; }
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
      const form = raw.dirty(key)
        ? raw.form(key)
        : rowForm(key, s.mine as AcademySettings[SettingKey]);
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
