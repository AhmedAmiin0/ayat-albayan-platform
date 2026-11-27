import type { PortalHistoryRow } from '@ab/shared';
import type { ClockOptions } from '@ab/time';
import type { RowNote } from '@/ui';

export interface RowBodyProps {
  row: PortalHistoryRow;
  clock: ClockOptions;
  title: string;
  notes: RowNote[];
  fresh: boolean;
}
