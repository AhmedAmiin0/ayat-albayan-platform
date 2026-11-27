import type { ReactNode } from 'react';

export interface MenuSheetProps {
  open: boolean;
  label: string;
  testID: string;
  onClose: () => void;
  children: ReactNode;
}
