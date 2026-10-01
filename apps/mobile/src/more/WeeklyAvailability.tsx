import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { ErrorState } from '@/ui/ErrorState';
import { Note } from './Note';
import { groupByWeekday, gridTz, tzLabel } from './schedule';
import { Section } from './Section';
import type { AvailabilityRow, Teacher } from './types';
import { WeekdayRow } from './WeekdayRow';

/** «المواعيد المتاحة», read-only: the weekly grid by day, in the zone it was saved in. R-TCH-02. */
export function WeeklyAvailability({ teacher }: { teacher: Teacher }) {
  const path = `/teachers/${teacher.id}/availability`;
  const query = useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<AvailabilityRow[]>(path),
  });
  const rows = query.data;
  return (
    <Section title={t.availability.title}>
      {rows ? (
        <>
          <Note>{t.availability.tzHint.replace('{tz}', tzLabel(gridTz(rows, teacher.tz)))}</Note>
          {rows.length ? (
            groupByWeekday(rows).map((day) => <WeekdayRow key={day.weekday} day={day} />)
          ) : (
            <Note>{t.availability.empty}</Note>
          )}
        </>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : null}
    </Section>
  );
}
