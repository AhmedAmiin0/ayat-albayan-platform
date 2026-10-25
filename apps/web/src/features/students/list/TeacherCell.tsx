import { t } from '@/lib/i18n/i18n';
import type { StudentListItem } from '../types';

type TeacherCellProps = { row: StudentListItem; onOpen: (studentId: string) => void };

/** The teacher, or «لسه مفيش معلم» + «تعيين», which opens the profile's teacher picker. */
export function TeacherCell({ row, onOpen }: TeacherCellProps) {
  if (row.teacher_name) return <span>{row.teacher_name}</span>;
  return (
    <span>
      <span className="text-ink-3">{t.students.noTeacher}</span>{' '}
      <button
        type="button"
        className="cursor-pointer rounded-xs font-semibold text-lapis underline underline-offset-4 max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(row.id);
        }}
      >
        {t.students.assign}
      </button>
    </span>
  );
}
