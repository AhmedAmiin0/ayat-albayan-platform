import type { CourseCardLesson } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Drawer, LessonDrawer } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit';
import { cardLessonQuery } from './api';

interface CardLessonDrawerProps {
  lesson: CourseCardLesson;
  onClose: () => void;
  /** After a write from the drawer: what it did. */
  onDone: (message: string) => void;
}

/** Loading until the full view is read; not found when the lesson moved. */
export function CardLessonDrawer({ lesson, onClose, onDone }: CardLessonDrawerProps) {
  const read = useQuery(cardLessonQuery(lesson));
  if (read.data) return <LessonDrawer lesson={read.data} onClose={onClose} onDone={onDone} />;
  return (
    <Drawer title={t.lessons.details} onClose={onClose}>
      <p role="status" className="text-sm text-ink-2">
        {read.isPending ? t.common.loading : t.common.notFound}
      </p>
    </Drawer>
  );
}
