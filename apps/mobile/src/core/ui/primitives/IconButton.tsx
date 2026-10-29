import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { shape, useTheme } from '@/theme';
import { pressScale } from './Button';

export interface IconButtonProps {
  /** The spoken name: the icon itself is hidden from screen readers. */
  label: string;
  onPress: () => void;
  /** ghost: lapis wash when pressed (a header action). filled: the lapis circle (send). */
  variant?: 'ghost' | 'filled';
  disabled?: boolean;
  /** Narrower (34pt) inside a crowded bar such as the chat pill; hitSlop keeps the 44pt target. */
  compact?: boolean;
  testID?: string;
  children: ReactNode;
}

/** A 44pt square (circle when filled) holding one drawn icon, for rows with no room for a label. */
export function IconButton({ label, onPress, variant = 'ghost', ...p }: IconButtonProps) {
  const { color } = useTheme();
  const off = p.disabled === true;
  const filled = variant === 'filled';
  return (
    <Pressable
      testID={p.testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={onPress}
      hitSlop={p.compact ? { left: 5, right: 5 } : undefined}
      style={({ pressed }) => ({
        width: p.compact ? 34 : shape.control.touch,
        height: shape.control.touch,
        borderRadius: filled ? shape.radius.pill : shape.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: off ? 0.45 : 1,
        backgroundColor: filled
          ? pressed
            ? color.lapisHover
            : color.lapisFill
          : pressed
            ? color.lapisWash
            : 'transparent',
        transform: [{ scale: pressScale(pressed, off) }],
      })}
    >
      {p.children}
    </Pressable>
  );
}
