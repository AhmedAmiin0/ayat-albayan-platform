import { useQuery } from '@tanstack/react-query';
import { Field, Select, t, teacherLabel } from '@ab/web-kit';
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
