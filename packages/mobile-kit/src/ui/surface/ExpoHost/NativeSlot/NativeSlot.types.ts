import type { ReactElement } from 'react';

export interface NativeSlotProps {
  /** One React Native element, laid out by React Native inside the native tree. */
  children: ReactElement;
}
