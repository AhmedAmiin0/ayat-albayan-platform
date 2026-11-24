import { useQuery } from '@tanstack/react-query';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Select } from '@ab/web-kit/components/ui/form/select';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { teacherOptionsQuery } from '@/features/people/students/api';

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
