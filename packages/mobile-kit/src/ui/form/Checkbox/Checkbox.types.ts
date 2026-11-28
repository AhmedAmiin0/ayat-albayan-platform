import type { CheckboxColors } from '@expo/ui/jetpack-compose';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

/** Where the box sits in the row: logical, so «start» is the right edge in Arabic. */
export type CheckboxSide = 'start' | 'end';

export interface CheckboxProps {
  checked: boolean;
  /** The next value: the opposite of `checked`. */
  onChange: (next: boolean) => void;
  /** The spoken name of the whole row. */
  label: string;
  hint?: string | undefined;
  disabled?: boolean | undefined;
  /** @default 'start' */
  side?: CheckboxSide | undefined;
  /** Pad the row's two edges (a full-width list row); off when the parent pads it. */
  inset?: boolean | undefined;
  /** The row beside the box; the whole row is one touch target. */
  children?: ReactNode;
  testID?: string | undefined;
}

export interface CheckboxLook {
  /** The kit's own box: the brand fill when checked, the input rule as its edge when not. */
  box: ViewStyle;
  /** The tick on the fill. */
  tick: string;
  /** The same look for Material's box. */
  colors: CheckboxColors;
}
