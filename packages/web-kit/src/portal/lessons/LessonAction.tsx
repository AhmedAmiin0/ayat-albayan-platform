import { lessonWait, lessonWaitText } from '@ab/client-core';
import type { PortalLesson, RoomJoinResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { buttonVariants, Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { classroomErrorText } from '@ab/web-kit/classroom/room/livekit/errors';
import { RecordedNotice } from '@ab/web-kit/classroom/recordings/RecordedNotice';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalApi } from '@ab/web-kit/portal/api';
import { useClock } from '@ab/web-kit/lib/clock';

interface Props {
  lesson: PortalLesson;
  studentId: string;
  tz: string;
  now: Date;
  /** Our classroom admitted the student: the card opens the room. */
  onJoined: (join: RoomJoinResult) => void;
  /** The button's words: «ادخل الآن» while the room is live, else «ادخل الحلقة». */
  label?: string | undefined;
}

const Hint = ({ text }: { text: string }) => <p className="text-sm text-ink-2">{text}</p>;

/**
 * «ادخل الحلقة» («ادخل الآن» while live), only inside the join window: our classroom admits the
 * student through the API and the room opens here, after «تُسجَّل هذه الجلسة» like every other
 * door into it (consent); an external lesson opens its own meeting link (sent only while open).
 */
export function LessonAction(props: Props) {
  const { lesson, studentId, tz, now, onJoined, label = t.portal.join } = props;
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
        className={buttonVariants({ size: 'lg', className: 'animate-pop-in' })}
      >
        {label}
      </a>
    );
  }
  return (
    // Pops in once when the window opens and the hint gives way to the button.
    <div className="grid animate-pop-in gap-2">
      {join.isError && <FormAlert>{classroomErrorText(join.error)}</FormAlert>}
      <RecordedNotice />
      <Button
        type="button"
        size="lg"
        disabled={join.isPending}
        onClick={() => join.mutate()}
      >
        {join.isPending ? t.portal.joining : label}
      </Button>
    </div>
  );
}
