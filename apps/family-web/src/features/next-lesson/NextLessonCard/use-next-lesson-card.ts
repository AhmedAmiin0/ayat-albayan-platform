import { t } from '@ab/web-kit';
import { useNextLesson } from '@/features/next-lesson/use-next-lesson';
import type { Props } from './NextLessonCard.types';

export function useNextLessonCard({ student, own }: Pick<Props, 'student' | 'own'>) {
  const read = useNextLesson(student.id);
  const { next } = read;
  const title = own ? t.portal.app.lesson.nextLessonSelf : t.portal.nextLesson;
  return { read, next, title };
}
