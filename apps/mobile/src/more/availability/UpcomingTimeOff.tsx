import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { InsetGroup } from '@/core/ui/surface/inset';
import { Note } from '@/core/ui/feedback/Note';
import { upcomingTimeOff } from '@/more/schedule';
import { Section } from '@/core/ui/surface/Section';
import { TimeOffRow } from './TimeOffRow';
import type { TimeOff } from '@/core/lib/staff/types';

/** «الإجازات», read-only: only time-off that has not ended, soonest first, in one inset card. R-TCH-02. */
export function UpcomingTimeOff({ teacherId }: { teacherId: string }) {
  const path = `/teachers/${teacherId}/time-off`;
  const query = useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<TimeOff[]>(path) });
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
