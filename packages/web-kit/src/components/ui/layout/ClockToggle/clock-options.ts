import type { ClockPref } from '@ab/time';
import type { SegmentOption } from '@ab/web-kit/components/ui/form/SegmentedControl';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export const CLOCK_OPTIONS: SegmentOption<ClockPref>[] = [
  { value: 'auto', label: t.clock.autoShort },
  { value: '12', label: t.clock.h12, short: t.clock.h12Short },
  { value: '24', label: t.clock.h24, short: t.clock.h24Short },
];
