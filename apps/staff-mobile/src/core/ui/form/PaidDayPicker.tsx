import { View } from 'react-native';
import { t, type, useTheme, AppText, Button, FormLabel } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import { paidDayLabel } from '@/core/lib/money/paid-day';

interface PaidDayPickerProps {
  /** Days back on the Riyadh calendar; 0 = today. */
  daysAgo: number;
  onChange: (daysAgo: number) => void;
  now: Date;
}

/** Rule 6, never typed; starts at today and never goes past it (paid_at_future). */
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
      <ButtonRow>
        <Button variant="secondary" label={m.dayBefore} onPress={() => onChange(daysAgo + 1)} />
        {daysAgo > 0 ? <Button variant="secondary" label={m.dayAfter} onPress={() => onChange(daysAgo - 1)} /> : null}
      </ButtonRow>
    </View>
  );
}
