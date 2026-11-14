import type { HomePrefs } from '@ab/client-core';
import type { LessonView, TeacherMe } from '@ab/shared';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { cn } from '@/lib/utils';
import { LoadRetry } from './LoadRetry';
import { TodayPanel } from './today/TodayPanel';

export interface DashboardPanelProps {
  me: TeacherMe;
  /** The board window's lessons (one query for the home); undefined while loading. */
  lessons: {
    data: LessonView[] | undefined;
    isError: boolean;
    isPlaceholderData?: boolean;
    refetch: () => unknown;
  };
  /** Her «now» and today on her calendar (me.tz: the one zone of the home). */
  at: { now: Date; today: string };
  onDone: (message: string) => void;
  /** Opens a lesson in the home's drawer (the «اليوم» rows). */
  onOpen: (lessonId: string) => void;
  /** «تخصيص»: the hero, the ended fold and the row density. */
  prefs: Pick<HomePrefs, 'hero' | 'ended' | 'density'>;
}

/** The teacher home's today list under the hero (owner 2026-11-14: today's lessons only). */
export function DashboardPanel({ lessons, ...rest }: DashboardPanelProps) {
  // Data first (docs/48): a failed 30 s poll keeps the cached lessons on screen; the midnight
  // window change dims the old day with aria-busy until the new one lands.
  if (!lessons.data) {
    return lessons.isError ? <LoadRetry onRetry={lessons.refetch} /> : <ListSkeleton />;
  }
  const busy = lessons.isPlaceholderData === true;
  return (
    <div aria-busy={busy || undefined} className={cn(busy && 'opacity-60')}>
      <TodayPanel {...rest} lessons={lessons.data} />
    </div>
  );
}
