import { zonedPartsIn, type TeacherMe } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { LoadRetry, myLessonsQuery } from '@/features/teaching/teacher';
import { boardWindow, TeacherBoard } from '@/features/teaching/teacher-board';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { cn } from '@ab/web-kit/lib/utils';

/** Same query key as the home tab, so both share the 30 s poll. */
export function StudentsBoard({ me }: { me: TeacherMe }) {
  const now = useNow();
  const today = zonedPartsIn(now, me.tz).date;
  const lessons = useQuery(myLessonsQuery(boardWindow(today, me.tz)));
  const busy = lessons.isPlaceholderData;
  return (
    <QueryState query={lessons} error={<LoadRetry onRetry={lessons.refetch} />}>
      {(data) => (
        <div aria-busy={busy || undefined} className={cn(busy && 'opacity-60')}>
          <TeacherBoard me={me} lessons={data} now={now} />
        </div>
      )}
    </QueryState>
  );
}
