import type { ReactNode } from 'react';
import { View } from 'react-native';
import { monthText } from '@ab/time';
import { AppText, locale, type, useTheme } from '@ab/mobile-kit';

export function MonthSection({ month, children }: { month: string; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}
      >
        {monthText(month, locale)}
      </AppText>
      {children}
    </View>
  );
}
