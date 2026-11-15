import { studentStatusStyle } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import type { BoardStudent } from '@/features/teaching/teacher-board/board-rows';

export interface StudentCellProps {
  student: BoardStudent;
  /** «القرآن الكريم · جزء عمّ · 9 سنوات» (student-facts), absent until it loads. */
  facts?: string | undefined;
}

/** Every status but «مشترك» carries its chip (docs/48: trial, pending_renewal, expired). */
const showsChip = (s: BoardStudent): boolean => s.status !== 'active';

/**
 * «الطالب»: the name as a link to «ملف الطالب» (docs/47; the row opens it too, this is the
 * keyboard way in), the LTR code, the status chip, then the quiet facts line.
 */
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
