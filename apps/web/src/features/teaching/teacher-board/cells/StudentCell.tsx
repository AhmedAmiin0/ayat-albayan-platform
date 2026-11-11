import { studentStatusStyle } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import type { BoardStudent } from '@/features/teaching/teacher-board/board-rows';

export interface StudentCellProps {
  student: BoardStudent;
  /** Opens the student's drawer (the row does too; this is the keyboard way in). */
  onOpen: () => void;
}

/** «الطالب»: the name (a button to the drawer), the code and the account status chip. */
export function StudentCell({ student, onOpen }: StudentCellProps) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <button
        type="button"
        onClick={onOpen}
        className="min-h-11 font-semibold text-lapis underline underline-offset-4"
      >
        {student.name}
      </button>
      <Ltr className="text-xs text-ink-3">{student.code}</Ltr>
      <StatusChip
        size="sm"
        {...studentStatusStyle[student.status]}
        label={t.enums.studentStatus[student.status]}
      />
    </span>
  );
}
