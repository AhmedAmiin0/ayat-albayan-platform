import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { FormLabel } from './FormLabel';
import { paidDayLabel } from './paid-day';

export interface PaidDayPickerProps {
  /** Days back on the Riyadh calendar; 0 = today. */
  daysAgo: number;
  onChange: (daysAgo: number) => void;
  now: Date;
}

/**
 * «تاريخ الدفع» without typing (rule 6, no date-picker dependency): the day, then «يوم قبله» /
 * «يوم بعده». It starts at today and never goes past it (paid_at_future).
 */
export function PaidDayPicker({ daysAgo, onChange, now }: PaidDayPickerProps) {
  const { color } = useTheme();
  const m = t.payments.mobile;
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{t.payments.paidAt}</FormLabel>
      <AppText
        accessibilityLiveRegion="polite"
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.base,
          lineHeight: type.lineHeight(type.size.base),
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {paidDayLabel(now, daysAgo)}
      </AppText>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" label={m.dayBefore} onPress={() => onChange(daysAgo + 1)} />
        </View>
        <View style={{ flex: 1 }}>
          {daysAgo > 0 ? (
            <Button variant="secondary" label={m.dayAfter} onPress={() => onChange(daysAgo - 1)} />
          ) : null}
        </View>
      </View>
    </View>
  );
}
