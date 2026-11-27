import { nextLesson } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { t, useNow } from '@ab/mobile-kit';
import { whenText } from '@/lessons';
import { useChildLessons, useFamilyClock } from '@/portal';

/** On the child's own clock, once their lessons are known. */
export function useNextLine(student: PortalStudent): string | undefined {
  const lessons = useChildLessons(student.id).data;
  const now = useNow();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const next = lessons ? nextLesson(lessons.lessons, now) : null;
  const when = next ? whenText(new Date(next.starts_at), clock, now) : null;
  return when ? t.portal.app.pick.next.replace('{when}', when) : undefined;
}
