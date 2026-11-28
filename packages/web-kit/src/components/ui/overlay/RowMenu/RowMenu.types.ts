import type { ReactNode } from 'react';

export interface RowMenuItem {
  id: string;
  label: string;
  /** A second line under the label, e.g. a key shown LTR. */
  detail?: ReactNode;
  onSelect: () => void;
  /** Destructive: drawn in the danger colour and always placed last. */
  danger?: boolean;
}

export interface RowMenuProps {
  /** Names the row it acts on, e.g. «Actions for <name>»: one button per row, each told apart. */
  label: string;
  items: readonly RowMenuItem[];
}
