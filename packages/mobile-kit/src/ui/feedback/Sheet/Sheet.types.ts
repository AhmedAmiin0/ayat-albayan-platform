import type { ReactNode, RefObject } from 'react';
import type { Text, View } from 'react-native';

/** Content-fit sizes the sheet to its rows; large drags between half and full height. */
export type SheetSize = 'fit' | 'large';

/** Raised over the app's screens; page over the dark lesson room. */
export type SheetSurface = 'raised' | 'page';

export type SheetFocusNode = Text | View;

export interface SheetProps {
  open: boolean;
  /** A drag down, the scrim or Android's back: the owner sets `open` to false. */
  onClose: () => void;
  testID: string;
  /** The sheet's name for screen readers. */
  label: string;
  /** Drawn as the heading; the reader lands on it when the sheet opens. */
  title?: string;
  size?: SheetSize;
  /** The body scrolls once it is taller than the sheet. */
  scroll?: boolean;
  surface?: SheetSurface;
  /** The control that opened the sheet: the reader goes back to it on close. */
  returnFocus?: RefObject<SheetFocusNode | null>;
  children: ReactNode;
}
