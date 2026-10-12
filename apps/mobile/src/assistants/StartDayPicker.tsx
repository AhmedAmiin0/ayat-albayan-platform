import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { localDay } from '@/payments/format';
import { FormLabel } from '@/payments/FormLabel';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { shiftDay } from './terms-form';

export interface StartDayPickerProps {
  label: string;
  /** YYYY-MM-DD. */
  day: string;
  /** The earliest day allowed now (startMins): never before it, nothing is retroactive. */
  min: string;
  onChange: (day: string) => void;
  error?: string | undefined;
}

/** A start day without typing (rule 6, no date-picker dependency): the day, then a day or a month back and forward. */
export function StartDayPicker({ label, day, min, onChange, error }: StartDayPickerProps) {
  const { color } = useTheme();
  const m = t.mobileSalesMoney;
  const step = (s: { days?: number; months?: number }) => {
    const next = shiftDay(day, s);
    onChange(next < min ? min : next);
  };
  const btn = (text: string, s: { days?: number; months?: number }, off = false) => (
    <View style={{ flex: 1 }}>
      <Button variant="secondary" label={text} disabled={off} onPress={() => step(s)} />
    </View>
  );
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      <AppText accessibilityLiveRegion="polite" style={{ fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {localDay(day)}
      </AppText>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {btn(t.payments.mobile.dayBefore, { days: -1 }, day <= min)}
        {btn(t.payments.mobile.dayAfter, { days: 1 })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {btn(m.monthBefore, { months: -1 }, day <= min)}
        {btn(m.monthAfter, { months: 1 })}
      </View>
      <Note>{m.earliest.replace('{date}', localDay(min))}</Note>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
