import type { PortalLesson, PortalStudent } from '@ab/shared';
import type { ClockOptions } from '@ab/time';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { useRoomsInApp } from '@/room';
import { optionsTitle } from './lesson-text';
import { LessonOptions } from './options/LessonOptions';

/** The quieter white lines over the lapis fill: 0.92 keeps 4.5:1 (0.85 read 4.43:1). */
export const SOFT_INK = 0.92;

/**
 * Under the button: a live room the app opens itself (useRoomsInApp) goes straight in
 * with the mic on (canvas RoomXLiveHome); otherwise the browser room.
 */
const noteOf = (live: boolean, inApp: boolean): string =>
  live && inApp ? t.portal.app.lesson.roomNoteLive : t.portal.app.lesson.roomNote;

interface CardFooterProps {
  lesson: PortalLesson;
  student: PortalStudent;
  clock: ClockOptions;
  now: Date;
  /** The room is live now (liveRoom). */
  live: boolean;
  onNotice: (message: string) => void;
}

/** The full card's end: where our room opens, and the lesson options. */
export function CardFooter({ lesson, student, clock, now, live, onNotice }: CardFooterProps) {
  const { color } = useTheme();
  const inApp = useRoomsInApp();
  const note = { color: color.onLapis, fontSize: type.size.xs, opacity: SOFT_INK };
  return (
    <>
      {lesson.way_in === 'classroom' ? (
        <AppText style={note}>{noteOf(live, inApp)}</AppText>
      ) : null}
      <LessonOptions
        lesson={lesson}
        student={student}
        now={now}
        title={optionsTitle(lesson, clock, now)}
        onNotice={onNotice}
      />
    </>
  );
}
