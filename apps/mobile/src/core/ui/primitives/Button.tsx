import type { Ref } from 'react';
import { Pressable, type View } from 'react-native';
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
  /** Work in flight: disabled and announced busy; pass the label that says so («جاري الحفظ…»). */
  busy?: boolean;
  /** Not usable yet (nothing picked): disabled, not announced busy; a hint nearby says why. */
  disabled?: boolean;
  /** The spoken name when the label repeats down a list («غيّر الميعاد — يوسف»). */
  accessibilityLabel?: string;
  /** The pressable, e.g. to move screen-reader focus to it (focusNode). */
  ref?: Ref<View>;
}

type Palette = ReturnType<typeof useTheme>['color'];

function look(variant: ButtonVariant, color: Palette, pressed: boolean) {
  if (variant === 'primary') {
    return { bg: pressed ? color.lapisHover : color.lapisFill, ink: color.onLapis, edge: 1, edgeColor: 'transparent' };
  }
  if (variant === 'secondary') return { bg: pressed ? color.sunk : color.raised, ink: color.ink, edge: 1, edgeColor: color.ruleInput };
  return { bg: pressed ? color.lapisWash : 'transparent', ink: color.lapis, edge: 0, edgeColor: color.ruleInput };
}

/** Press feedback: a 2% shrink while held (a state, not an animation), never when off. */
export const pressScale = (pressed: boolean, off: boolean) => (pressed && !off ? 0.98 : 1);

/** docs/07 §6 Button, at the 44pt mobile touch size. White text on the green fill; never saffron. */
export function Button({ label, onPress, variant = 'primary', busy = false, ref, ...p }: ButtonProps) {
  const { color } = useTheme();
  const off = busy || p.disabled === true;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={p.accessibilityLabel}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: shape.control.touch,
        paddingHorizontal: 20,
        borderRadius: shape.radius.md,
        borderWidth: look(variant, color, pressed).edge,
        borderColor: look(variant, color, pressed).edgeColor,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: off ? 0.45 : 1,
        backgroundColor: look(variant, color, pressed).bg,
        transform: [{ scale: pressScale(pressed, off) }],
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
