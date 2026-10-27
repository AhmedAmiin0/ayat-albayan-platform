import { memo } from 'react';
import type { ActivityView } from '@ab/shared';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { actionLabel, actorLine, metaLine, resultLabel, resultStyle } from './activity-format';
import { useClockCycle } from '@/core/lib/clock';

/** One logged action: what, by whom, on which item, when, and whether it worked. */
export const ActivityRow = memo(function ActivityRow({ row }: { row: ActivityView }) {
  const cycle = useClockCycle();
  return (
    <ListRow
      title={actionLabel(row.action, row.entity)}
      subtitle={`${actorLine(row)} · ${metaLine(row, cycle)}`}
      trailing={
        <StatusChip {...resultStyle(row.status)} label={resultLabel(row.status)} size="sm" />
      }
    />
  );
});
