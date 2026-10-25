import { useQuery } from '@tanstack/react-query';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n';
import { teacherLabel } from '@/lib/teacher-label';
import { teacherOptionsQuery } from './api';

/** «المعلم/المعلمه» as the registration form asks it: the academy's teachers and an empty first option. */
export function TeacherField({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: teachers = [] } = useQuery(teacherOptionsQuery);
  return (
    <Field label={t.students.teacher}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{t.students.noTeacher}</option>
          {teachers.map((tc) => (
            <option key={tc.id} value={tc.id}>
              {teacherLabel(tc)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
