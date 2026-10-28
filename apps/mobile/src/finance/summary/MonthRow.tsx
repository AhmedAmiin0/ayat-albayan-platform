import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { monthLabel } from '@/teacher/lib/payout-text';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { wholeText } from '../shared/format';
import type { MonthFinance } from './summary-types';

/**
 * One month: the margin on top, then revenue, teacher cost and expenses on their own lines (they wrap, never clip).
 * It sits in «حسب الشهر»'s inset card (owner 2026-10-28: one container rule), which draws the fill and rules.
 */
export function MonthRow({ month: m, currency }: { month: MonthFinance; currency: string }) {
  const { color } = useTheme();
  const line = (label: string, value: number, strong = false) => (
    <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <AppText style={{ flexShrink: 1, fontFamily: type.ui[strong ? 700 : 400], fontSize: type.size.sm, color: strong ? color.ink : color.ink2 }}>{label}</AppText>
      <AppText style={{ fontFamily: type.ui[strong ? 700 : 500], fontSize: type.size.sm, color: strong && value < 0 ? color.bad : color.ink, fontVariant: ['tabular-nums'] }}>
        {wholeText(value, currency)}
      </AppText>
    </View>
  );
  return (
    <View style={{ gap: 4, paddingHorizontal: 16, paddingVertical: 10 }}>
      <AppText accessibilityRole="header" style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
        {monthLabel(m.month)}
      </AppText>
      {line(t.dashboard.grossMargin, m.gross_margin, true)}
      {line(t.dashboard.revenue, m.revenue)}
      {line(t.dashboard.teacherCost, m.teacher_cost)}
      {line(t.dashboard.expenses, m.expenses)}
    </View>
  );
}
