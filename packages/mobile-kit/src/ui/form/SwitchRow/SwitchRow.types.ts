import type { ReactNode } from 'react';

export interface SwitchRowProps {
  /** The row's words, also the switch's spoken name. */
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
  testID?: string;
  /** Under the label and switch: a note or hint. */
  children?: ReactNode;
}
