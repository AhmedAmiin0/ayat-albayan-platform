import { lessonMinutes } from '@ab/client-core';
import { Card, Dot, teacherLabel, LessonAction, LessonOptionsBar, FamilyChip } from '@ab/web-kit';
import { RoomOverlay } from '@ab/web-kit/room';
import type { AgendaLessonProps } from './AgendaLesson.types';
import { L } from './agenda-lesson.helpers';
import { useAgendaLesson } from './use-agenda-lesson';

/** Times are on the viewer's clock; only a guardian gets the attendance answer actions. */
export function AgendaLesson({ entry, guardian }: AgendaLessonProps) {
  const { lesson, student, now, tz, room, setRoom, open, range } = useAgendaLesson({ entry });
  return (
    <Card asChild className="grid gap-2 p-3">
      <li>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-body font-semibold tabular-nums">{range}</p>
          <FamilyChip lesson={lesson} />
        </div>
        <p className="text-sm text-ink-2">
          {L.teacher.replace('{name}', teacherLabel(lesson.teacher))}
          {' · '}
          {L.minutes.replace('{n}', String(lessonMinutes(lesson)))}
        </p>
        {open && (
          <Dot tone="ok" live>
            {L.openNow}
          </Dot>
        )}
        {open && (
          <LessonAction
            lesson={lesson}
            studentId={student.id}
            tz={tz}
            now={now}
            onJoined={setRoom}
          />
        )}
        {guardian && <LessonOptionsBar lesson={lesson} student={student} now={now} />}
        {room && <RoomOverlay join={room} onRejoin={() => setRoom(null)} />}
      </li>
    </Card>
  );
}
