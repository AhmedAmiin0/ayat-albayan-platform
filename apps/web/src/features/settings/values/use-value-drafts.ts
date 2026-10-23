import type { AcademySettings, SettingKey } from '@ab/shared';
import { useCallback, useState } from 'react';
import { isDirty } from '../registry-form/settings-dirty';
import type { SettingsForm } from '../registry-form/settings-form';
import { rowForm } from '../registry-form/row-form';

export interface ValueDrafts {
  /** The row's fields: the local edit if there is one, else the stored value's. */
  form: (key: SettingKey) => SettingsForm;
  /** Does the local edit differ from the stored value? */
  dirty: (key: SettingKey) => boolean;
  edit: (key: SettingKey, patch: SettingsForm) => void;
  /** Replaces the row's edit with these fields (undo, reset, a switch). */
  put: (key: SettingKey, form: SettingsForm) => void;
  discard: (key: SettingKey) => void;
  /** Every key with an unsaved edit, in the order edited. */
  dirtyKeys: () => SettingKey[];
}

/**
 * The local edits of «القيم», per key. They are never reset from server data: a refetch of the
 * settings (another row saved, the window refocused) changes only the rows nobody is editing.
 */
export function useValueDrafts(settings: AcademySettings): ValueDrafts {
  const [drafts, setDrafts] = useState<Partial<Record<SettingKey, SettingsForm>>>({});
  const saved = useCallback((key: SettingKey) => rowForm(key, settings[key]), [settings]);
  const form = (key: SettingKey) => drafts[key] ?? saved(key);
  const dirty = (key: SettingKey) => {
    const draft = drafts[key];
    return draft !== undefined && isDirty(key, draft, saved(key));
  };
  const put = useCallback((key: SettingKey, next: SettingsForm) => setDrafts((all) => ({ ...all, [key]: next })), []);
  const edit = (key: SettingKey, patch: SettingsForm) =>
    setDrafts((all) => ({ ...all, [key]: { ...(all[key] ?? saved(key)), ...patch } }));
  const discard = useCallback(
    (key: SettingKey) =>
      setDrafts((all) => Object.fromEntries(Object.entries(all).filter(([k]) => k !== key)) as typeof all),
    [],
  );
  const dirtyKeys = () => (Object.keys(drafts) as SettingKey[]).filter(dirty);
  return { form, dirty, edit, put, discard, dirtyKeys };
}
