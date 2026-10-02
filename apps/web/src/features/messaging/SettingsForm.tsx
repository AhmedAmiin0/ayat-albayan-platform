import type { AcademySettings } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { updateSettings } from './api';
import { LessonGroup, MessageGroup, MoneyGroup } from './SettingsGroups';
import { settingsForm, settingsUpdate, type SettingsErrors, type SettingsForm as Form } from './settings-form';

export interface SettingsFormProps {
  settings: AcademySettings;
  onSaved: () => void;
}

/**
 * Every academy setting the phases left in the DB only (docs/10, 11, 12), one form, one save
 * (PATCH /settings, audited). The messaging kill switch is separate: it saves on its own.
 */
export function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(() => settingsForm(settings));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: (next) => {
      queryClient.setQueryData(['settings'], next);
      onSaved();
    },
  });
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <form
      noValidate
      className="grid gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        const result = settingsUpdate(form);
        if (!result.ok) return setErrors(result.errors);
        setErrors({});
        save.mutate(result.value);
      }}
    >
      <MessageGroup form={form} errors={errors} set={set} />
      <LessonGroup form={form} errors={errors} set={set} />
      <MoneyGroup form={form} errors={errors} set={set} />
      {save.isError && <FormAlert>{t.common.error}</FormAlert>}
      <div className="flex justify-end border-t border-rule pt-4">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </form>
  );
}
