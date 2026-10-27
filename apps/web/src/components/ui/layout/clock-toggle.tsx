import type { ClockPref } from '@ab/shared';
import { setClockPref, useClockPref } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { SegmentedControl } from '../form/segmented-control';

const OPTIONS: { value: ClockPref; label: string }[] = [
  { value: 'auto', label: t.clock.autoShort },
  { value: '12', label: t.clock.h12 },
  { value: '24', label: t.clock.h24 },
];

/** تنسيق الوقت: تلقائي / 12 ساعة / 24 ساعة. Saved per browser; «تلقائي» follows its locale. */
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
