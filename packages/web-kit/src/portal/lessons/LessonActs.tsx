import type { PortalLesson, PortalStudent, RoomJoinResult } from '@ab/shared';
import { LessonAction } from './LessonAction';
import { LessonCountdown } from './LessonCountdown';
import { FamilyLine } from './options/FamilyLine';
import { LessonOptionsBar } from './options/LessonOptionsBar';

interface Props {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  /** The classroom admitted the student (WithRoom covers the page). */
  onJoined: (room: RoomJoinResult) => void;
  /** Show the countdown (default); a family row hides it until the way in opens. */
  timer?: boolean;
}

/**
 * A lesson card's lower half (the plain card and the family's later lessons): what the family
 * asked, the live countdown, «ادخل الحلقة», then «خيارات الحلقة». Items of the card's own grid.
 */
export function LessonActs({ lesson, student, now, onJoined, timer = true }: Props) {
  return (
    <>
      <FamilyLine lesson={lesson} student={student} now={now} />
      {timer && <LessonCountdown lesson={lesson} now={now} />}
      <LessonAction
        lesson={lesson}
        studentId={student.id}
        tz={student.tz}
        now={now}
        onJoined={onJoined}
      />
      <LessonOptionsBar lesson={lesson} student={student} now={now} />
    </>
  );
}
