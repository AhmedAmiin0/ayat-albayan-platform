import type { LineHealthView, NotificationEntryView } from '@ab/shared';
import { useId } from 'react';
import { Select, t } from '@ab/web-kit';
import { NumberParts } from '@/features/messaging/notification-catalogue/NumberParts';
import { approvalWord, fillText } from '@/features/messaging/notification-rules/rule-text';
import { numberName, useRules } from '@/features/messaging/notification-rules/rules-context';
import type { RuleRowState } from '@/features/messaging/notification-rules/table/use-rule-row';

const r = t.notificationRules;

function Approval({ entry }: { entry: NotificationEntryView }) {
  const { word, partly } = approvalWord(entry);
  return (
    <span className="grid gap-0.5 text-2xs text-ink-3">
      <span className={partly ? 'font-semibold text-act' : undefined}>{word}</span>
      {partly && <span>{r.approvalSomeHint}</span>}
    </span>
  );
}

export interface NumberPartProps {
  entry: NotificationEntryView;
  row: RuleRowState | null;
  lines: readonly LineHealthView[];
}

/** Null number means the template's own number; partly approved when only some variants are. */
export function NumberPart({ entry, row, lines }: NumberPartProps) {
  const api = useRules();
  const id = useId();
  const channels = row?.draft.channels ?? entry.rule?.channels ?? entry.channels;
  if (!entry.channels.includes('whatsapp') && !channels.includes('whatsapp')) return <span className="text-xs text-ink-3">{r.noNumber}</span>;
  const name = t.notificationCatalogue.entries[entry.key].name;
  const chosen = row ? row.draft.number_id : (entry.rule?.number_id ?? null);
  return (
    <span className="grid gap-1">
      {row ? (
        <>
          <label htmlFor={id} className="sr-only">
            {fillText(r.numberLabel, { name })}
          </label>
          <Select id={id} value={chosen ?? ''} disabled={row.saving} onChange={(e) => row.set({ number_id: e.target.value === '' ? null : e.target.value })} className="w-auto max-w-48">
            <option value="">{r.templateNumber}</option>
            {api.numbers.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </Select>
        </>
      ) : (
        chosen !== null && <span className="text-xs text-ink-2">{numberName(api.numbers, chosen)}</span>
      )}
      {chosen === null && (
        <span className="text-xs text-ink-2">
          <NumberParts entry={entry} lines={lines} />
        </span>
      )}
      <Approval entry={entry} />
    </span>
  );
}
