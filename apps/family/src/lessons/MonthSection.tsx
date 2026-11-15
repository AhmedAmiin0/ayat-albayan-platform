import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';
import { monthTitle } from './lesson-text';

/** «نوفمبر 2026» over that month's rows (past lessons, reports). */
export function MonthSection({ month, children }: { month: string; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}
      >
        {monthTitle(month)}
      </AppText>
      {children}
    </View>
  );
}
