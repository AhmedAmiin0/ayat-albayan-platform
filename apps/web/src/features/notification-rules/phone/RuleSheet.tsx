import type { LineHealthView, NotificationEntryView, NotificationRuleView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { DiscardDialog } from '@/components/settings/DiscardDialog';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
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
const DISCARD_WORDS = { title: r.discard.title, body: r.discard.body, discard: r.discard.yes, keep: r.discard.keep };

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
  // «إلغاء», Esc and the backdrop: a dirty row asks «تجاهل التغييرات؟» first (the draft is kept otherwise).
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

/**
 * The phone editor of one row (docs/26b §3 «Phone»): a bottom sheet titled by the name, with the
 * state and its reason, the switch, the timing, the channels and the number; «إلغاء» then «احفظ».
 * Closing it with an unsaved change asks «تجاهل التغييرات؟» (the same dialog as «القيم»).
 * Without notifications.manage it opens read-only (no inputs, no actions).
 */
export function RuleSheet(props: RuleSheetProps) {
  const rule = editableRule(props.entry, useRules().canManage);
  return rule ? <EditableSheet {...props} rule={rule} /> : <SheetView {...props} row={null} />;
}
