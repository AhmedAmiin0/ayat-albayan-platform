import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from './Note';
import { upcomingTimeOff } from './schedule';
import { Section } from './Section';
import { TimeOffRow } from './TimeOffRow';
import type { TimeOff } from './types';

/** «الإجازات», read-only: only time-off that has not ended, soonest first. R-TCH-02. */
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
            upcoming.map((off) => <TimeOffRow key={off.id} off={off} />)
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
