import type { LineHealthView, NotificationEntryView, NotificationRuleView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { DiscardDialog } from '@/components/settings/dialogs/DiscardDialog';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChannelsPart } from '@/features/messaging/notification-rules/cells/ChannelsPart';
import { NumberPart } from '@/features/messaging/notification-rules/cells/NumberPart';
import { StatePart } from '@/features/messaging/notification-rules/cells/StatePart';
import { editableRule } from '@/features/messaging/notification-rules/table/RuleRow';
import { RuleRowActions } from '@/features/messaging/notification-rules/table/RuleRowActions';
import { useRules } from '@/features/messaging/notification-rules/rules-context';
import { RuleSwitch } from '@/features/messaging/notification-rules/switch/RuleSwitch';
import { TimingPart } from '@/features/messaging/notification-rules/timing/TimingPart';
import { useRuleRow, type RuleRowState } from '@/features/messaging/notification-rules/table/use-rule-row';

const c = t.notificationCatalogue;
const r = t.notificationRules;
const DISCARD_WORDS = {
  title: r.discard.title,
  body: r.discard.body,
  discard: r.discard.yes,
  keep: r.discard.keep,
};

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
  const [asking, setAsking] = useState(false);
  // A dirty row asks to discard first; otherwise the draft is kept.
  const close = () => (row?.dirty ? setAsking(true) : onClose());
  const actions = row ? (
    <>
      <Button variant="ghost" onClick={close}>
        {t.common.cancel}
      </Button>
      <Button disabled={row.saving || !row.result.ok} onClick={() => row.save(onClose)}>
        {row.saving ? r.saving : t.common.save}
      </Button>
    </>
  ) : undefined;
  return (
    <Dialog layout="sheet" title={name} description={c.entries[entry.key].trigger} onClose={close} actions={actions}>
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
      {asking && row && (
        <DiscardDialog
          words={DISCARD_WORDS}
          onKeep={() => setAsking(false)}
          onDiscard={() => {
            row.revert();
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

function EditableSheet({ rule, ...props }: RuleSheetProps & { rule: NotificationRuleView }) {
  const row = useRuleRow(rule);
  return <SheetView {...props} row={row} />;
}

/** Without notifications.manage it opens read-only (docs/26b §3). */
export function RuleSheet(props: RuleSheetProps) {
  const rule = editableRule(props.entry, useRules().canManage);
  return rule ? <EditableSheet {...props} rule={rule} /> : <SheetView {...props} row={null} />;
}
