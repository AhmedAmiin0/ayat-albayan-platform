import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { shape, useTheme } from '../../../../theme';

interface SquareButtonProps {
  /** The spoken name. */
  label: string;
  /** What it does, for a screen reader (a stepper's field name). */
  hint?: string;
  disabled?: boolean;
  /** Pressed fill: the sunk grey (default) or the lapis wash. */
  pressed?: 'sunk' | 'wash';
  onPress: () => void;
  children: ReactNode;
}

/**
 * A 44pt outlined square on the raised fill (docs/07 §4): the week arrows of a slot picker or a
 * calendar, a stepper's − and +. Disabled reads faded.
 */
export function SquareButton(props: SquareButtonProps) {
  const { label, hint, disabled = false, onPress, children } = props;
  const { color } = useTheme();
  const down = props.pressed === 'wash' ? color.lapisWash : color.sunk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled ? 0.45 : 1,
        width: shape.control.touch,
        height: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.ruleInput,
        backgroundColor: pressed ? down : color.raised,
      })}
    >
      {children}
    </Pressable>
  );
}
