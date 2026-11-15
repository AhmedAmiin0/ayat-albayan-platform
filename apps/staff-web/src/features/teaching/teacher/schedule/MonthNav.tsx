import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { monthTitle } from './month-text';

export interface MonthNavProps {
  month: string;
  /** The shown month holds today: «هذا الشهر» is idle. */
  current: boolean;
  onStep: (by: number) => void;
  onToday: () => void;
}

/** ‹ الشهر السابق · هذا الشهر · الشهر التالي › and the month's name (as MyWeek's week row). */
export function MonthNav({ month, current, onStep, onToday }: MonthNavProps) {
  return (
    <div role="group" aria-label={t.teacherSchedule.month} className="mb-4 flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => onStep(-1)}>
        <Icon name="chevron-right" />
        {t.teacherSchedule.prevMonth}
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={current} onClick={onToday}>
        {t.teacherSchedule.thisMonth}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => onStep(1)}>
        {t.teacherSchedule.nextMonth}
        <Icon name="chevron-left" />
      </Button>
      <span className="ms-1 text-sm font-semibold tabular-nums">{monthTitle(month)}</span>
    </div>
  );
}
