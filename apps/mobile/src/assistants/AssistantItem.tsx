import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { commissionText, salaryText } from '@/sales-money/money-text';
import { ListRow } from '@/core/ui/layout/ListRow';
import type { AssistantRow } from './api';

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
