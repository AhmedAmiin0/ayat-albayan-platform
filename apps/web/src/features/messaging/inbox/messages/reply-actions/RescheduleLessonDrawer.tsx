import type { LessonView, ReplyLesson } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Drawer, RescheduleForm, studentNames } from '@/features/teaching/schedule';
import { apiFetch } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

const MINUTE_MS = 60_000;

/**
 * The reply's lesson as the admin's form needs it: GET /lessons?from&to (lessons.read) over the minute
 * it starts, picked by id. Not under ['lessons']: the form's own refresh would empty the drawer.
 */
async function readLesson(lesson: ReplyLesson): Promise<LessonView | null> {
  const start = Date.parse(lesson.starts_at);
  const window = `from=${encodeURIComponent(new Date(start).toISOString())}&to=${encodeURIComponent(new Date(start + MINUTE_MS).toISOString())}`;
  const rows = await apiFetch<LessonView[]>(`/lessons?${window}`);
  return rows.find((l) => l.id === lesson.id) ?? null;
}

export interface RescheduleLessonDrawerProps {
  lesson: ReplyLesson;
  onClose: () => void;
  /** The move went through (the drawer then closes). */
  onMoved: () => void;
}

/** «تغيير الموعد» from a reply note: the admin's lesson drawer, opened straight on its reschedule form (R-SCH-07). */
export function RescheduleLessonDrawer({ lesson, onClose, onMoved }: RescheduleLessonDrawerProps) {
  const read = useQuery({ queryKey: ['reply-lesson', lesson.id], queryFn: () => readLesson(lesson), staleTime: 0 });
  const done = () => {
    onMoved();
    onClose();
  };
  if (!read.data) {
    return (
      <Drawer title={t.lessons.rescheduleTitle} onClose={onClose}>
        <p role="status" className="text-sm text-ink-2">
          {read.isPending ? t.common.loading : t.inbox.replyAction.notFound}
        </p>
      </Drawer>
    );
  }
  return (
    <Drawer title={studentNames(read.data) || t.lessons.rescheduleTitle} onClose={onClose}>
      <RescheduleForm lesson={read.data} onBack={onClose} onDone={done} />
    </Drawer>
  );
}
