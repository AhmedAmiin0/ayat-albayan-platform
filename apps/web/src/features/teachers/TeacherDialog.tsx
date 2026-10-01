import type { TeacherCreate } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { Teacher } from './api';
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

  const title = teacher ? t.teachers.edit : t.teachers.add;
  return (
    <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}>
      <dialog
        open
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 z-50 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6 text-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
          <TeacherFormFields form={form} set={set} />
          <TeacherWorkFields form={form} set={set} />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t.common.saving : t.common.save}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
