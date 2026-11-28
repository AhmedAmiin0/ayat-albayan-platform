import { Icon, IconButton, Select, t, useClock, ClockOptions, clockDir, cn } from '@ab/web-kit';
import { timeOptions, type Range } from './grid';

interface Props {
  dayName: string;
  range: Range;
  /** Which select the day's error points at, linked to the error line by `errorId`. */
  invalid: keyof Range | null;
  errorId: string;
  onChange: (patch: Partial<Range>) => void;
  onRemove: () => void;
}

// 16px / 40px on phones is the iOS zoom floor (docs/07 §8); the 12 h format is wider.
const timeClass = 'min-h-10 ps-2.5 pe-7 text-base tabular-nums sm:min-h-8 sm:text-xs';
const width = { '24': 'w-[92px] sm:w-[84px]', '12': 'w-[116px] sm:w-[104px]' } as const;

/** Times are selects, never typed (rule 6, R-TCH-02). */
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
