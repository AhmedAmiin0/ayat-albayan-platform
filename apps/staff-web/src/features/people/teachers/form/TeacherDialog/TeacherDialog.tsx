import { tidyUsername, usernameApiError, usernameChange } from '@ab/client-core';
import type { TeacherCreate, Teacher } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button, Dialog, apiSend, t, FormAlert } from '@ab/web-kit';
import { teacherKeys, userKeys } from '@/features/people/keys';
import {
  apiErrorMessage,
  emptyTeacherForm,
  toTeacherForm,
  validateTeacher,
  type SetField,
} from '@/features/people/teachers/form/teacher-form';
import { TeacherFormFields } from '@/features/people/teachers/form/TeacherFormFields';
import { TeacherUsernameField } from '@/features/people/teachers/form/TeacherUsernameField';
import { TeacherWorkFields } from '@/features/people/teachers/form/TeacherWorkFields';

type Props = { teacher: Teacher | null; onClose: () => void };
/** The POST / PATCH body; `username` only when it changed (docs/30). */
type Payload = TeacherCreate & { username?: string | null };

/** Create (teacher = null) or edit a teacher (R-TCH-01); editing also sets the login's username (docs/30). */
export function TeacherDialog({ teacher, onClose }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [form, setForm] = useState(() => (teacher ? toTeacherForm(teacher) : emptyTeacherForm()));
  const [username, setUsername] = useState(teacher?.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const set: SetField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: (payload: Payload) =>
      teacher
        ? apiSend<Teacher>('PATCH', `/teachers/${teacher.id}`, payload)
        : apiSend<Teacher>('POST', '/teachers', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teacherKeys.all });
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      onClose();
    },
    onError: (e) =>
      setError(usernameApiError(e, t.familyAuth.teacherUsername) ?? apiErrorMessage(e)),
  });

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const result = validateTeacher(form);
    if (!result.ok) return setError(result.error);
    setUsername(tidyUsername(username));
    const name = teacher
      ? usernameChange(teacher.username, username, t.familyAuth.teacherUsername)
      : null;
    if (name && !name.ok) return setError(name.error);
    setError(null);
    save.mutate({ ...result.payload, ...name?.body });
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
        <TeacherFormFields form={form} set={set} teacher={teacher} />
        {teacher && (
          <TeacherUsernameField teacher={teacher} value={username} onChange={setUsername} />
        )}
        <TeacherWorkFields form={form} set={set} />
        {error && <FormAlert>{error}</FormAlert>}
      </form>
    </Dialog>
  );
}
