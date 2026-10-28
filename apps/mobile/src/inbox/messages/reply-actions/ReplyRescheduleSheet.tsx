import type { ReplyLesson } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { SalesRescheduleSheet } from '@/sales';
import { RescheduleFrame, RescheduleSheet } from '@/teaching';
import { useAdminReplyLesson, useSalesReplyLesson } from './reply-lesson-read';
import type { ReplyMove } from './reply-actions-context';

interface SheetProps {
  lesson: ReplyLesson;
  onClose: () => void;
  /** «تم» after the move. */
  onDone: () => void;
}

/** Still reading the lesson, or it is gone (moved or cancelled meanwhile): the same frame, a line in it. */
function Waiting({ loading, onClose }: { loading: boolean; onClose: () => void }) {
  return (
    <RescheduleFrame open onClose={onClose}>
      <AppText accessibilityRole="text">{loading ? t.common.loading : t.inbox.replyAction.notFound}</AppText>
    </RescheduleFrame>
  );
}

function SalesSheet({ lesson, onClose, onDone }: SheetProps) {
  const read = useSalesReplyLesson(lesson);
  if (!read.data) return <Waiting loading={read.isPending} onClose={onClose} />;
  return <SalesRescheduleSheet lesson={read.data} onClose={onClose} onDone={onDone} />;
}

function AdminSheet({ lesson, onClose, onDone }: SheetProps) {
  const read = useAdminReplyLesson(lesson);
  if (!read.data) return <Waiting loading={read.isPending} onClose={onClose} />;
  return <RescheduleSheet lesson={read.data} onClose={onClose} onDone={onDone} />;
}

/**
 * «تغيير الموعد» from a reply note (owner 2026-10-28): the sheet the viewer already uses elsewhere,
 * sales' one-lesson sheet (docs/16 row 37) or the admin's (R-SCH-07), on the lesson read fresh.
 */
export function ReplyRescheduleSheet({ move, onClose, onDone }: { move: ReplyMove; onClose: () => void; onDone: () => void }) {
  const props = { lesson: move.lesson, onClose, onDone };
  return move.flow === 'sales' ? <SalesSheet {...props} /> : <AdminSheet {...props} />;
}
