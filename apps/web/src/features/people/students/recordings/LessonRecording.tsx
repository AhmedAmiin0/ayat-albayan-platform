import type { StudentRecordingView } from '@ab/shared';
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

const isDone = (r: StudentRecordingView) => r.status === 'done';

/**
 * Every recording row of one lesson: a rejoin starts a new segment and a failed start keeps
 * its row, so done segments come first in their order, then the others.
 */
function lessonSegments(items: StudentRecordingView[], lessonId: string) {
  const own = items.filter((r) => r.lesson_id === lessonId);
  return [...own.filter(isDone), ...own.filter((r) => !isDone(r))];
}

/**
 * One lesson's recordings, inside its row of the teacher's student file (docs/49): the player,
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
  const recs = lessonSegments(list.data.items, lessonId);
  return recs.length > 0 ? (
    <ul>
      {recs.map((rec) => (
        <StudentRecordingRow key={rec.id} rec={rec} role="teacher" />
      ))}
    </ul>
  ) : null;
}
