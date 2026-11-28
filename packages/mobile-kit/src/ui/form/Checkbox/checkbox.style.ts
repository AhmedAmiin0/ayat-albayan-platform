import type { ViewStyle } from 'react-native';
import { shape, space } from '../../../theme';
import type { CheckboxRowLook } from './Checkbox.types';

/** Read as unavailable but still legible (WCAG 1.4.3 exempts disabled controls). */
const DIMMED = 0.45;
const BOX = space[5];

/** The 44 pt row; 'row' and 'row-reverse' mirror under RTL by themselves. */
export function rowStyle(look: CheckboxRowLook): ViewStyle {
  const { pressed, disabled, inset, wash } = look;
  return {
    minHeight: shape.control.touch,
    paddingHorizontal: inset ? space[4] : 0,
    flexDirection: look.side === 'end' ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: space[3],
    opacity: disabled ? DIMMED : 1,
    backgroundColor: pressed ? wash : 'transparent',
  };
}

/** The box's frame; expo-checkbox draws the fill and edge from its `color`. */
export const boxStyle: ViewStyle = { width: BOX, height: BOX, borderRadius: shape.radius.sm };
