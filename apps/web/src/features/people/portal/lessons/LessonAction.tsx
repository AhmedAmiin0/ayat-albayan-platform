import { clockTime, type PortalLesson } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { buttonVariants, Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { classroomErrorText, windowStateAt } from '@/features/teaching/classroom';
import { t } from '@/lib/i18n/i18n';
import { portalJoin } from '../api';

interface Props {
  lesson: PortalLesson;
  studentId: string;
  tz: string;
  now: Date;
}

/**
 * «ادخل الحلقة», only inside the join window: our classroom asks the API for the student's guest link and
 * goes there; an external lesson opens its own meeting link (sent by the API only while the room is open).
 */
export function LessonAction({ lesson, studentId, tz, now }: Props) {
  const join = useMutation({
    mutationFn: () => portalJoin({ studentId, lessonId: lesson.id }),
    onSuccess: (link) => window.location.assign(link.url),
  });
  if (lesson.way_in === 'none') return <p className="text-sm text-ink-2">{t.portal.noWayIn}</p>;
  const state = windowStateAt(lesson.window, now);
  if (state === 'closed') return <p className="text-sm text-ink-3">{t.portal.closed}</p>;
  if (state === 'early') {
    return <p className="text-sm text-ink-2">{t.portal.opensAt.replace('{time}', clockTime(new Date(lesson.window.opens_at), tz))}</p>;
  }
  if (lesson.way_in === 'external') {
    // The API sends the link only while the room is open; until the next refresh it may still be missing.
    if (!lesson.meeting_url) return <p className="text-sm text-ink-2">{t.portal.noWayIn}</p>;
    return (
      <a href={lesson.meeting_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'lg' })}>
        {t.portal.join}
      </a>
    );
  }
  return (
    <div className="grid gap-2">
      {join.isError && <FormAlert>{classroomErrorText(join.error)}</FormAlert>}
      <Button type="button" size="lg" disabled={join.isPending} onClick={() => join.mutate()}>
        {join.isPending ? t.portal.joining : t.portal.join}
      </Button>
    </div>
  );
}
