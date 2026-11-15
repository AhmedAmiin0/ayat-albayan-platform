import { lessonWait, lessonWaitText } from '@ab/client-core';
import type { PortalLesson, RoomJoinResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { buttonVariants, Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { classroomErrorText } from '@/features/teaching/classroom';
import { t } from '@/lib/i18n/i18n';
import { portalApi } from '@/features/people/portal/api';
import { useClock } from '@/lib/clock';

interface Props {
  lesson: PortalLesson;
  studentId: string;
  tz: string;
  now: Date;
  /** Our classroom admitted the student: the card opens the room. */
  onJoined: (join: RoomJoinResult) => void;
}

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
  const hint = wait && lessonWaitText(wait, lesson, { words: t.portal, clock: { ...clock, tz } });
  if (hint) return <Hint text={hint} />;
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
