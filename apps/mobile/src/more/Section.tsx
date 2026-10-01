import type { ReactNode } from 'react';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

/** A titled block inside a screen: 14pt ink-2 heading, then its content. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink2,
        }}
      >
        {title}
      </AppText>
      {children}
    </View>
  );
}
