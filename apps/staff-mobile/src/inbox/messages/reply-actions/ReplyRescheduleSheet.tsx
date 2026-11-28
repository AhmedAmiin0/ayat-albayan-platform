import type { ReplyLesson } from '@ab/shared';
import { t, AppText, RescheduleFrame } from '@ab/mobile-kit';
import { SalesRescheduleSheet } from '@/sales/sales';
import { RescheduleSheet } from '@/teaching';
import { useAdminReplyLesson, useSalesReplyLesson } from './reply-lesson-read';
import type { ReplyMove } from './reply-actions-context';

interface SheetProps {
  lesson: ReplyLesson;
  onClose: () => void;
  onDone: () => void;
}

/** Loading, or the lesson is gone (moved or cancelled meanwhile): a line in the same frame. */
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

/** Reuses sales' one-lesson sheet (docs/16 row 37) or the admin's (R-SCH-07) on a fresh read. */
export function ReplyRescheduleSheet({
  move,
  onClose,
  onDone,
}: {
  move: ReplyMove;
  onClose: () => void;
  onDone: () => void;
}) {
  const props = { lesson: move.lesson, onClose, onDone };
  return move.flow === 'sales' ? <SalesSheet {...props} /> : <AdminSheet {...props} />;
}
