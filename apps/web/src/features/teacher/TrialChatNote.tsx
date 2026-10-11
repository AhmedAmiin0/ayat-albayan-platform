import { familyChatViaSales, type StudentStatus } from '@ab/shared';
import { t } from '@/lib/i18n';

/**
 * A trial student's family is reached through sales, not the teacher (owner, 2026-10-11): the
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
