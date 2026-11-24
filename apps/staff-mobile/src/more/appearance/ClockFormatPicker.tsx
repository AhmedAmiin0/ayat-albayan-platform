import type { ClockPref } from '@ab/time';
import { useClockPref } from '@/core/lib/clock';
import { t, FilterPills, type FilterPill, Section } from '@ab/mobile-kit';

const clockPills = (): readonly FilterPill<ClockPref>[] => [
  { value: 'auto', label: t.clock.auto },
  { value: '12', label: t.clock.h12 },
  { value: '24', label: t.clock.h24 },
];

/** Saved on the device and applied at once. */
export function ClockFormatPicker() {
  const [pref, choose] = useClockPref();
  return (
    <Section title={t.clock.label}>
      <FilterPills
        items={clockPills()}
        value={pref}
        onChange={choose}
        accessibilityLabel={t.clock.label}
        role="radiogroup"
      />
    </Section>
  );
}
