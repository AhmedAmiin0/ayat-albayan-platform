import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { monthLabel } from '@/teacher/payout-text';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Chevron } from '@/ui/Chevron';
import { canGoNext, shiftMonth } from './month';

export interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
}

/** «سبتمبر 2026» between two 44pt arrows (no date-picker dependency); it stops at this month. */
export function MonthPicker({ month, onChange }: MonthPickerProps) {
  const { color } = useTheme();
  const next = canGoNext(month);
  const arrow = (dir: 'prev' | 'next', enabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.mobileFinance.month[dir]}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => onChange(shiftMonth(month, dir === 'next' ? 1 : -1))}
      style={{ width: shape.control.touch, height: shape.control.touch, alignItems: 'center', justifyContent: 'center', opacity: enabled ? 1 : 0.3 }}
    >
      <Chevron to={dir} color={color.ink} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {arrow('prev', true)}
      <AppText
        accessibilityLiveRegion="polite"
        style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}
      >
        {monthLabel(month)}
      </AppText>
      {arrow('next', next)}
    </View>
  );
}
