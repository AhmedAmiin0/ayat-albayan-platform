import { studentStatusStyle } from '@ab/money';
import { Link } from '@tanstack/react-router';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { BoardStudent } from '@/features/teaching/teacher-board/board-rows';

export interface StudentCellProps {
  student: BoardStudent;
  /** Absent until it loads. */
  facts?: string | undefined;
}

/** Every status but subscribed carries its chip (docs/48). */
const showsChip = (s: BoardStudent): boolean => s.status !== 'active';

/** The name link is the keyboard way in; the row opens it too (docs/47). */
export function StudentCell({ student, facts }: StudentCellProps) {
  return (
    <span className="grid gap-0.5">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link
          to="/teacher/students/$studentId"
          params={{ studentId: student.id }}
          // The row navigates too: one navigation per click.
          onClick={(e) => e.stopPropagation()}
          className="inline-flex min-h-11 items-center font-semibold text-lapis underline underline-offset-4"
        >
          {student.name}
        </Link>
        <Ltr className="text-xs text-ink-3">{student.code}</Ltr>
        {showsChip(student) && (
          <StatusChip
            size="sm"
            {...studentStatusStyle[student.status]}
            label={t.enums.studentStatus[student.status]}
          />
        )}
      </span>
      {facts && <span className="text-xs text-ink-3">{facts}</span>}
    </span>
  );
}
