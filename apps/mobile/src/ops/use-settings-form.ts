import type { AcademySettings } from '@ab/shared';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import {
  isDirty,
  serverErrors,
  settingsForm,
  settingsUpdate,
  type SettingsErrors,
  type SettingsForm,
} from './settings-form';
import { useSaveSettings } from './use-settings';

/** The editable copy of the saved settings: dirty tracking, validation, save, the API's errors. */
export function useSettingsForm(settings: AcademySettings) {
  const saved = settingsForm(settings);
  const savedKey = JSON.stringify(saved);
  const [form, setForm] = useState<SettingsForm>(saved);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const save = useSaveSettings();
  const seen = useRef(savedKey);
  // A refetch (another admin saved on the web) replaces the form only while nothing is typed.
  useEffect(() => {
    if (seen.current !== savedKey && !isDirty(form, JSON.parse(seen.current) as SettingsForm))
      setForm(saved);
    seen.current = savedKey;
  }, [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setNotice(null);
  };
  const submit = () => {
    const result = settingsUpdate(form, saved);
    if (!result.ok) return setErrors(result.errors);
    save.mutate(result.value, {
      onSuccess: () => setNotice(t.settings.saved),
      onError: (error) => {
        const fields =
          error instanceof ApiError && error.status === 400 ? serverErrors(error.body) : {};
        setErrors(fields);
        setNotice(
          Object.keys(fields).length ? t.mobileAdmin.settings.serverRejected : t.common.error,
        );
      },
    });
  };
  const discard = () => {
    setForm(saved);
    setErrors({});
    setNotice(null);
  };
  return {
    form,
    errors,
    notice,
    dirty: isDirty(form, saved),
    saving: save.isPending,
    set,
    submit,
    discard,
  };
}
