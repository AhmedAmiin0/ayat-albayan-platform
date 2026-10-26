import { isIntegrationPlainKey, type IntegrationConfigItem, type IntegrationGroup as Group } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import type { IntegrationDraft } from '../integrations-form';
import { PlainIntegrationRow } from './PlainIntegrationRow';
import { SecretIntegrationRow } from './SecretIntegrationRow';

interface Props {
  group: Group;
  items: readonly IntegrationConfigItem[];
  draft: IntegrationDraft;
  invalid: ReadonlySet<string>;
  onDraft: (next: IntegrationDraft) => void;
  onNote: (message: string) => void;
}

/** One group of «التكاملات» (a WhatsApp line, LiveKit, …): its heading, then its rows in registry order. */
export function IntegrationGroup({ group, items, draft, invalid, onDraft, onNote }: Props) {
  const id = `integrations-${group}`;
  return (
    <div role="group" aria-labelledby={id} className="grid">
      <h3 id={id} className="border-b border-rule pb-1 pt-2 text-sm font-bold text-ink-2">
        {t.integrations.groups[group]}
      </h3>
      {items.map((item) =>
        isIntegrationPlainKey(item.key) ? (
          <PlainIntegrationRow
            key={item.key}
            item={item}
            value={draft[item.key] ?? ''}
            invalid={invalid.has(item.key)}
            onChange={(v) => onDraft({ ...draft, [item.key]: v })}
          />
        ) : (
          <SecretIntegrationRow key={item.key} item={item} onNote={onNote} />
        ),
      )}
    </div>
  );
}
