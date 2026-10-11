import type { SalesTeacherView } from '@ab/shared';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { teacherLabel } from '@/lib/teacher-label';

export interface TeacherSelectProps {
  teachers: readonly SalesTeacherView[];
  /** A teacher id, '' = every teacher. */
  value: string;
  onChange: (id: string) => void;
}

/** «المعلم/ة: كل المعلمين | …» for the read-only schedule (the admin filter's words). */
export function TeacherSelect({ teachers, value, onChange }: TeacherSelectProps) {
  return (
    <Select aria-label={t.schedule.teacherFilter} className="sm:w-60" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t.schedule.allTeachers}</option>
      {teachers.map((tc) => (
        <option key={tc.id} value={tc.id}>
          {teacherLabel({ display_name_ar: tc.name, display_name_en: tc.name_en })}
        </option>
      ))}
    </Select>
  );
}
