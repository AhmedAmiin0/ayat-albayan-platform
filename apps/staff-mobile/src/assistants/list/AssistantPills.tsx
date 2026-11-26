import { t, FilterPills } from '@ab/mobile-kit';
import type { AssistantRow } from '@ab/client-core';

/** Empty string means all. */
export function AssistantPills({
  assistants,
  value,
  onChange,
}: {
  assistants: readonly AssistantRow[];
  value: string;
  onChange: (id: string) => void;
}) {
  const items = [
    { value: '', label: t.assistants.ledger.allAssistants },
    ...assistants.map((a) => ({ value: a.id, label: a.name })),
  ];
  return (
    <FilterPills
      items={items}
      value={value}
      onChange={onChange}
      accessibilityLabel={t.assistants.ledger.assistant}
    />
  );
}
