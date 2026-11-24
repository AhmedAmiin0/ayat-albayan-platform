import { Button } from '@ab/web-kit/components/ui/form/button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { monthTitle } from './month-text';

export interface MonthNavProps {
  month: string;
  current: boolean;
  onStep: (by: number) => void;
  onToday: () => void;
}

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
