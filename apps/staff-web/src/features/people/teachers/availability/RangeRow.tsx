import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { timeOptions, type Range } from './grid';
import { useClock } from '@/lib/clock';
import { ClockOptions } from '@/lib/clock-options';
import { clockDir } from '@/lib/clock-text';
import { cn } from '@/lib/utils';

type Props = {
  dayName: string;
  range: Range;
  /** Which select the day's error points at, linked to the error line by `errorId`. */
  invalid: keyof Range | null;
  errorId: string;
  onChange: (patch: Partial<Range>) => void;
  onRemove: () => void;
};

// h-8 / 13px tabular on desktop; 16px / 40px on phones (iOS zoom floor). docs/07 §8. 12 h («11:30 م») is wider.
const timeClass = 'min-h-10 ps-2.5 pe-7 text-base tabular-nums sm:min-h-8 sm:text-xs';
const width = { '24': 'w-[92px] sm:w-[84px]', '12': 'w-[116px] sm:w-[104px]' } as const;

/** [من ▾] إلى [إلى ▾] [×]: one range of a day. Times are selects, never typed (rule 6). R-TCH-02. */
export function RangeRow({ dayName, range, invalid, errorId, onChange, onRemove }: Props) {
  const clock = useClock();
  const select = (key: keyof Range, label: string) => (
    <Select
      aria-label={`${dayName} ${label}`}
      aria-invalid={invalid === key || undefined}
      aria-describedby={invalid === key ? errorId : undefined}
      className={cn(timeClass, width[clock.cycle])}
      dir={clockDir(clock)}
      value={range[key]}
      onChange={(e) => onChange({ [key]: e.target.value })}
    >
      <ClockOptions times={timeOptions(range[key])} />
    </Select>
  );

  return (
    <span className="inline-flex items-center gap-1">
      {select('start', t.availability.from)}
      <span className="px-0.5 text-2xs text-ink-3">{t.availability.to}</span>
      {select('end', t.availability.to)}
      <IconButton label={`${t.availability.removeSlot} ${dayName}`} className="size-11 sm:size-7 [&_svg]:size-[15px]" onClick={onRemove}>
        <Icon name="x" />
      </IconButton>
    </span>
  );
}
