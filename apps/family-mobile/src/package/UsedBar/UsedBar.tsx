import { View } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';
import { usedText } from '@/package/package-text';
import type { UsedBarProps } from './UsedBar.types';

export function UsedBar({ summary }: UsedBarProps) {
  const { color } = useTheme();
  const ratio = summary.total > 0 ? Math.min(1, summary.used / summary.total) : 0;
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>{usedText(summary)}</AppText>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: color.sunk, overflow: 'hidden' }}>
        <View
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: 8,
            backgroundColor: color.lapisFill,
          }}
        />
      </View>
    </View>
  );
}
