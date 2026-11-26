import { recordView } from '@ab/client-core';
import { RadioChips } from '@ab/web-kit/components/ui/form/radio-chips';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LinkPicker } from '@/features/people/users/create/LinkPicker';
import { NewTeacherFields } from '@/features/people/users/create/NewTeacherFields';
import type { RecordFieldsProps } from './RecordFields.types';

const L = t.users.link;
const MODES = [
  { value: 'existing' as const, label: L.existingTeacher },
  { value: 'new' as const, label: L.newTeacher },
];

/** The record of a teacher / student / guardian login: an existing row, or (teacher) a new one. */
export function RecordFields({ kind, value, onChange, errors, locked = false }: RecordFieldsProps) {
  const view = recordView(kind, value, onChange);
  return (
    <>
      {view.mode && (
        <RadioChips name="teacher-mode" legend={L.label} options={MODES} {...view.mode} />
      )}
      {view.newTeacher && <NewTeacherFields {...view.newTeacher} error={errors.teacher_name} />}
      {view.picker && <LinkPicker {...view.picker} locked={locked} error={errors.linked} />}
    </>
  );
}
