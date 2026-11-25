import { portalViewer, readsOwn } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { t, QueryState } from '@ab/web-kit';
import { ScheduleNotes } from './ScheduleNotes';
import { useWeek, type Week } from './use-week';
import { WeekBar } from './WeekBar';
import { WeekBody } from './WeekBody';

/** The week once the lessons are in (the kit's skeleton and retry until then). */
function Days({ week, guardian }: { week: Week; guardian: boolean }) {
  const query = {
    data: week.loading || week.failed ? undefined : week.days,
    isError: week.failed,
    refetch: week.retry,
  };
  return (
    <QueryState query={query} rows={3}>
      {(days) => <WeekBody key={week.offset} week={week} days={days} guardian={guardian} />}
    </QueryState>
  );
}

/** On the viewer's clock; only a guardian answers for a lesson. */
export function SchedulePage({ student, kind }: { student: PortalStudent; kind: PortalKind }) {
  const week = useWeek(student);
  const own = readsOwn(portalViewer(kind, student));
  const guardian = kind === 'guardian' && !own;
  return (
    <section aria-labelledby="schedule-title" className="grid gap-4">
      <h1 id="schedule-title" className="font-display text-h2 font-bold">
        {own ? t.portal.app.schedule.mine : t.portal.app.schedule.title}
      </h1>
      <WeekBar week={week} />
      <Days week={week} guardian={guardian} />
      <ScheduleNotes />
    </section>
  );
}
