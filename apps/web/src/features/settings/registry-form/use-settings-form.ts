import { SETTING_FIELD_OF, type AcademySettings, type SettingKey } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import { CONFIG_QUERY_KEYS } from '@/lib/query-keys';
import { updateSettings } from '@/lib/settings-api';
import { isDefault, isDirty, resetPatch } from './settings-dirty';
import { FORM_KEYS, settingsForm, settingsUpdate, type SettingsErrors, type SettingsForm } from './settings-form';
import { afterSave, changedKeys, invalidKeys, movedKeys, refreshed, type FormPair } from './settings-scope';

export interface SettingsFormState {
  form: SettingsForm;
  /** The last saved values (what «معدَّل» compares against). */
  initial: SettingsForm;
  dirty: (key: SettingKey) => boolean;
  atDefault: (key: SettingKey) => boolean;
  /** Back to the setting's default (unsaved until «حفظ»). */
  reset: (key: SettingKey) => void;
  errors: SettingsErrors;
  set: (patch: SettingsForm) => void;
  /** Validates the changed fields, then one PATCH /settings with them only; errors stay on their fields. */
  submit: () => void;
  /** The page's keys changed and not saved yet (for the leave guard). */
  changed: SettingKey[];
  saving: boolean;
  failed: boolean;
}

export interface SettingsFormOptions {
  /** The keys this page shows and saves (default: every form key). */
  keys?: readonly SettingKey[];
  /** After a save; `moved` lists the sent keys another page owns (the API did not write them). */
  onSaved: (result: { moved: SettingKey[] }) => void;
}

/**
 * The settings form of one page (today «مواعيد الرسائل» on «التواصل»). «حفظ» sends only the keys
 * the admin changed among the page's own, so a value saved elsewhere (on «القيم», by another admin)
 * is never overwritten from a stale copy; the keys not being edited follow fresh settings. After a
 * save the settings, «آخر تعديل» and the public config are refetched (never written from the answer).
 */
export function useSettingsForm(settings: AcademySettings, options: SettingsFormOptions): SettingsFormState {
  const keys = options.keys ?? FORM_KEYS;
  const queryClient = useQueryClient();
  const [pair, setPair] = useState<FormPair>(() => {
    const form = settingsForm(settings);
    return { form, initial: form };
  });
  const [errors, setErrors] = useState<SettingsErrors>({});
  const seen = useRef(settings);
  useEffect(() => {
    if (seen.current === settings) return;
    seen.current = settings;
    setPair((p) => refreshed(p, settingsForm(settings)));
  }, [settings]);
  const save = useMutation({ mutationFn: updateSettings });
  const set = (patch: SettingsForm) => setPair((p) => ({ ...p, form: { ...p.form, ...patch } }));
  const changed = changedKeys(keys, pair);
  const submit = () => {
    const result = settingsUpdate(pair.form, changed);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    const sent = changed;
    if (sent.length === 0) return options.onSaved({ moved: [] });
    const snapshot = pair.form;
    save.mutate(result.value, {
      onSuccess: (res: unknown) => {
        const moved = movedKeys(res, sent);
        const invalid = invalidKeys(res, sent);
        const written = sent.filter((k) => !moved.includes(k) && !invalid.includes(k));
        setErrors(Object.fromEntries(invalid.map((k) => [SETTING_FIELD_OF[k], t.settings.invalid])));
        setPair((p) => afterSave(p, written, snapshot));
        for (const queryKey of [CONFIG_QUERY_KEYS.settings, CONFIG_QUERY_KEYS.settingsMeta, CONFIG_QUERY_KEYS.publicConfig]) {
          void queryClient.invalidateQueries({ queryKey });
        }
        if (written.length > 0 || moved.length > 0) options.onSaved({ moved });
      },
    });
  };
  return {
    form: pair.form,
    initial: pair.initial,
    dirty: (key) => isDirty(key, pair.form, pair.initial),
    atDefault: (key) => isDefault(key, pair.form),
    reset: (key) => set(resetPatch(key)),
    errors,
    set,
    submit,
    changed,
    saving: save.isPending,
    failed: save.isError,
  };
}
