import { ListSkeleton } from '@/components/ui/display/skeleton';
import { LoadRetry } from '@/features/teaching/teacher/LoadRetry';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { MonthDayList } from './MonthDayList';
import { MonthGrid } from './MonthGrid';
import type { MyMonthState } from './use-my-month';

export interface MonthBodyProps {
  m: MyMonthState;
  onOpen: (lessonId: string) => void;
  onDone: (message: string) => void;
}

/** Data first (docs/48): the grid and the picked day; the error only with nothing cached. */
export function MonthBody({ m, onOpen, onDone }: MonthBodyProps) {
  const { lessons, day } = m;
  if (!lessons.data) {
    return lessons.isError ? <LoadRetry onRetry={lessons.refetch} /> : <ListSkeleton />;
  }
  const busy = lessons.isPlaceholderData;
  return (
    <div aria-busy={busy || undefined} className={cn(busy && 'opacity-60')}>
      <MonthGrid month={m.month} today={m.today} picked={day} days={m.days} onPick={m.pick} />
      {m.days.size === 0 ? (
        <p className="mt-4 text-sm text-ink-2">{t.teacherSchedule.noLessonsMonth}</p>
      ) : (
        <PickedDay {...{ m, onOpen, onDone }} />
      )}
    </div>
  );
}

/** The picked day's lessons (none picked: a month away from today, before a tap). */
function PickedDay({ m, onOpen, onDone }: MonthBodyProps) {
  if (!m.day) return null;
  const lessons = m.days.get(m.day) ?? [];
  return <MonthDayList day={m.day} tz={m.tz} {...{ lessons, onOpen, onDone }} />;
}
