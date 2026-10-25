import type { TeacherEarningsBalanceView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { EarningsSummary } from './EarningsSummary';
import type { SessionFilter } from '../hooks/queries';

export type Tab = 'sessions' | 'payments';

const tabs = (): FilterPill<Tab>[] => [
  { value: 'sessions', label: t.earnings.mobile.sessions },
  { value: 'payments', label: t.earnings.mobile.payments },
];
const filters = (): FilterPill<SessionFilter>[] =>
  (['all', 'unpaid', 'paid'] as const).map((value) => ({ value, label: t.earnings.filter[value] }));

export interface EarningsHeaderProps {
  balance: TeacherEarningsBalanceView | undefined;
  tab: Tab;
  onTab: (tab: Tab) => void;
  filter: SessionFilter;
  onFilter: (filter: SessionFilter) => void;
}

/** The list header: the three cards, «الحلقات | الدفعات», and (on sessions) the status filter. */
export function EarningsHeader({ balance, tab, onTab, filter, onFilter }: EarningsHeaderProps) {
  return (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      {balance ? <EarningsSummary balance={balance} /> : null}
      <FilterPills items={tabs()} value={tab} onChange={onTab} accessibilityLabel={t.earnings.title} />
      {tab === 'sessions' ? (
        <FilterPills items={filters()} value={filter} onChange={onFilter} accessibilityLabel={t.earnings.status} />
      ) : null}
    </View>
  );
}
