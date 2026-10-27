import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { shape, type, useTheme } from '@/theme';

/** One round 56pt tile of the attach sheet with its label under it (WhatsApp's attach grid). */
export function AttachTile({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ width: 80, alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: shape.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color.lapisWash,
        }}
      >
        {children}
      </View>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink, textAlign: 'center' }}>{label}</AppText>
    </Pressable>
  );
}
