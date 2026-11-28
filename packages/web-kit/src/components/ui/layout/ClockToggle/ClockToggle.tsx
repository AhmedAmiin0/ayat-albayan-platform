import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/SegmentedControl';
import { CLOCK_OPTIONS } from './clock-options';
import type { ClockToggleProps } from './ClockToggle.types';
import { useClockToggle } from './use-clock-toggle';

/** Saved per browser; automatic follows its locale. */
export function ClockToggle({ size, className }: ClockToggleProps) {
  const { pref, choose } = useClockToggle();
  return (
    <SegmentedControl
      label={t.clock.label}
      options={CLOCK_OPTIONS}
      value={pref}
      onChange={choose}
      size={size}
      className={className}
    />
  );
}
