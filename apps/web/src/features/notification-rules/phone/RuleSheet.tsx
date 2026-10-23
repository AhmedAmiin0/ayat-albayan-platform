import type { LineHealthView, NotificationEntryView, NotificationRuleView } from '@ab/shared';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { ChannelsPart } from '../cells/ChannelsPart';
import { NumberPart } from '../cells/NumberPart';
import { StatePart } from '../cells/StatePart';
import { editableRule } from '../RuleRow';
import { RuleRowActions } from '../RuleRowActions';
import { useRules } from '../rules-context';
import { RuleSwitch } from '../switch/RuleSwitch';
import { TimingPart } from '../timing/TimingPart';
import { useRuleRow, type RuleRowState } from '../use-rule-row';

const c = t.notificationCatalogue;
const r = t.notificationRules;

export interface RuleSheetProps {
  entry: NotificationEntryView;
  lines: readonly LineHealthView[];
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1">
      <h3 className="text-xs font-semibold text-ink-3">{title}</h3>
      {children}
    </section>
  );
}

function SheetView({ entry, lines, onClose, row }: RuleSheetProps & { row: RuleRowState | null }) {
  const name = c.entries[entry.key].name;
  const actions = row ? (
    <>
      <Button variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button disabled={row.saving || !row.result.ok} onClick={() => row.save(onClose)}>
        {row.saving ? r.saving : t.common.save}
      </Button>
    </>
  ) : undefined;
  return (
    <Dialog layout="sheet" title={name} description={c.entries[entry.key].trigger} onClose={onClose} actions={actions}>
      <div className="grid gap-4">
        <Section title={r.columns.state}>
          <StatePart entry={entry} />
        </Section>
        <Section title={r.columns.switch}>
          <RuleSwitch entry={entry} row={row} />
        </Section>
        <TimingPart entry={entry} row={row} />
        <Section title={r.columns.channels}>
          <ChannelsPart entry={entry} row={row} />
        </Section>
        <Section title={r.columns.number}>
          <NumberPart entry={entry} row={row} lines={lines} />
        </Section>
        {row && <RuleRowActions row={{ ...row, dirty: false }} name={name} />}
      </div>
    </Dialog>
  );
}

function EditableSheet({ rule, ...props }: RuleSheetProps & { rule: NotificationRuleView }) {
  const row = useRuleRow(rule);
  return <SheetView {...props} row={row} />;
}

/**
 * The phone editor of one row (docs/26b §3 «Phone»): a bottom sheet titled by the name, with the
 * state and its reason, the switch, the timing, the channels and the number; «إلغاء» then «احفظ».
 * Without notifications.manage it opens read-only (no inputs, no actions).
 */
export function RuleSheet(props: RuleSheetProps) {
  const rule = editableRule(props.entry, useRules().canManage);
  return rule ? <EditableSheet {...props} rule={rule} /> : <SheetView {...props} row={null} />;
}
