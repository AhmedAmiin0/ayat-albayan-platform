import { portalViewer, readsOwn, type WeekDay } from '@ab/client-core';
import { dateText, localDateIn, type PortalKind, type PortalStudent } from '@ab/shared';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import { ScheduleRow } from './ScheduleRow';
import { useWeek, type Week } from './use-week';
import { WeekBar } from './WeekBar';

const DAY = { weekday: 'long', day: 'numeric', month: 'long' } as const;

/** A day's heading: «اليوم · الأحد 16 نوفمبر» for today, else the day itself. */
function DayHead({ day, tz }: { day: string; tz: string }) {
  const text = dateText(new Date(`${day}T12:00:00Z`), { tz: 'UTC', locale }, DAY);
  const today = localDateIn(useNow(), tz) === day;
  return (
    <h2 className="text-sm font-semibold text-ink-2">
      {today ? t.portal.app.schedule.today.replace('{day}', text) : text}
    </h2>
  );
}

function DayList({ days, tz }: { days: WeekDay[]; tz: string }) {
  if (days.length === 0) return <EmptyState title={t.portal.app.schedule.empty} />;
  return days.map((d) => (
    <section key={d.day} className="grid gap-2">
      <DayHead day={d.day} tz={tz} />
      <ul className="grid gap-2">
        {d.lessons.map((entry) => (
          <ScheduleRow key={entry.lesson.id} entry={entry} />
        ))}
      </ul>
    </section>
  ));
}

/** The week once the lessons are in (the kit's skeleton and retry until then). */
function Days({ week }: { week: Week }) {
  const query = {
    data: week.loading || week.failed ? undefined : week.days,
    isError: week.failed,
    refetch: week.retry,
  };
  return (
    <LoadState query={query} rows={3}>
      {(days) => <DayList days={days} tz={week.tz} />}
    </LoadState>
  );
}

/**
 * «الجدول» (canvas StudentSchedule): the week of the student in view on the viewer's clock;
 * «جدولي» for a student's or an adult's own (a guardian of several switches the child on top).
 */
export function SchedulePage({ student, kind }: { student: PortalStudent; kind: PortalKind }) {
  const week = useWeek(student);
  const own = readsOwn(portalViewer(kind, student));
  return (
    <section aria-labelledby="schedule-title" className="grid gap-4">
      <h1 id="schedule-title" className="font-display text-h2 font-bold">
        {own ? t.portal.app.schedule.mine : t.portal.app.schedule.title}
      </h1>
      <WeekBar week={week} />
      <Days week={week} />
    </section>
  );
}
