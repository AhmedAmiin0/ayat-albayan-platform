import type { NotificationEntryView } from '@ab/shared';
import { EssentialOffSheet } from './EssentialOffSheet';
import { nameOf } from '@/ops/notif-rules/lib/rule-words';
import type { CatalogueToggles } from '@/ops/notif-rules/hooks/use-catalogue-toggles';

/** Opens for an essential OFF or a 428 answer. */
export function TypedOffSheet({ entries, toggles }: { entries: readonly NotificationEntryView[]; toggles: CatalogueToggles }) {
  const ask = toggles.ask;
  if (ask?.kind !== 'typed') return null;
  const entry = entries.find((e) => e.key === ask.key);
  const name = nameOf(ask.key);
  if (!entry || name === null) return null;
  return (
    <EssentialOffSheet
      name={name}
      busy={toggles.pendingKey === ask.key}
      error={toggles.errors[ask.key]}
      onConfirm={(text) => toggles.send(entry, false, text)}
      onClose={toggles.cancel}
    />
  );
}
