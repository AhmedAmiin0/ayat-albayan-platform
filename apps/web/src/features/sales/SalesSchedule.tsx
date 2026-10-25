import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { useNow } from '@/features/classroom/use-now';
import { RIYADH_TZ, zonedParts } from '@/features/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import { salesScheduleQuery, salesTeachersQuery } from './academy-api';
import { SalesDayBoard } from './SalesDayBoard';
import { SalesDayNav } from './SalesDayNav';
import type { SalesScheduleSearch } from './schedule-search';
import { TeacherSelect } from './TeacherSelect';

export interface SalesScheduleProps {
  search: SalesScheduleSearch;
  onSearch: (next: SalesScheduleSearch) => void;
}

/**
 * /sales/schedule «جدول الحلقات» (owner report 2026-10-12: «it is not seeing the schedule»): the
 * academy's day, read-only. Date navigation, a teacher filter, the lessons by teacher, and «ادخل
 * الحلقة» on the one running now. Nothing here edits, cancels, moves, books or reports.
 */
export function SalesSchedule({ search, onSearch }: SalesScheduleProps) {
  const now = useNow();
  const today = zonedParts(now, RIYADH_TZ).date;
  const date = search.date ?? today;
  const day = useQuery(salesScheduleQuery({ date, teacherId: search.teacherId }));
  const teachers = useQuery(salesTeachersQuery);
  const patch = (next: SalesScheduleSearch) => onSearch(Object.fromEntries(Object.entries({ ...search, ...next }).filter(([, v]) => v)));
  const lessons = day.data?.lessons ?? [];
  return (
    <>
      <PageHead>
        <Cartouche>{t.sales.academySchedule.title}</Cartouche>
        <p className="text-sm text-ink-2">{t.sales.academySchedule.readOnly}</p>
      </PageHead>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SalesDayNav date={date} today={today} onDate={(next) => patch({ date: next })} />
        <TeacherSelect teachers={teachers.data ?? []} value={search.teacherId ?? ''} onChange={(id) => patch({ teacherId: id || undefined })} />
      </div>
      {day.isPending && <ListSkeleton />}
      {day.isError && (
        <FormAlert>
          {t.sales.loadFailed}{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void day.refetch()}>
            {t.sales.retry}
          </Button>
        </FormAlert>
      )}
      {day.isSuccess && lessons.length === 0 && (
        <EmptyState title={search.teacherId ? t.sales.academySchedule.emptyTeacher : t.sales.academySchedule.empty} />
      )}
      {lessons.length > 0 && (
        <div className={day.isPlaceholderData ? 'opacity-60' : undefined} aria-busy={day.isPlaceholderData || undefined}>
          <SalesDayBoard lessons={lessons} now={now} />
        </div>
      )}
    </>
  );
}
