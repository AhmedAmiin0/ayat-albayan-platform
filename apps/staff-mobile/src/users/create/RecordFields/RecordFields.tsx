import { recordView, teacherModes } from '@ab/client-core';
import { t } from '@ab/mobile-kit';
import { LinkPicker } from '@/users/create/LinkPicker';
import { NewTeacherFields } from '@/users/create/NewTeacherFields';
import { Choice } from '@/users/shared/Choice';
import type { RecordFieldsProps } from './RecordFields.types';

/** The record of a teacher / student / guardian login: an existing row, or (teacher) a new one. */
export function RecordFields({ kind, value, onChange, errors, locked = false }: RecordFieldsProps) {
  const L = t.users.link;
  const view = recordView(kind, value, onChange);
  return (
    <>
      {view.mode ? <Choice label={L.label} items={teacherModes(L)} {...view.mode} /> : null}
      {view.newTeacher ? (
        <NewTeacherFields {...view.newTeacher} error={errors.teacher_name} />
      ) : null}
      {view.picker ? <LinkPicker {...view.picker} locked={locked} error={errors.linked} /> : null}
    </>
  );
}
