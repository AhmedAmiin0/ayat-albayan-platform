import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { localDay } from '@/payments/format';
import { FormLabel } from '@/payments/FormLabel';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { shiftDay } from './terms-form';

interface StartDayPickerProps {
  label: string;
  /** YYYY-MM-DD. */
  day: string;
  /** The earliest day allowed now (startMins): never before it, nothing is retroactive. */
  min: string;
  /** The latest day allowed (YYYY-MM-DD); none = open-ended. */
  max?: string | undefined;
  onChange: (day: string) => void;
  error?: string | undefined;
}

/** A start day without typing (rule 6, no date-picker dependency): the day, then a day or a month back and forward. */
export function StartDayPicker({ label, day, min, max, onChange, error }: StartDayPickerProps) {
  const { color } = useTheme();
  const m = t.mobileSalesMoney;
  const step = (s: { days?: number; months?: number }) => {
    const next = shiftDay(day, s);
    const capped = max !== undefined && next > max ? max : next;
    onChange(capped < min ? min : capped);
  };
  const atMax = max !== undefined && day >= max;
  const btn = (text: string, s: { days?: number; months?: number }, off = false) => (
    <Button variant="secondary" label={text} disabled={off} onPress={() => step(s)} />
  );
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      <AppText accessibilityLiveRegion="polite" style={{ fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {localDay(day)}
      </AppText>
      <ButtonRow>
        {btn(t.payments.mobile.dayBefore, { days: -1 }, day <= min)}
        {btn(t.payments.mobile.dayAfter, { days: 1 }, atMax)}
      </ButtonRow>
      <ButtonRow>
        {btn(m.monthBefore, { months: -1 }, day <= min)}
        {btn(m.monthAfter, { months: 1 }, atMax)}
      </ButtonRow>
      <Note>{m.earliest.replace('{date}', localDay(min))}</Note>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
