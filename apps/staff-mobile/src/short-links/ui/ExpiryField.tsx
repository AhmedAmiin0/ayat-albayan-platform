import {
  dayExpiry,
  expiresAtOf,
  expiryChip,
  expiryDay,
  EXPIRY_DAY_CHOICES,
  SHORT_LINK_PURGE_DAYS,
  type LinkExpiry,
} from '@ab/client-core';
import { counted, SHORT_LINK_MAX_DAYS } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import {
  t,
  type,
  useClockCycle,
  useNow,
  useTheme,
  AppText,
  ErrorLine,
  FilterPills,
  Note,
} from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { DatePickerField } from '@/core/ui/form/date-picker';
import { whenText } from './link-words';

interface ExpiryFieldProps {
  /** null: the link keeps its expiry (the edit sheet), no chip lit. */
  expiry: LinkExpiry | null;
  onChange: (expiry: LinkExpiry) => void;
  error?: string | undefined;
}

const DATE = 'date';
const F = () => t.shortLinks.form;

const chipOf = (expiry: LinkExpiry | null): string =>
  expiry === null ? '' : String(expiryChip(expiry));

const items = () => [
  ...EXPIRY_DAY_CHOICES.map((d) => ({ value: String(d), label: counted(F().days, d) })),
  { value: DATE, label: F().otherDate },
];

/** «ينتهي الثلاثاء 24 نوفمبر، 9:00 ص» of the chosen lifetime. */
function EndsAt({ expiry }: { expiry: LinkExpiry }) {
  const clock = { now: useNow(), tz: useViewerTz() };
  const cycle = useClockCycle();
  const { color } = useTheme();
  const when = whenText(expiresAtOf(expiry, clock), clock.tz, cycle);
  const style = { fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink };
  return <AppText style={style}>{F().endsAt.replace('{date}', when)}</AppText>;
}

/**
 * «مدة الصلاحية» (board LinkXStaffCreate): 1 · 3 · 7 · 30 days or «تاريخ آخر» on the calendar,
 * the end it makes, and when the link is deleted with its visits.
 */
export function ExpiryField({ expiry, onChange, error }: ExpiryFieldProps) {
  const clock = { now: useNow(), tz: useViewerTz() };
  const [custom, setCustom] = useState(false);
  const pick = (value: string) => {
    setCustom(value === DATE);
    if (value !== DATE) onChange({ kind: 'days', days: Number(value) });
  };
  const range = {
    min: expiryDay({ kind: 'days', days: 1 }, clock),
    max: expiryDay({ kind: 'days', days: SHORT_LINK_MAX_DAYS }, clock),
  };
  const day = expiry === null ? '' : expiryDay(expiry, clock);
  return (
    <View style={{ gap: 8 }}>
      <FilterPills
        items={items()}
        value={custom ? DATE : chipOf(expiry)}
        onChange={pick}
        role="radiogroup"
        wrap
        accessibilityLabel={F().expiry}
      />
      {custom ? (
        <DatePickerField
          label={F().otherDate}
          day={day}
          range={range}
          note={null}
          onChange={(d) => onChange(dayExpiry(d, clock))}
        />
      ) : null}
      {expiry ? <EndsAt expiry={expiry} /> : null}
      {error ? <ErrorLine message={error} /> : null}
      <Note>{F().purgeNote.replace('{days}', counted(F().days, SHORT_LINK_PURGE_DAYS))}</Note>
    </View>
  );
}
