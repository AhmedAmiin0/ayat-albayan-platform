import type { AcademySettings } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { updateSettings } from './api';
import { settingsForm, settingsUpdate, type SettingsErrors, type SettingsForm } from './settings-form';

export interface SettingsFormState {
  form: SettingsForm;
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
  const [form, setForm] = useState<SettingsForm>(() => settingsForm(settings));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: (next) => {
      queryClient.setQueryData(['settings'], next);
      // The public subset (join window, upload limit, …) other screens read.
      void queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
      onSaved();
    },
  });
  const set = (patch: SettingsForm) => setForm((f) => ({ ...f, ...patch }));
  const submit = () => {
    const result = settingsUpdate(form);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    save.mutate(result.value);
  };
  return { form, errors, set, submit, saving: save.isPending, failed: save.isError };
}
