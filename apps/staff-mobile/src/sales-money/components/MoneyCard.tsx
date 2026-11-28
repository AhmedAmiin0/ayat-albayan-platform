import type { ReactNode } from 'react';
import { View } from 'react-native';
import { shape, useTheme } from '@ab/mobile-kit';

/** The money screens' raised card (finance PayoutFacts): one block of facts or a statement. */
export function MoneyCard({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      {children}
    </View>
  );
}
