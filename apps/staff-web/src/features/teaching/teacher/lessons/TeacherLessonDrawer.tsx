import type { LessonView } from '@ab/shared';
import { Drawer, studentNames } from '@/features/teaching/schedule';
import { TeacherLessonCard } from './TeacherLessonCard';

export interface TeacherLessonDrawerProps {
  /** The query's lessons, UNFILTERED: a poll updates the open one, a moved one shows closed. */
  lessons: readonly LessonView[];
  openId: string | null;
  tz: string;
  fallbackLink: string | null;
  /** The last action's message, said inside the drawer (the Toast waits for it to close). */
  notice: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** The full lesson (docs/48): TeacherLessonCard with every action, found by id in the poll. */
export function TeacherLessonDrawer(props: TeacherLessonDrawerProps) {
  const { lessons, openId, tz, fallbackLink, notice, onClose, onDone } = props;
  const open = lessons.find((l) => l.id === openId);
  if (!open) return null;
  return (
    <Drawer title={studentNames(open)} onClose={onClose}>
      <p role="status" className="text-sm font-semibold text-ok empty:hidden">
        {notice}
      </p>
      <TeacherLessonCard lesson={open} tz={tz} fallbackLink={fallbackLink} onDone={onDone} />
    </Drawer>
  );
}
