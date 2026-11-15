import type { WeekDay } from '@ab/client-core';
import { dateText, localDateIn, type PortalHome } from '@ab/shared';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import { ChildFilter } from './ChildFilter';
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

function DayList({ days, tz, several }: { days: WeekDay[]; tz: string; several: boolean }) {
  if (days.length === 0) return <EmptyState title={t.portal.app.schedule.empty} />;
  return days.map((d) => (
    <section key={d.day} className="grid gap-2">
      <DayHead day={d.day} tz={tz} />
      <ul className="grid gap-2">
        {d.lessons.map((entry) => (
          <ScheduleRow key={entry.lesson.id} entry={entry} showChild={several} />
        ))}
      </ul>
    </section>
  ));
}

/** The week once every child's lessons are in (the kit's skeleton and retry until then). */
function Days({ week, several }: { week: Week; several: boolean }) {
  const query = {
    data: week.loading || week.failed ? undefined : week.days,
    isError: week.failed,
    refetch: week.retry,
  };
  return (
    <LoadState query={query} rows={3}>
      {(days) => <DayList days={days} tz={week.tz} several={several} />}
    </LoadState>
  );
}

/** «الجدول» (canvas Schedule): the week's lessons across every child, on the viewer's clock. */
export function SchedulePage({ home }: { home: PortalHome }) {
  const week = useWeek(home.students);
  const own = home.kind === 'student';
  return (
    <section aria-labelledby="schedule-title" className="grid gap-4">
      <h1 id="schedule-title" className="font-display text-h2 font-bold">
        {own ? t.portal.app.schedule.mine : t.portal.app.schedule.title}
      </h1>
      <WeekBar week={week} />
      <ChildFilter students={home.students} only={week.only} onOnly={week.setOnly} />
      <Days week={week} several={home.students.length > 1} />
    </section>
  );
}
