import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { addDays, dayMonthLabel, weekdayOf } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';

export interface SalesDayNavProps {
  /** The Riyadh day shown, "YYYY-MM-DD". */
  date: string;
  /** Today's Riyadh day. */
  today: string;
  /** undefined = today (kept out of the URL). */
  onDate: (date: string | undefined) => void;
}

const weekday: Record<string, string> = t.enums.weekday;

/** «اليوم السابق | اليوم | اليوم التالي» and the day shown (the admin schedule's words), in Riyadh time. */
export function SalesDayNav({ date, today, onDate }: SalesDayNavProps) {
  const step = (n: number) => {
    const next = addDays(date, n);
    onDate(next === today ? undefined : next);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => step(-1)}>
        <Icon name="chevron-right" />
        {t.schedule.prevDay}
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={date === today} onClick={() => onDate(undefined)}>
        {t.schedule.today}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => step(1)}>
        {t.schedule.nextDay}
        <Icon name="chevron-left" />
      </Button>
      <span aria-live="polite" className="ms-1 text-sm font-semibold tabular-nums">
        {`${weekday[String(weekdayOf(date))] ?? ''} ${dayMonthLabel(date)}`}
      </span>
      <span className="text-xs text-ink-3">{t.schedule.riyadhTime}</span>
    </div>
  );
}
