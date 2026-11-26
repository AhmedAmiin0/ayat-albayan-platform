import { recordView, teacherModes } from '@ab/client-core';
import { RadioChips, t } from '@ab/web-kit';
import { LinkPicker } from '@/features/people/users/create/LinkPicker';
import { NewTeacherFields } from '@/features/people/users/create/NewTeacherFields';
import type { RecordFieldsProps } from './RecordFields.types';

/** The record of a teacher / student / guardian login: an existing row, or (teacher) a new one. */
export function RecordFields({ kind, value, onChange, errors, locked = false }: RecordFieldsProps) {
  const view = recordView(kind, value, onChange);
  const L = t.users.link;
  return (
    <>
      {view.mode && (
        <RadioChips name="teacher-mode" legend={L.label} options={teacherModes(L)} {...view.mode} />
      )}
      {view.newTeacher && <NewTeacherFields {...view.newTeacher} error={errors.teacher_name} />}
      {view.picker && <LinkPicker {...view.picker} locked={locked} error={errors.linked} />}
    </>
  );
}
