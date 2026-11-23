import { lessonWait, lessonWaitText, type LessonWait } from '@ab/client-core';
import type { PortalLesson, RoomJoinResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { buttonVariants, Button, FormAlert } from '#/components/ui/form/index.ts';
import { classroomErrorText, RecordedNotice } from '#/classroom/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { portalApi } from '#/portal/api.ts';
import { useClock, type Clock } from '#/lib/index.ts';

interface Props {
  lesson: PortalLesson;
  studentId: string;
  tz: string;
  now: Date;
  /** Our classroom admitted the student: the card opens the room. */
  onJoined: (join: RoomJoinResult) => void;
  /** The button's words: «ادخل الآن» while the room is live, else «ادخل الحلقة». */
  label?: string | undefined;
  /**
   * The card shows the live countdown to the window («يُتاح الدخول بعد …»): the «يُتاح الدخول من
   * …» hint would say it twice, so none until the window opens.
   */
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

/**
 * «ادخل الحلقة» («ادخل الآن» while live), only inside the join window: our classroom admits the
 * student through the API and the room opens here, after «تُسجَّل هذه الجلسة» like every other
 * door into it (consent); an external lesson opens its own meeting link (sent only while open).
 */
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
