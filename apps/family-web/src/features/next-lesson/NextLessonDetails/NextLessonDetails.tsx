import { RoomOverlay } from '@ab/web-kit/room';
import { StatusMark, t, teacherLabel, LessonAction, LessonWhen, CardRoomLine } from '@ab/web-kit';
import { ClockLines } from './ClockLines';
import { joinLabel } from './next-lesson-details.helpers';
import type { NextLessonDetailsProps } from './NextLessonDetails.types';
import { useNextLessonDetails } from './use-next-lesson-details';

/** The countdown digits change in place and never animate; once admitted, the room covers it. */
export function NextLessonDetails({
  lesson,
  student,
  now,
  open,
  full = false,
}: NextLessonDetailsProps) {
  const { room, setRoom, leaveRoom, chip, state, joinable, shown } = useNextLessonDetails({
    lesson,
    now,
    open,
    full,
  });
  if (room) {
    return <RoomOverlay join={room} onRejoin={leaveRoom} about={{ lesson, student }} />;
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <LessonWhen startsAt={lesson.starts_at} tz={student.tz} />
        <StatusMark tone={chip.tone} label={chip.label} />
      </div>
      <p className="text-sm text-ink-2">
        {t.portal.app.lesson.teacher.replace('{name}', teacherLabel(lesson.teacher))}
      </p>
      {state.kind === 'none' && <ClockLines {...shown} />}
      <CardRoomLine room={state} tz={student.tz} />
      {joinable && (
        <LessonAction
          lesson={lesson}
          studentId={student.id}
          tz={student.tz}
          now={now}
          onJoined={setRoom}
          label={joinLabel(state.kind)}
          counted={full && state.kind === 'none'}
        />
      )}
    </div>
  );
}
