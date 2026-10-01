import { Pressable } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from './AppText';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /** primary: the one filled lapis button per screen. ghost: lapis text (إلغاء, تسجيل الخروج). */
  variant?: 'primary' | 'ghost';
  /** Disables the button; pass the label that says why («جاري الدخول…»). */
  busy?: boolean;
}

/** docs/07 §6 Button, at the 44pt mobile touch size. Lapis only: never gold, never saffron. */
export function Button({ label, onPress, variant = 'primary', busy = false }: ButtonProps) {
  const { color } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: shape.control.touch,
        paddingHorizontal: 20,
        borderRadius: shape.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: busy ? 0.45 : 1,
        backgroundColor: primary
          ? pressed ? color.lapisHover : color.lapis
          : pressed ? color.lapisWash : 'transparent',
      })}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: primary ? color.onLapis : color.lapis,
          textAlign: 'center',
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
