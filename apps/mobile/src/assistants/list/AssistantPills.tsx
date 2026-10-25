import { t } from '@/core/lib/i18n/i18n';
import { FilterPills } from '@/core/ui/form/FilterPills';
import type { AssistantRow } from '../api/api';

/** «كل مسؤولي المبيعات» or one of them (web FilterBar's assistant select); '' is all. */
export function AssistantPills({ assistants, value, onChange }: { assistants: readonly AssistantRow[]; value: string; onChange: (id: string) => void }) {
  const items = [{ value: '', label: t.assistants.ledger.allAssistants }, ...assistants.map((a) => ({ value: a.id, label: a.name }))];
  return <FilterPills items={items} value={value} onChange={onChange} accessibilityLabel={t.assistants.ledger.assistant} />;
}
