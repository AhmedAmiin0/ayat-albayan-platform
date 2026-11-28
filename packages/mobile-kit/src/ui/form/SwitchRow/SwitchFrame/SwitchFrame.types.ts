import type { ReactNode } from 'react';

export interface SwitchFrameProps {
  label: string;
  /** The platform's switch, at the row's end edge. */
  control: ReactNode;
  note?: ReactNode;
  testID?: string | undefined;
}
