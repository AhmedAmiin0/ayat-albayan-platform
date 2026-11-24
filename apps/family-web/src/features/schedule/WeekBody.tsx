import type { WeekDay } from '@ab/client-core';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { AgendaDay } from './agenda';
import { useJumpToDay, WeekStrip } from './strip';
import type { Week } from './use-week';
import { WeekSummary } from './WeekSummary';

interface WeekBodyProps {
  week: Week;
  days: WeekDay[];
  guardian: boolean;
}

/** Keyed on the week so it cross-fades and the strip's choice starts empty. */
export function WeekBody({ week, days, guardian }: WeekBodyProps) {
  const jump = useJumpToDay();
  const today = week.strip.find((d) => d.today)?.day;
  return (
    <div className="grid animate-fade-in gap-4">
      <WeekStrip days={week.strip} selected={jump.selected} onJump={jump.jump} />
      {days.length === 0 ? (
        <EmptyState title={t.portal.app.schedule.empty} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          <div className="grid gap-5 lg:col-span-2">
            {days.map((d) => (
              <AgendaDay key={d.day} day={d} today={d.day === today} guardian={guardian} />
            ))}
          </div>
          <WeekSummary summary={week.summary} guardian={guardian} />
        </div>
      )}
    </div>
  );
}
