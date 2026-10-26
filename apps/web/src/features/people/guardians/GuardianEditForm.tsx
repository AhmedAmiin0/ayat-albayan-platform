import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { PhonePreview } from '@/components/ui/form/phone-preview';
import { STUDENTS_KEY } from '@/features/people/students/api';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { GUARDIANS_KEY, guardianDetailQuery, updateGuardian, type GuardianDetail } from './api';
import { guardianPatch, guardianValues, type GuardianErrors, type GuardianValues } from './guardian-form';
import { SourceField } from './SourceField';

export interface GuardianEditDialogProps {
  guardianId: string;
  onClose: () => void;
  onDone: (notice: string) => void;
}

/**
 * «تعديل ولي الأمر» (research-forms item 10): the name, «رقم الواتساب (مع كود الدولة)», the
 * country, «عرفت عننا منين؟» and notes, saved with PATCH /guardians/:id (admin only).
 */
export function GuardianEditDialog({ guardianId, onClose, onDone }: GuardianEditDialogProps) {
  const guardian = useQuery(guardianDetailQuery(guardianId));
  return (
    <Dialog title={t.guardians.edit} onClose={onClose} className="max-w-[640px]">
      {guardian.isError && <FormAlert>{t.common.error}</FormAlert>}
      {guardian.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {guardian.data && <GuardianForm guardian={guardian.data} onClose={onClose} onDone={onDone} />}
    </Dialog>
  );
}

function GuardianForm({ guardian, onClose, onDone }: { guardian: GuardianDetail } & Omit<GuardianEditDialogProps, 'guardianId'>) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<GuardianValues>(() => guardianValues(guardian));
  const [errors, setErrors] = useState<GuardianErrors>({});
  const save = useMutation({
    mutationFn: updateGuardian,
    onSuccess: async () => {
      for (const queryKey of [GUARDIANS_KEY, STUDENTS_KEY]) await queryClient.invalidateQueries({ queryKey });
      onDone(t.guardians.updated);
    },
  });
  const set = (patch: Partial<GuardianValues>) => setValues((v) => ({ ...v, ...patch }));
  const text = (key: 'name' | 'country' | 'notes', label: string, hint?: string) => (
    <Field label={label} hint={hint} error={errors[key]}>
      {(p) => <Input {...p} value={values[key]} onChange={(e) => set({ [key]: e.target.value })} />}
    </Field>
  );
  const failed = save.error instanceof ApiError && save.error.status === 409 ? t.guardians.phoneTaken : t.common.error;

  return (
    <form
      noValidate
      className="grid gap-x-5 gap-y-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const r = guardianPatch(values);
        if (!r.ok) return setErrors(r.errors);
        setErrors({});
        save.mutate({ id: guardian.id, patch: r.patch });
      }}
    >
      {text('name', t.guardians.name)}
      <Field label={t.guardians.phone} hint={t.guardians.phoneHint} error={errors.phone} required>
        {(p) => (
          <>
            <Input {...p} type="tel" dir="ltr" value={values.phone} onChange={(e) => set({ phone: e.target.value })} />
            <PhonePreview value={values.phone} />
          </>
        )}
      </Field>
      {text('country', t.guardians.country, t.guardians.countryHint)}
      <SourceField value={values.source} onChange={(source) => set({ source })} />
      <div className="sm:col-span-2">{text('notes', t.guardians.notes)}</div>
      {save.isError && <FormAlert className="sm:col-span-2">{failed}</FormAlert>}
      <div className="flex flex-wrap justify-end gap-2.5 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? t.common.saving : t.common.save}</Button>
      </div>
    </form>
  );
}
