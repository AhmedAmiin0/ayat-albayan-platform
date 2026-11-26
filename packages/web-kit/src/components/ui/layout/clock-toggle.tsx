import type { ClockPref } from '@ab/time';
import { setClockPref, useClockPref } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/SegmentedControl';

const OPTIONS: { value: ClockPref; label: string }[] = [
  { value: 'auto', label: t.clock.autoShort },
  { value: '12', label: t.clock.h12 },
  { value: '24', label: t.clock.h24 },
];

/** Saved per browser; automatic follows its locale. */
export function ClockToggle({ className }: { className?: string }) {
  return (
    <SegmentedControl
      label={t.clock.label}
      options={OPTIONS}
      value={useClockPref()}
      onChange={setClockPref}
      className={className}
    />
  );
}
