import { ACADEMY_TZ, zonedPartsIn } from '@ab/time';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { salesScheduleQuery, salesTeachersQuery } from '@/features/sales/sales/academy-api';
import { SalesDayBoard } from '@/features/sales/sales/schedule/SalesDayBoard';
import { SalesDayNav } from '@/features/sales/sales/schedule/SalesDayNav';
import type { SalesScheduleSearch } from '@/features/sales/sales/schedule/schedule-search';
import { TeacherSelect } from '@/features/sales/sales/teachers/TeacherSelect';

export interface SalesScheduleProps {
  search: SalesScheduleSearch;
  onSearch: (next: SalesScheduleSearch) => void;
}

/** The academy's day, read-only; the drawer offers only confirm (lessons.confirm). */
export function SalesSchedule({ search, onSearch }: SalesScheduleProps) {
  const now = useNow();
  // academy day (docs/34 b): GET /sales/schedule reads `date` as a Riyadh day (times: viewer's)
  const today = zonedPartsIn(now, ACADEMY_TZ).date;
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
