import { familyChatViaSales } from '@ab/shared';
import type { StudentStatus } from '@ab/catalog';
import { t } from '@ab/web-kit';

/**
 * A trial student's family is reached through sales, not the teacher: the
 * teacher's student file shows this note where a family contact would be. Nothing otherwise.
 */
export function TrialChatNote({ status }: { status: StudentStatus | undefined }) {
  if (!familyChatViaSales(status)) return null;
  return (
    <p role="note" className="mb-4 rounded-md bg-sunk px-4 py-3 text-sm text-ink-2">
      {t.teacherDash.trialChatViaSales}
    </p>
  );
}
