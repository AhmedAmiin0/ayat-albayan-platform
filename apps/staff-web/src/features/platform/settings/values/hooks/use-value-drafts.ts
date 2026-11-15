import type { AcademySettings, SettingKey } from '@ab/shared';
import { useCallback, useState } from 'react';
import { isDirty } from '@/features/platform/settings/registry-form/settings-dirty';
import type { SettingsForm } from '@/features/platform/settings/registry-form/settings-form';
import { rowForm } from '@/features/platform/settings/registry-form/row-form';

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

type Drafts = Partial<Record<SettingKey, SettingsForm>>;

const without = (all: Drafts, key: SettingKey): Drafts =>
  Object.fromEntries(Object.entries(all).filter(([k]) => k !== key)) as Drafts;

/** Sets the row's draft, or drops it when it holds the stored value (a draft is only ever an edit). */
export function placeDraft(all: Drafts, key: SettingKey, input: { next: SettingsForm; settings: AcademySettings }): Drafts {
  return isDirty(key, input.next, rowForm(key, input.settings[key])) ? { ...all, [key]: input.next } : without(all, key);
}

/** Drops the drafts that now equal the stored value (another save, a refetch); the same object when none do. */
export function pruneDrafts(all: Drafts, settings: AcademySettings): Drafts {
  const keys = Object.keys(all) as SettingKey[];
  const stale = keys.filter((k) => {
    const draft = all[k];
    return draft !== undefined && !isDirty(k, draft, rowForm(k, settings[k]));
  });
  return stale.length === 0 ? all : stale.reduce(without, all);
}

/**
 * The local edits of «القيم», per key. They are never overwritten by server data: a refetch of the
 * settings (another row saved, the window refocused) changes only the rows nobody is editing. A
 * draft that equals the stored value is dropped (typed back, or the server now holds it), so it
 * never hides a newer stored value.
 */
export function useValueDrafts(settings: AcademySettings): ValueDrafts {
  const [drafts, setDrafts] = useState<Drafts>({});
  const saved = useCallback((key: SettingKey) => rowForm(key, settings[key]), [settings]);
  // New settings (a refetch): drop the drafts they now hold, during render (no extra effect pass).
  const [seen, setSeen] = useState(settings);
  if (seen !== settings) {
    setSeen(settings);
    setDrafts((all) => pruneDrafts(all, settings));
  }
  const form = (key: SettingKey) => drafts[key] ?? saved(key);
  const dirty = (key: SettingKey) => {
    const draft = drafts[key];
    return draft !== undefined && isDirty(key, draft, saved(key));
  };
  const put = useCallback(
    (key: SettingKey, next: SettingsForm) => setDrafts((all) => placeDraft(all, key, { next, settings })),
    [settings],
  );
  const edit = (key: SettingKey, patch: SettingsForm) =>
    setDrafts((all) => placeDraft(all, key, { next: { ...(all[key] ?? saved(key)), ...patch }, settings }));
  const discard = useCallback((key: SettingKey) => setDrafts((all) => without(all, key)), []);
  const dirtyKeys = () => (Object.keys(drafts) as SettingKey[]).filter(dirty);
  return { form, dirty, edit, put, discard, dirtyKeys };
}
