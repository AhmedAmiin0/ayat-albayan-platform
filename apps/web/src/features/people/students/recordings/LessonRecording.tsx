import { useQuery } from '@tanstack/react-query';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
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
 * length, size and the teacher's controls; a skeleton while it loads, a quiet line if it fails.
 */
export function LessonRecording({ studentId, lessonId, startsAt }: LessonRecordingProps) {
  const day = startsAt.slice(0, 10);
  const filters = { from: day, to: day };
  const list = useQuery(studentRecordingsQuery({ studentId, filters, page: 1 }));
  // ponytail: >10 recordings of one student in one UTC day miss;
  // add lessonId to studentRecordingsQuerySchema then.
  if (list.isError) return <p className="text-sm text-ink-3">{t.common.error}</p>;
  if (!list.data) return <ListSkeleton rows={1} />;
  const rec = list.data.items.find((r) => r.lesson_id === lessonId);
  return rec ? (
    <ul>
      <StudentRecordingRow rec={rec} role="teacher" />
    </ul>
  ) : null;
}
