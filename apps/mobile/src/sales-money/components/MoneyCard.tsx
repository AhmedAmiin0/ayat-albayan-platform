import type { ReactNode } from 'react';
import { View } from 'react-native';
import { shape, useTheme } from '@/theme';

/** The raised card the money screens use (finance PayoutFacts): one block of facts or one statement. */
export function MoneyCard({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 8, padding: 12, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised }}>
      {children}
    </View>
  );
}
