import { useQuery } from '@tanstack/react-query';
import { apiFetch, t, pathKey, ErrorState, InsetGroup, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { groupByWeekday, gridTz, tzLabel } from '@/more/schedule';
import type { AvailabilityRow, Teacher } from '@/core/lib/staff/types';
import { WeekdayRow } from './WeekdayRow';

/** «المواعيد المتاحة», read-only: the weekly grid by day in one inset card, in the zone it was saved in. R-TCH-02. */
export function WeeklyAvailability({ teacher }: { teacher: Pick<Teacher, 'id' | 'tz'> }) {
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
            <InsetGroup>
              {groupByWeekday(rows).map((day) => (
                <WeekdayRow key={day.weekday} day={day} />
              ))}
            </InsetGroup>
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
