import type { ActivityView } from '@ab/shared';
import { ListRow } from '@/ui/ListRow';
import { StatusChip } from '@/ui/StatusChip';
import { actionLabel, actorLine, metaLine, resultLabel, resultStyle } from './activity-format';

/** One logged action: what, by whom, on which item, when, and whether it worked. */
export function ActivityRow({ row }: { row: ActivityView }) {
  return (
    <ListRow
      title={actionLabel(row.action, row.entity)}
      subtitle={`${actorLine(row)} · ${metaLine(row)}`}
      trailing={
        <StatusChip {...resultStyle(row.status)} label={resultLabel(row.status)} size="sm" />
      }
    />
  );
}
