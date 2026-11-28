import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import type { CheckboxProps, CheckboxSide } from '../Checkbox.types';

export interface CheckboxRowProps extends CheckboxProps {
  /** The platform's box: drawn only, hidden from touch and the screen reader. */
  box: ReactNode;
}

export interface CheckboxRowLook {
  pressed: boolean;
  disabled: boolean;
  inset: boolean;
  side: CheckboxSide;
  wash: string;
}

export interface CheckboxRowLogic {
  onPress: () => void;
  style: (state: { pressed: boolean }) => ViewStyle;
}
