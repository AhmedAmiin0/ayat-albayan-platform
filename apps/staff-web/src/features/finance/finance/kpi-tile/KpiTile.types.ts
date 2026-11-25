import type { ReactNode } from 'react';
import type { QueryStateQuery } from '@ab/web-kit';

export interface KpiTileProps<T> {
  label: string;
  to: '/admin/payouts' | '/admin/receivables';
  query: QueryStateQuery<T>;
  children: (data: T) => ReactNode;
}
