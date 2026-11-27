import type { ReactNode } from 'react';
import type { ChildSummaryRead } from '@/features/children/use-child-summary';

export type Shown = 'loading' | 'failed' | 'ready';

export interface ReadStateProps {
  read: ChildSummaryRead;
  children: ReactNode;
}
