import type { TeacherCreate } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { Teacher } from './api';
import { FormAlert } from './FormAlert';
import {
  apiErrorMessage,
  emptyTeacherForm,
  toTeacherForm,
  validateTeacher,
  type SetField,
} from './teacher-form';
import { TeacherFormFields } from './TeacherFormFields';
import { TeacherWorkFields } from './TeacherWorkFields';

type Props = { teacher: Teacher | null; onClose: () => void };

/** Create (teacher = null) or edit a teacher. R-TCH-01. */
export function TeacherDialog({ teacher, onClose }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [form, setForm] = useState(() => (teacher ? toTeacherForm(teacher) : emptyTeacherForm()));
  const [error, setError] = useState<string | null>(null);
  const set: SetField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: (payload: TeacherCreate) =>
      teacher
        ? apiSend<Teacher>('PATCH', `/teachers/${teacher.id}`, payload)
        : apiSend<Teacher>('POST', '/teachers', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teachers'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateTeacher(form);
    if (result.ok) {
      setError(null);
      save.mutate(result.payload);
    } else setError(result.error);
  };

  return (
    <Dialog
      title={teacher ? t.teachers.edit : t.teachers.add}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {save.isPending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="flex flex-col gap-6" onSubmit={submit} noValidate>
        <TeacherFormFields form={form} set={set} />
        <TeacherWorkFields form={form} set={set} />
        {error && <FormAlert>{error}</FormAlert>}
      </form>
    </Dialog>
  );
}
