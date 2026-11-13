import { zonedPartsIn, type TeacherMe } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { myLessonsQuery } from '@/features/teaching/teacher';
import { boardWindow, TeacherBoard } from '@/features/teaching/teacher-board';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { cn } from '@/lib/utils';
import { LoadError } from './LoadError';
import { loadState, type LoadState } from './load-state';

/**
 * The board with her lessons of the board window (14 days back and ahead, her zone): the same
 * query key as the home «طلابي» tab, so both share the 30 s poll. Dimmed while the window moves.
 */
export function StudentsBoard({ me }: { me: TeacherMe }) {
  const now = useNow();
  const today = zonedPartsIn(now, me.tz).date;
  const lessons = useQuery(myLessonsQuery(boardWindow(today, me.tz)));
  const busy = lessons.isPlaceholderData;
  const views: Record<LoadState, () => ReactNode> = {
    ready: () => lessons.data && (
      <div aria-busy={busy || undefined} className={cn(busy && 'opacity-60')}>
        <TeacherBoard me={me} lessons={lessons.data} now={now} />
      </div>
    ),
    error: () => <LoadError text={t.teacherDash.loadError} onRetry={lessons.refetch} />,
    loading: () => <ListSkeleton />,
  };
  return views[loadState(lessons)]();
}
