import { Pressable } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { pressScale } from '@/core/ui/primitives/Button';
import { shape, type, useTheme } from '@/theme';

export interface RetryButtonProps {
  label: string;
  onPress: () => void;
  /** Before Noto Sans Arabic is registered the system Arabic font (an unknown family is an error on iOS). */
  fontFamily: string | undefined;
}

/** The startup screen's «إعادة المحاولة»: 48 pt high, 28 pt sides, the green fill, 16 pt semibold. */
export function RetryButton({ label, onPress, fontFamily }: RetryButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 48,
        paddingHorizontal: 28,
        borderRadius: shape.radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? color.lapisHover : color.lapisFill,
        transform: [{ scale: pressScale(pressed, false) }],
      })}
    >
      <AppText style={{ color: color.onLapis, fontFamily, fontSize: type.size.base, lineHeight: type.lineHeight(type.size.base) }}>
        {label}
      </AppText>
    </Pressable>
  );
}
