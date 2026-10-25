import type { LineHealthView, NotificationEntryView, NotificationRuleView } from '@ab/shared';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n/i18n';
import { ChannelsPart } from './cells/ChannelsPart';
import { NamePart } from './cells/NamePart';
import { NumberPart } from './cells/NumberPart';
import { StatePart } from './cells/StatePart';
import { RuleRowActions } from './RuleRowActions';
import { useRules } from './rules-context';
import { RuleSwitch } from './switch/RuleSwitch';
import { TimingPart } from './timing/TimingPart';
import { useRuleRow, type RuleRowState } from './use-rule-row';

export const RULE_COLUMNS = 5;
const cell = 'border-b border-rule px-2 py-2.5 text-start align-top';

export interface RuleRowProps {
  entry: NotificationEntryView;
  lines: readonly LineHealthView[];
}

interface ViewProps extends RuleRowProps {
  row: RuleRowState | null;
}

/** May this user edit this row here? (notifications.manage, a v2 rule that is editable, not locked). */
export function editableRule(entry: NotificationEntryView, canManage: boolean): NotificationRuleView | null {
  const rule = entry.rule;
  return rule && canManage && rule.editable && !entry.locked ? rule : null;
}

function RowView({ entry, lines, row }: ViewProps) {
  const dirty = row?.dirty === true;
  const name = t.notificationCatalogue.entries[entry.key].name;
  return (
    <>
      <tr data-key={entry.key} aria-busy={row?.saving || undefined} className={cn(dirty && 'bg-lapis-wash')}>
        <th scope="row" abbr={name} className={cn(cell, 'font-normal', dirty && 'border-s-[3px] border-s-lapis')}>
          <span className="grid gap-1.5">
            <NamePart entry={entry} />
            <TimingPart entry={entry} row={row} />
          </span>
        </th>
        <td className={cell}>
          <ChannelsPart entry={entry} row={row} />
        </td>
        <td className={cell}>
          <NumberPart entry={entry} row={row} lines={lines} />
        </td>
        <td className={cell}>
          <StatePart entry={entry} />
        </td>
        <td className={cell}>
          <RuleSwitch entry={entry} row={row} />
        </td>
      </tr>
      {row && (dirty || row.failure) && (
        <tr data-unsaved={entry.key} className="bg-lapis-wash">
          <td colSpan={RULE_COLUMNS} className={cn(cell, 'border-s-[3px] border-s-lapis')}>
            <RuleRowActions row={row} name={name} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditableRow({ rule, ...props }: RuleRowProps & { rule: NotificationRuleView }) {
  const row = useRuleRow(rule);
  return <RowView {...props} row={row} />;
}

/** One desktop row of «الإشعارات» (from 640px): five columns, and the unsaved line under it when dirty. */
export function RuleRow(props: RuleRowProps) {
  const rule = editableRule(props.entry, useRules().canManage);
  return rule ? <EditableRow {...props} rule={rule} /> : <RowView {...props} row={null} />;
}
