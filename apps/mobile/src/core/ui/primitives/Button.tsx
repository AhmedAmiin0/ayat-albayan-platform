import type { ReactNode, Ref } from 'react';
import { Pressable, View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /**
   * docs/07 §6 «الأزرار». primary: the ONE filled green button of a sheet or section. secondary:
   * outlined with the 3:1 input edge (a peer action). danger: outlined in the bad tone («إلغاء الحلقة»).
   * ghost: green text, only for a tertiary header action («إغلاق», «تسجيل الخروج»).
   */
  variant?: ButtonVariant;
  /** Work in flight: disabled and announced busy; pass the label that says so («جاري الحفظ…»). */
  busy?: boolean;
  /** Not usable yet (nothing picked): disabled, not announced busy; a hint nearby says why. */
  disabled?: boolean;
  /** The spoken name when the label repeats down a list («غيّر الميعاد — يوسف»). */
  accessibilityLabel?: string;
  /** A leading icon in the label's colour (decorative: hidden from screen readers by the icon set). */
  icon?: (color: string) => ReactNode;
  /** The pressable, e.g. to move screen-reader focus to it (focusNode). */
  ref?: Ref<View>;
}

type Palette = ReturnType<typeof useTheme>['color'];

interface Look {
  bg: string;
  ink: string;
  edge: number;
  edgeColor: string;
}

export function buttonLook(variant: ButtonVariant, color: Palette, pressed: boolean): Look {
  if (variant === 'primary') {
    return { bg: pressed ? color.lapisHover : color.lapisFill, ink: color.onLapis, edge: 1, edgeColor: 'transparent' };
  }
  if (variant === 'secondary') return { bg: pressed ? color.sunk : color.raised, ink: color.ink, edge: 1, edgeColor: color.ruleInput };
  if (variant === 'danger') return { bg: pressed ? color.badSoft : color.raised, ink: color.bad, edge: 1, edgeColor: color.bad };
  return { bg: pressed ? color.lapisWash : 'transparent', ink: color.lapis, edge: 0, edgeColor: color.ruleInput };
}

/** Press feedback: a 2% shrink while held (a state, not an animation), never when off. */
export const pressScale = (pressed: boolean, off: boolean) => (pressed && !off ? 0.98 : 1);

/**
 * docs/07 §6 «الأزرار» at 48pt: one radius, ui 600 at body size on ONE line. The label's box spans
 * the button (flexGrow) and centres its text: shrink-wrapped in the centred row, Android measured
 * «Join the lesson» narrower than it drew it, wrapped it and showed only «Join the» (owner 2026-10-28,
 * and again 10-29 with the «simple» break strategy). No adjustsFontSizeToFit: on Android it turns the
 * ellipsis off, so a label too long would be cut silently; now it ends in «…». With an icon the box
 * keeps its own width, so the icon and the label stay centred together.
 */
export function Button({ label, onPress, variant = 'primary', busy = false, ref, ...p }: ButtonProps) {
  const { color } = useTheme();
  const off = busy || p.disabled === true;
  const ink = buttonLook(variant, color, false).ink;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={p.accessibilityLabel}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: shape.control.comfort,
        paddingHorizontal: 12,
        borderRadius: shape.radius.md,
        borderWidth: buttonLook(variant, color, pressed).edge,
        borderColor: buttonLook(variant, color, pressed).edgeColor,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: off ? 0.45 : 1,
        backgroundColor: buttonLook(variant, color, pressed).bg,
        transform: [{ scale: pressScale(pressed, off) }],
      })}
    >
      {p.icon ? <View testID="button-icon">{p.icon(ink)}</View> : null}
      <AppText
        numberOfLines={1}
        style={{
          flexGrow: p.icon ? 0 : 1,
          flexShrink: 1,
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: ink,
          textAlign: 'center',
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
