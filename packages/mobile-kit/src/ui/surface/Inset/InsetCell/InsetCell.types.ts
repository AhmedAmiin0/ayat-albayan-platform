import type { ReactNode } from 'react';
import type { CellPlace } from '../inset.types';

export interface InsetCellProps {
  place: CellPlace;
  children: ReactNode;
}
