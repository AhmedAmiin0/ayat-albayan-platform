import type { CourseCardLesson } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Drawer, LessonDrawer } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cardLessonQuery } from './api';

interface CardLessonDrawerProps {
  lesson: CourseCardLesson;
  onClose: () => void;
  /** After a write from the drawer: what it did. */
  onDone: (message: string) => void;
}

/**
 * A card lesson opens the admin's lesson drawer (owner 2026-11-17), with «تغيير الميعاد» and the
 * rest of its actions; «جارٍ التحميل» until its full view is read, «غير موجود» when it moved.
 */
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
