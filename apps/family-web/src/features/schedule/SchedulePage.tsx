import { portalViewer, readsOwn, type WeekDay } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Hero, HeroTitle } from '@ab/web-kit/family/layout/Hero';
import { PageBody } from '@ab/web-kit/family/layout/PageBody';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import { DayColumn } from './DayColumn';
import { useWeek, type Week } from './use-week';
import { weekTiles } from './week-days';
import { WeekBar } from './WeekBar';

const P = t.familyLook.pages.schedule;

/** The seven day tiles (a phone shows only the days with lessons, one under another). */
function DayGrid({ days, week }: { days: WeekDay[]; week: Week }) {
  if (days.length === 0) return <EmptyState title={t.portal.app.schedule.empty} />;
  return (
    <div className="grid gap-3 lg:flex lg:items-stretch">
      {weekTiles(week.range.from, days).map((d) => (
        <DayColumn key={d.day} day={d} today={week.today} />
      ))}
    </div>
  );
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
      {(days) => <DayGrid days={days} week={week} />}
    </LoadState>
  );
}

/**
 * «الجدول» (boards PortalWebSchedule / PortalWebStudentSchedule): the week of the student in view
 * on the viewer's clock, as seven day tiles under the week pill; «جدولي» for a student's or an
 * adult's own (a guardian of several switches the child on top).
 */
export function SchedulePage({ student, kind }: { student: PortalStudent; kind: PortalKind }) {
  const week = useWeek(student);
  const own = readsOwn(portalViewer(kind, student));
  const title = own ? t.portal.app.schedule.mine : t.portal.app.schedule.title;
  const line = own ? P.lineOwn : P.line.replace('{name}', student.name);
  return (
    <>
      <Hero labelledBy="schedule-title">
        <HeroTitle id="schedule-title" title={title} line={line} />
      </Hero>
      <PageBody>
        <WeekBar week={week} />
        <Days week={week} />
      </PageBody>
    </>
  );
}
