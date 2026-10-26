import type { NotificationEntryView, NotificationsOverview } from '@ab/shared';
import { View } from 'react-native';
import { Note } from '@/more/Note';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { chipOf, factsOf, whenOf } from '../../settings/catalogue-words';
import { controlOf, heldLine, nameOf, partialLine, ruleOf } from '../lib/rule-words';
import { RowAsk } from './RowAsk';
import { RuleControl } from './RuleControl';
import type { CatalogueToggles } from '../hooks/use-catalogue-toggles';

interface CatalogueRowProps {
  entry: NotificationEntryView;
  /** notifications.manage held: editable rows get a switch. */
  canManage: boolean;
  /** GET /admin/notifications `reach` (v2); undefined on an older API. */
  reach: NotificationsOverview['reach'];
  toggles: CatalogueToggles;
}

/** The lines under the name: when, facts, and on a v2 answer the blocker and «معتمد جزئيًا» on their own. */
function linesOf(entry: NotificationEntryView): string[] {
  if (ruleOf(entry) === null) return [whenOf(entry), factsOf(entry)];
  const extra = [heldLine(entry), partialLine(entry)].filter((l): l is string => l !== null);
  return [whenOf(entry), factsOf({ ...entry, blocker: null }), ...extra];
}

/**
 * One notification (states.html#mobile): name, its lines, the state chip and the switch at the end;
 * family ON asks under the row and a failed save says why there. Timing stays text.
 */
export function CatalogueRow({ entry, canManage, reach, toggles }: CatalogueRowProps) {
  const name = nameOf(entry.key);
  if (name === null) return null;
  return (
    <View>
      <ListRow
        title={name}
        tags={linesOf(entry).map((line) => (
          <Note key={line}>{line}</Note>
        ))}
        trailing={
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <StatusChip {...chipOf(entry)} size="sm" />
            <RuleControl
              control={controlOf(entry, canManage)}
              name={name}
              busy={toggles.pendingKey === entry.key}
              onChange={(next) => toggles.request(entry, next)}
            />
          </View>
        }
      />
      <RowAsk entry={entry} name={name} reach={reach} toggles={toggles} />
    </View>
  );
}
