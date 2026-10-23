import type { AcademySettings, SettingKey } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { isDefault, isDirty, resetPatch } from '../config/settings-dirty';
import { updateSettings } from '@/lib/settings-api';
import { settingsForm, settingsUpdate, type SettingsErrors, type SettingsForm } from './settings-form';

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
  /** Validates every field, then one PATCH /settings (audited); errors stay on their fields. */
  submit: () => void;
  saving: boolean;
  failed: boolean;
}

/**
 * The academy settings form's state, shared by every section of /admin/settings: the fields live
 * in their own sections (messages, schedule, reports, accounts), one «حفظ» saves them all. The
 * switches (sending, automatic messages, auto-assign) save on their own, as before.
 */
export function useSettingsForm(settings: AcademySettings, onSaved: () => void): SettingsFormState {
  const queryClient = useQueryClient();
  const [initial, setInitial] = useState<SettingsForm>(() => settingsForm(settings));
  const [form, setForm] = useState<SettingsForm>(initial);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: (next) => {
      queryClient.setQueryData(['settings'], next);
      // The public subset (join window, upload limit, …) other screens read.
      void queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
      void queryClient.invalidateQueries({ queryKey: ['config', 'meta'] });
      onSaved();
    },
  });
  const set = (patch: SettingsForm) => setForm((f) => ({ ...f, ...patch }));
  const submit = () => {
    const result = settingsUpdate(form);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    const sent = form;
    save.mutate(result.value, { onSuccess: () => setInitial(sent) });
  };
  return {
    form,
    initial,
    dirty: (key) => isDirty(key, form, initial),
    atDefault: (key) => isDefault(key, form),
    reset: (key) => set(resetPatch(key)),
    errors,
    set,
    submit,
    saving: save.isPending,
    failed: save.isError,
  };
}
