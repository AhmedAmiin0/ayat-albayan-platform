import { router } from 'expo-router';
import { t, ListRow } from '@ab/mobile-kit';
import { commissionText, salaryText } from '@/sales-money/lib/money-text';
import type { AssistantRow } from '@/assistants/api/api';

/** One salesperson (web assistant-columns): name, salary and commission; taps open their page. */
export function AssistantItem({ assistant: a }: { assistant: AssistantRow }) {
  return (
    <ListRow
      title={a.name}
      subtitle={t.mobileSalesMoney.termsSummary
        .replace('{salary}', salaryText(a.terms.salary))
        .replace('{commission}', commissionText(a.terms.commission))}
      onPress={() => router.push(`/more/finance/assistants/${a.id}`)}
    />
  );
}
