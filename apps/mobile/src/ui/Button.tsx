import { Pressable } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /**
   * primary: the one filled lapis button per screen. secondary: raised with the 3:1 input edge
   * (a peer action, e.g. «إلغاء» on a lesson card, docs/07 §6). ghost: lapis text (تسجيل الخروج).
   */
  variant?: ButtonVariant;
  /** Disables the button; pass the label that says why («جاري الدخول…»). */
  busy?: boolean;
}

type Palette = ReturnType<typeof useTheme>['color'];

function look(variant: ButtonVariant, color: Palette, pressed: boolean) {
  if (variant === 'primary') return { bg: pressed ? color.lapisHover : color.lapis, ink: color.onLapis, edge: 0 };
  if (variant === 'secondary') return { bg: pressed ? color.sunk : color.raised, ink: color.ink, edge: 1 };
  return { bg: pressed ? color.lapisWash : 'transparent', ink: color.lapis, edge: 0 };
}

/** docs/07 §6 Button, at the 44pt mobile touch size. Lapis only: never gold, never saffron. */
export function Button({ label, onPress, variant = 'primary', busy = false }: ButtonProps) {
  const { color } = useTheme();
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
        borderWidth: look(variant, color, pressed).edge,
        borderColor: color.ruleInput,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: busy ? 0.45 : 1,
        backgroundColor: look(variant, color, pressed).bg,
      })}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: look(variant, color, false).ink,
          textAlign: 'center',
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
