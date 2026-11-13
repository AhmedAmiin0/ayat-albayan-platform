import { useQuery } from '@tanstack/react-query';
import { studentRecordingsQuery } from './recordings-api';
import { StudentRecordingRow } from './StudentRecordingRow';

export interface LessonRecordingProps {
  studentId: string;
  lessonId: string;
  /** The lesson's start, ISO UTC: the API's day range is UTC and includes both ends. */
  startsAt: string;
}

/**
 * One lesson's recording, inside its row of the teacher's student file (docs/49): the player,
 * length, size and the teacher's controls; nothing when the lesson has none.
 */
export function LessonRecording({ studentId, lessonId, startsAt }: LessonRecordingProps) {
  const day = startsAt.slice(0, 10);
  const filters = { from: day, to: day };
  const list = useQuery(studentRecordingsQuery({ studentId, filters, page: 1 }));
  // ponytail: >10 recordings of one student in one UTC day miss;
  // add lessonId to studentRecordingsQuerySchema then.
  const rec = list.data?.items.find((r) => r.lesson_id === lessonId);
  if (!rec) return null;
  return (
    <ul>
      <StudentRecordingRow rec={rec} role="teacher" />
    </ul>
  );
}
