import type { ReactNode } from 'react';

export interface ScreenShape {
  /** A chat: 8pt top and between blocks, and the bottom safe area too (a full screen). */
  chat?: boolean;
  /**
   * The last child is a vertical list that runs under the floating tab bar and adds
   * useTabBarInset() to its contentContainerStyle; the header blocks above it stack 8pt apart, so
   * the first row shows early.
   */
  list?: boolean;
  /** Inside a <Modal> sheet: no bar is drawn there, but context crosses the Modal: no inset. */
  sheet?: boolean;
}

export interface ScreenProps extends ScreenShape {
  children: ReactNode;
  scroll?: boolean;
}
