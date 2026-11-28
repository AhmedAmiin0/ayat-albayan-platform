import { useMemo } from 'react';
import { t, ErrorState, InsetGroup, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { upcomingTimeOff } from '@/more/schedule';
import { TimeOffRow } from './TimeOffRow';
import { useTimeOff } from './use-teacher-availability';

/** R-TCH-02: read-only, only time off that has not ended, soonest first. */
export function UpcomingTimeOff({ teacherId }: { teacherId: string }) {
  const query = useTimeOff(teacherId);
  const upcoming = useMemo(
    () => (query.data ? upcomingTimeOff(query.data, new Date()) : undefined),
    [query.data],
  );
  return (
    <Section title={t.availability.timeOff}>
      {upcoming ? (
        <>
          {upcoming.length ? (
            <InsetGroup>
              {upcoming.map((off) => (
                <TimeOffRow key={off.id} off={off} />
              ))}
            </InsetGroup>
          ) : (
            <Note>{t.availability.timeOffEmpty}</Note>
          )}
          <Note>{t.availability.timeOffTzHint}</Note>
        </>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : null}
    </Section>
  );
}
