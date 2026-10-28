import { Pressable } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { hairline } from '@/core/ui/surface/surface';

interface HeroButtonProps {
  label: string;
  onPress: () => void;
  /** The one filled button of the card; else a raised one. */
  primary?: boolean;
  busy?: boolean;
}

/** A 46pt hero button, radius 14 (docs/29 §3). */
export function HeroButton({ label, onPress, primary = false, busy = false }: HeroButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 46,
        paddingHorizontal: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: busy ? 0.45 : 1,
        backgroundColor: primary ? (pressed ? color.lapisHover : color.lapisFill) : pressed ? color.sunk : color.raised,
        boxShadow: primary ? undefined : hairline(color.rule),
        transform: [{ scale: pressed && !busy ? 0.98 : 1 }],
      })}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: 15, lineHeight: 22, color: primary ? color.onLapis : color.ink }}>
        {label}
      </AppText>
    </Pressable>
  );
}
