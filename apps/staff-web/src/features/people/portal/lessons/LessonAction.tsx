import { lessonWait, type LessonWait } from '@ab/client-core';
import { clockOf, type PortalLesson, type RoomJoinResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { buttonVariants, Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { classroomErrorText } from '@/features/teaching/classroom';
import { t } from '@/lib/i18n/i18n';
import { portalApi } from '@/features/people/portal/api';
import { type Clock, useClock } from '@/lib/clock';

interface Props {
  lesson: PortalLesson;
  studentId: string;
  tz: string;
  now: Date;
  /** Our classroom admitted the student: the card opens the room. */
  onJoined: (join: RoomJoinResult) => void;
}

type ZonedClock = Clock & { tz: string };

/** Why there is no button (@ab/client-core lessonWait), in the family's words. */
const WAIT_TEXT: Record<LessonWait, (lesson: PortalLesson, clock: ZonedClock) => string> = {
  cancelled: () => t.portal.cancelled,
  closed: () => t.portal.closed,
  noWayIn: () => t.portal.noWayIn,
  opensAt: (lesson, clock) =>
    t.portal.opensAt.replace('{time}', clockOf(new Date(lesson.window.opens_at), clock)),
};

const Hint = ({ text }: { text: string }) => <p className="text-sm text-ink-2">{text}</p>;

/**
 * «ادخل الحلقة», only inside the join window: our classroom admits the student through the API and
 * the room opens here; an external lesson opens its own meeting link (sent only while it is open).
 */
export function LessonAction({ lesson, studentId, tz, now, onJoined }: Props) {
  const clock = useClock();
  const join = useMutation({
    mutationFn: () => portalApi.join({ studentId, lessonId: lesson.id }),
    onSuccess: (room) => onJoined(room),
  });
  const wait = lessonWait(lesson, now);
  if (wait) return <Hint text={WAIT_TEXT[wait](lesson, { ...clock, tz })} />;
  if (lesson.way_in === 'external' && lesson.meeting_url) {
    return (
      <a
        href={lesson.meeting_url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ size: 'lg' })}
      >
        {t.portal.join}
      </a>
    );
  }
  return (
    <div className="grid gap-2">
      {join.isError && <FormAlert>{classroomErrorText(join.error)}</FormAlert>}
      <Button
        type="button"
        size="lg"
        className="transition-transform active:scale-[0.98]"
        disabled={join.isPending}
        onClick={() => join.mutate()}
      >
        {join.isPending ? t.portal.joining : t.portal.join}
      </Button>
    </div>
  );
}
