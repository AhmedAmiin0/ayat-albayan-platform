import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { WeekSlotsFrameProps } from './WeekSlotsFrame.types';
import { SlotsBody } from './SlotsBody';
import { useWeekSlotsFrame } from './use-week-slots-frame';

/** R-SCH-06, R-SCH-07: no past weeks, no typing (rule 6). */
export function WeekSlotsFrame({
  week,
  first,
  onWeek,
  studentTz,
  read,
  grid,
}: WeekSlotsFrameProps) {
  const { legend, weekLabel, atFirst, prev, next } = useWeekSlotsFrame({
    week,
    first,
    onWeek,
    studentTz,
  });
  return (
    <div className="grid gap-3">
      <div
        role="group"
        aria-label={t.booking.weekNav}
        className="flex flex-wrap items-center gap-2"
      >
        <Button type="button" variant="secondary" size="sm" disabled={atFirst} onClick={prev}>
          <Icon name="chevron-right" />
          {t.schedule.prevWeek}
        </Button>
        <span className="px-1 text-sm font-semibold tabular-nums">{weekLabel}</span>
        <Button type="button" variant="secondary" size="sm" onClick={next}>
          {t.schedule.nextWeek}
          <Icon name="chevron-left" />
        </Button>
      </div>
      <p className="text-xs text-ink-3">{legend}</p>
      <SlotsBody read={read} grid={{ ...grid, week, studentTz }} />
    </div>
  );
}
