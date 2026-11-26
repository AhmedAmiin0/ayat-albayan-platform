import { lessonWait, lessonWaitText, type LessonWait } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import type { RoomJoinResult } from '@ab/schedule';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { buttonVariants, Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { classroomErrorText } from '@ab/web-kit/classroom/room/livekit/errors';
import { RecordedNotice } from '@ab/web-kit/classroom/recordings/RecordedNotice';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalApi } from '@ab/web-kit/portal/api';
import { useClock, type Clock } from '@ab/web-kit/lib/clock';

interface Props {
  lesson: PortalLesson;
  studentId: string;
  tz: string;
  now: Date;
  /** Our classroom admitted the student: the card opens the room. */
  onJoined: (join: RoomJoinResult) => void;
  label?: string | undefined;
  /** The live countdown already says when, so no hint until the window opens. */
  counted?: boolean;
}

const Hint = ({ text }: { text: string }) => <p className="text-sm text-ink-2">{text}</p>;

/** The countdown already says when the window opens. */
const saidByCountdown = (wait: LessonWait, counted: boolean | undefined): boolean =>
  counted === true && wait === 'opensAt';

interface WaitInput {
  props: Props;
  clock: Clock;
}

/**
 * What stands in for the button: undefined = the button; null = nothing (the card's countdown
 * says it); else the line why there is none yet or any more.
 */
function waitLine({ props, clock }: WaitInput): ReactNode {
  const { lesson, now, tz, counted } = props;
  const wait = lessonWait(lesson, now);
  if (!wait) return undefined;
  if (saidByCountdown(wait, counted)) return null;
  return <Hint text={lessonWaitText(wait, lesson, { words: t.portal, clock: { ...clock, tz } })} />;
}

/** Only inside the join window; our classroom admits via the API after the recording consent. */
export function LessonAction(props: Props) {
  const { lesson, studentId, onJoined, label = t.portal.join } = props;
  const clock = useClock();
  const join = useMutation({
    mutationFn: () => portalApi.join({ studentId, lessonId: lesson.id }),
    onSuccess: (room) => onJoined(room),
  });
  const line = waitLine({ props, clock });
  if (line !== undefined) return line;
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
