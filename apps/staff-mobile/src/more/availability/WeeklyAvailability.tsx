import { t, ErrorState, InsetGroup, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { groupByWeekday, gridTz, tzLabel } from '@/more/schedule';
import { WeekdayRow } from './WeekdayRow';
import { useWeeklyGrid } from './use-teacher-availability';
import type { Teacher } from '@ab/shared';

/** R-TCH-02: read-only, in the zone it was saved in. */
export function WeeklyAvailability({ teacher }: { teacher: Pick<Teacher, 'id' | 'tz'> }) {
  const query = useWeeklyGrid(teacher.id);
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
