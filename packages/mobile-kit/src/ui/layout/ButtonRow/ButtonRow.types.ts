import type { ReactNode } from 'react';

export interface ButtonRowProps {
  /** 2–3 Buttons (null children are dropped); a lone one fills the row. */
  children: ReactNode;
  testID?: string;
}
